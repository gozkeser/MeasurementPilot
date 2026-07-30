import os
import json
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Tuple
from backend.models.project import ProjectInfo, LayerInfo
from backend.models.component import PPLComponent
from backend.models.testpoint import TestPoint
from backend.models.ctp import CTP
from backend.models.tcd import TCD
from backend.services.ppl_parser import parse_ppl
from backend.services.tpr_parser import parse_tpr
from backend.services.transform_service import TransformService

class ProjectLoadError(Exception):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.status_code = 400
        self.code = "PROJECT_LOAD_ERROR"

class ProjectState:
    def __init__(self):
        self.zip_path: Optional[str] = None
        self.assembly_no: str = ""
        self.assembly_rev: str = ""
        self.available_layers: Dict[str, LayerInfo] = {}
        self.active_layer: str = "TOP"
        self.components: List[PPLComponent] = []
        self.testpoints: List[TestPoint] = []
        self.ctps: List[CTP] = []
        self.tcd: Optional[TCD] = None
        self.transform_services: Dict[str, TransformService] = {}
        self.images_bytes: Dict[str, bytes] = {}

class ProjectService:
    def __init__(self):
        self._state = ProjectState()

    def get_state(self) -> ProjectState:
        return self._state

    def load_zip(self, zip_filepath: str) -> ProjectInfo:
        if not os.path.exists(zip_filepath):
            raise ProjectLoadError(f"ZIP file not found at path: {zip_filepath}")

        try:
            zf = zipfile.ZipFile(zip_filepath, 'r')
        except zipfile.BadZipFile:
            raise ProjectLoadError("Invalid or corrupted ZIP file.")

        namelist = zf.namelist()

        # Parse Assembly No & Rev from filename (e.g., ASSY123_RevA.zip -> ASSY123, RevA)
        basename = os.path.splitext(os.path.basename(zip_filepath))[0]
        parts = basename.split('_')
        assy_no = parts[0] if len(parts) > 0 else "UNKNOWN"
        assy_rev = parts[1] if len(parts) > 1 else "v1.0"

        # Find PPL.csv
        ppl_filename = next((name for name in namelist if os.path.basename(name).upper() == "PPL.CSV"), None)
        components = []
        if ppl_filename:
            ppl_bytes = zf.read(ppl_filename)
            components = parse_ppl(ppl_bytes)

        # Find TPR.csv
        tpr_filename = next((name for name in namelist if os.path.basename(name).upper() == "TPR.CSV"), None)
        testpoints = []
        if tpr_filename:
            tpr_bytes = zf.read(tpr_filename)
            testpoints = parse_tpr(tpr_bytes)

        # Find CTP.json
        ctp_filename = next((name for name in namelist if os.path.basename(name).upper() == "CTP.JSON"), None)
        ctps = []
        if ctp_filename:
            try:
                ctp_data = json.loads(zf.read(ctp_filename).decode('utf-8'))
                if isinstance(ctp_data, list):
                    ctps = [CTP(**item) for item in ctp_data]
            except Exception as e:
                print(f"Warning: Failed to parse CTP.json: {e}")

        # Find TCD.json
        tcd_filename = next((name for name in namelist if os.path.basename(name).upper() == "TCD.JSON"), None)
        tcd_obj = None
        if tcd_filename:
            try:
                tcd_data = json.loads(zf.read(tcd_filename).decode('utf-8'))
                tcd_obj = TCD(**tcd_data)
            except Exception as e:
                print(f"Warning: Failed to parse TCD.json: {e}")

        # Detect layers (TOP, BOT)
        available_layers: Dict[str, LayerInfo] = {}
        transform_services: Dict[str, TransformService] = {}
        images_bytes: Dict[str, bytes] = {}

        warnings = []
        for layer in ["TOP", "BOT"]:
            # Find image
            img_filename = next((name for name in namelist if layer in name.upper() and name.lower().endswith(('.png', '.jpg', '.jpeg'))), None)
            img_bytes = zf.read(img_filename) if img_filename else None
            if img_bytes:
                images_bytes[layer] = img_bytes

            # Find origin JSON by scanning JSON files specifically containing "transformation_matrix"
            matrix = None
            origin_pixel = None
            candidate_json_files = [name for name in namelist if layer in name.upper() and name.lower().endswith('.json') and 'CTP' not in name.upper() and 'TCD' not in name.upper()]

            for candidate in candidate_json_files:
                try:
                    origin_data = json.loads(zf.read(candidate).decode('utf-8'))
                    if isinstance(origin_data, dict) and "transformation_matrix" in origin_data:
                        matrix = origin_data.get("transformation_matrix")
                        origin_pixel = origin_data.get("origin_pixel")
                        if matrix:
                            transform_services[layer] = TransformService(matrix)
                            break
                except Exception as e:
                    print(f"Warning: Failed to parse layer origin JSON '{candidate}' for {layer}: {e}")

            # Fallback TransformService if no matrix was found in ZIP for this layer
            if not matrix:
                warnings.append(f"Warning: {layer}_origin.json not found in ZIP archive. Using default fallback transform.")
                fallback_matrix = [
                    [10.0, 0.0, 50.0],
                    [0.0, 10.0, 50.0]
                ]
                transform_services[layer] = TransformService(fallback_matrix)

            layer_info = LayerInfo(
                layer=layer,
                image_available=img_bytes is not None,
                origin_json_available=matrix is not None,
                transformation_matrix=matrix,
                origin_pixel=origin_pixel
            )
            if img_bytes or matrix or True:
                available_layers[layer] = layer_info

        zf.close()

        active_layer = "TOP" if "TOP" in available_layers else ("BOT" if "BOT" in available_layers else "TOP")

        # Save to state
        self._state.zip_path = zip_filepath
        self._state.assembly_no = assy_no
        self._state.assembly_rev = assy_rev
        self._state.available_layers = available_layers
        self._state.active_layer = active_layer
        self._state.components = components
        self._state.testpoints = testpoints
        self._state.ctps = ctps
        self._state.tcd = tcd_obj
        self._state.transform_services = transform_services
        self._state.images_bytes = images_bytes

        return ProjectInfo(
            assembly_no=assy_no,
            assembly_rev=assy_rev,
            zip_path=zip_filepath,
            available_layers=list(available_layers.values()),
            active_layer=active_layer,
            has_ctp=len(ctps) > 0,
            has_tcd=tcd_obj is not None,
            warnings=warnings
        )

    def get_image_bytes(self, layer: str) -> bytes:
        layer_upper = layer.upper()
        if layer_upper in self._state.images_bytes:
            return self._state.images_bytes[layer_upper]
        raise ProjectLoadError(f"Image for layer '{layer}' not available.")

    def set_active_layer(self, layer: str) -> str:
        layer_upper = layer.upper()
        if layer_upper in self._state.available_layers:
            self._state.active_layer = layer_upper
        return self._state.active_layer

    def _update_zip_file(self, filename_in_zip: str, data_bytes: bytes):
        if not self._state.zip_path or not os.path.exists(self._state.zip_path):
            return

        zip_path = self._state.zip_path
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".zip")
        os.close(tmp_fd)

        try:
            with zipfile.ZipFile(zip_path, 'r') as xin:
                with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as xout:
                    written = False
                    for item in xin.infolist():
                        if os.path.basename(item.filename).upper() == filename_in_zip.upper():
                            xout.writestr(item.filename, data_bytes)
                            written = True
                        else:
                            xout.writestr(item, xin.read(item.filename))
                    if not written:
                        xout.writestr(filename_in_zip, data_bytes)
            shutil.move(tmp_path, zip_path)
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise ProjectLoadError(f"Failed to update {filename_in_zip} in ZIP: {e}")

    def save_ctps(self, ctps: List[CTP]):
        self._state.ctps = ctps
        data = [c.model_dump() for c in ctps]
        json_bytes = json.dumps(data, indent=2).encode('utf-8')
        self._update_zip_file("CTP.json", json_bytes)

    def save_tcd(self, tcd: TCD):
        self._state.tcd = tcd
        json_bytes = json.dumps(tcd.model_dump(), indent=2).encode('utf-8')
        self._update_zip_file("TCD.json", json_bytes)

    def get_zip_bytes(self) -> Tuple[bytes, str]:
        if not self._state.zip_path or not os.path.exists(self._state.zip_path):
            raise ProjectLoadError("No active ZIP project loaded.")
        filename = os.path.basename(self._state.zip_path)
        with open(self._state.zip_path, "rb") as f:
            return f.read(), filename

project_service = ProjectService()

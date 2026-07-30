import csv
import io
from typing import List
from backend.models.component import PPLComponent

def parse_ppl(csv_content: bytes | str) -> List[PPLComponent]:
    if isinstance(csv_content, bytes):
        text = csv_content.decode('utf-8-sig', errors='replace')
    else:
        text = csv_content

    lines = text.splitlines()
    header_idx = -1
    for i, line in enumerate(lines):
        if "Designator" in line:
            header_idx = i
            break

    if header_idx == -1:
        # Fallback: assume line 0
        header_idx = 0

    csv_data = "\n".join(lines[header_idx:])
    reader = csv.DictReader(io.StringIO(csv_data))

    components: List[PPLComponent] = []
    for row in reader:
        # Strip quotes and whitespace from column names and values
        clean_row = {k.strip(' "'): v.strip(' "') for k, v in row.items() if k}
        des = clean_row.get("Designator") or clean_row.get("designator") or ""
        if not des:
            continue

        raw_layer = clean_row.get("Layer") or clean_row.get("layer") or "TOP"
        layer_upper = raw_layer.upper()
        if "TOP" in layer_upper:
            layer = "TOP"
        elif "BOT" in layer_upper:
            layer = "BOT"
        else:
            layer = "TOP"

        try:
            x_mm = float(clean_row.get("Center-X(mm)") or clean_row.get("X") or clean_row.get("x_mm") or 0.0)
        except ValueError:
            x_mm = 0.0

        try:
            y_mm = float(clean_row.get("Center-Y(mm)") or clean_row.get("Y") or clean_row.get("y_mm") or 0.0)
        except ValueError:
            y_mm = 0.0

        try:
            rot = float(clean_row.get("Rotation") or clean_row.get("rotation") or 0.0)
        except ValueError:
            rot = 0.0

        des_upper = des.upper()
        comp_type = "FIDUCIAL" if des_upper.startswith("FD") or des_upper.startswith("FID") else "COMPONENT"

        comp = PPLComponent(
            designator=des,
            comment=clean_row.get("Comment") or clean_row.get("comment") or "",
            layer=layer,
            footprint=clean_row.get("Footprint") or clean_row.get("footprint") or "",
            x_mm=x_mm,
            y_mm=y_mm,
            rotation=rot,
            type=comp_type
        )
        components.append(comp)

    return components

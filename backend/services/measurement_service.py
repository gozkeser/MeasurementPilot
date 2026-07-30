import os
import json
from datetime import datetime, timezone
from typing import List, Optional
from backend.config import SESSIONS_DIR
from backend.models.measurement import MeasurementSession, MeasurementRecord
from backend.services.project_service import project_service, ProjectLoadError
from backend.services.tcd_service import tcd_service

class MeasurementService:
    def _get_session_path(self, session_id: str) -> str:
        return str(SESSIONS_DIR / f"TM_{session_id}.json")

    def start_session(self, operator: str) -> MeasurementSession:
        state = project_service.get_state()
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        
        # Calculate sequence number NNN
        existing_files = [f for f in os.listdir(SESSIONS_DIR) if f.startswith(f"TM_{timestamp_str[:8]}")]
        seq = len(existing_files) + 1
        session_id = f"{timestamp_str}_{seq:03d}"

        session = MeasurementSession(
            session_id=session_id,
            assembly_no=state.assembly_no or "UNKNOWN",
            assembly_rev=state.assembly_rev or "v1.0",
            operator=operator or "Operator",
            start_time=now.isoformat(),
            records=[]
        )

        self._save_session(session)
        return session

    def _save_session(self, session: MeasurementSession):
        file_path = self._get_session_path(session.session_id)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(session.model_dump(), indent=2))

    def get_session(self, session_id: str) -> MeasurementSession:
        file_path = self._get_session_path(session_id)
        if not os.path.exists(file_path):
            raise ProjectLoadError(f"Measurement session '{session_id}' not found.")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return MeasurementSession(**data)

    def record_measurement(
        self,
        session_id: str,
        test_case_id: str,
        measured_value: float,
        measured_prefix: str = "",
        measured_unit: str = "",
        notes: str = ""
    ) -> MeasurementRecord:
        session = self.get_session(session_id)
        tcd = tcd_service.get_tcd()

        tc = next((c for c in tcd.test_cases if c.id == test_case_id), None)
        tc_name = tc.name if tc else test_case_id

        in_range = None
        if tc:
            # Simple conversion if prefix matches
            in_range = (tc.expected_min <= measured_value <= tc.expected_max)

        record = MeasurementRecord(
            test_case_id=test_case_id,
            test_case_name=tc_name,
            status="measured",
            measured_value=measured_value,
            measured_prefix=measured_prefix,
            measured_unit=measured_unit,
            in_range=in_range,
            notes=notes or "",
            timestamp=datetime.now(timezone.utc).isoformat()
        )

        # Update existing record or append
        idx = next((i for i, r in enumerate(session.records) if r.test_case_id == test_case_id), None)
        if idx is not None:
            session.records[idx] = record
        else:
            session.records.append(record)

        self._save_session(session)
        return record

    def skip_measurement(self, session_id: str, test_case_id: str, notes: str = "") -> MeasurementRecord:
        session = self.get_session(session_id)
        tcd = tcd_service.get_tcd()

        tc = next((c for c in tcd.test_cases if c.id == test_case_id), None)
        tc_name = tc.name if tc else test_case_id

        record = MeasurementRecord(
            test_case_id=test_case_id,
            test_case_name=tc_name,
            status="skipped",
            notes=notes or "",
            timestamp=datetime.now(timezone.utc).isoformat()
        )

        idx = next((i for i, r in enumerate(session.records) if r.test_case_id == test_case_id), None)
        if idx is not None:
            session.records[idx] = record
        else:
            session.records.append(record)

        self._save_session(session)
        return record

    def list_sessions(self) -> List[dict]:
        sessions = []
        if not os.path.exists(SESSIONS_DIR):
            return sessions

        for fname in sorted(os.listdir(SESSIONS_DIR), reverse=True):
            if fname.startswith("TM_") and fname.endswith(".json"):
                sid = fname[3:-5]
                try:
                    sess = self.get_session(sid)
                    sessions.append({
                        "session_id": sess.session_id,
                        "operator": sess.operator,
                        "start_time": sess.start_time,
                        "assembly_no": sess.assembly_no,
                        "assembly_rev": sess.assembly_rev,
                        "record_count": len(sess.records)
                    })
                except Exception:
                    pass
        return sessions

measurement_service = MeasurementService()

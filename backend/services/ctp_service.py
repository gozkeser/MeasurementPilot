from datetime import datetime, timezone
from typing import List, Optional
from backend.models.ctp import CTP, CTPCreate, CTPUpdate
from backend.services.project_service import project_service, ProjectLoadError

class CTPService:
    def list_ctps(self) -> List[CTP]:
        state = project_service.get_state()
        return state.ctps

    def create_ctp(self, data: CTPCreate) -> CTP:
        state = project_service.get_state()
        count = len(state.ctps) + 1
        new_id = f"CTP-{count:03d}"

        # Ensure unique ID
        existing_ids = {c.id for c in state.ctps}
        while new_id in existing_ids:
            count += 1
            new_id = f"CTP-{count:03d}"

        now_str = datetime.now(timezone.utc).isoformat()
        ctp = CTP(
            id=new_id,
            name=data.name or new_id,
            side=data.side.upper(),
            x_mm=data.x_mm,
            y_mm=data.y_mm,
            net=data.net or "",
            notes=data.notes or "",
            created_at=now_str,
            updated_at=now_str
        )
        ctps = list(state.ctps)
        ctps.append(ctp)
        project_service.save_ctps(ctps)
        return ctp

    def update_ctp(self, ctp_id: str, data: CTPUpdate) -> CTP:
        state = project_service.get_state()
        ctps = list(state.ctps)
        target_idx = next((i for i, c in enumerate(ctps) if c.id == ctp_id), None)
        if target_idx is None:
            raise ProjectLoadError(f"CTP with ID '{ctp_id}' not found.")

        existing = ctps[target_idx]
        now_str = datetime.now(timezone.utc).isoformat()
        updated = CTP(
            id=existing.id,
            name=data.name if data.name is not None else existing.name,
            side=data.side.upper() if data.side is not None else existing.side,
            x_mm=data.x_mm if data.x_mm is not None else existing.x_mm,
            y_mm=data.y_mm if data.y_mm is not None else existing.y_mm,
            net=data.net if data.net is not None else existing.net,
            notes=data.notes if data.notes is not None else existing.notes,
            created_at=existing.created_at,
            updated_at=now_str
        )
        ctps[target_idx] = updated
        project_service.save_ctps(ctps)
        return updated

    def delete_ctp(self, ctp_id: str):
        state = project_service.get_state()
        ctps = [c for c in state.ctps if c.id != ctp_id]
        project_service.save_ctps(ctps)

ctp_service = CTPService()

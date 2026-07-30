from typing import List, Optional, Dict, Any
from backend.models.tcd import TCD, TestCase, ProbePointRef
from backend.models.testpoint import ResolvedProbePoint
from backend.services.project_service import project_service, ProjectLoadError

class TCDService:
    def get_tcd(self) -> TCD:
        state = project_service.get_state()
        if not state.tcd:
            # Initialize empty TCD if none exists
            state.tcd = TCD(
                assembly_no=state.assembly_no or "UNKNOWN",
                assembly_rev=state.assembly_rev or "v1.0",
                test_cases=[]
            )
        return state.tcd

    def resolve_probe_point(self, ref: ProbePointRef, layer: Optional[str] = None) -> ResolvedProbePoint:
        state = project_service.get_state()
        target_layer = layer or state.active_layer

        source_upper = ref.source.upper()
        ref_id = ref.ref

        x_mm, y_mm, side, net = 0.0, 0.0, "TOP", ""
        found = False

        if source_upper == "TPR":
            for tp in state.testpoints:
                if tp.id == ref_id:
                    x_mm, y_mm, side, net = tp.x_mm, tp.y_mm, tp.side, tp.net
                    found = True
                    break
        elif source_upper == "CTP":
            for ctp in state.ctps:
                if ctp.id == ref_id or ctp.name == ref_id:
                    x_mm, y_mm, side, net = ctp.x_mm, ctp.y_mm, ctp.side, ctp.net or ""
                    found = True
                    break
        elif source_upper == "PPL":
            for comp in state.components:
                if comp.designator == ref_id:
                    x_mm, y_mm, side, net = comp.x_mm, comp.y_mm, comp.layer, comp.comment or ""
                    found = True
                    break

        if not found:
            return ResolvedProbePoint(
                source=ref.source,
                ref=ref.ref,
                x_mm=0.0,
                y_mm=0.0,
                side="UNKNOWN",
                net="",
                error=f"Reference '{ref.ref}' not found in source '{ref.source}'"
            )

        x_px, y_px = None, None
        transform_svc = state.transform_services.get(target_layer)
        if transform_svc:
            try:
                x_px, y_px = transform_svc.mm_to_px(x_mm, y_mm)
            except Exception:
                pass

        return ResolvedProbePoint(
            source=ref.source,
            ref=ref.ref,
            x_mm=x_mm,
            y_mm=y_mm,
            side=side,
            net=net,
            x_px=x_px,
            y_px=y_px
        )

    def add_test_case(self, tc: TestCase) -> TestCase:
        tcd = self.get_tcd()
        # Generate ID if missing or duplicate
        existing_ids = {case.id for case in tcd.test_cases}
        if not tc.id or tc.id in existing_ids:
            count = len(tcd.test_cases) + 1
            new_id = f"TC-{count:03d}"
            while new_id in existing_ids:
                count += 1
                new_id = f"TC-{count:03d}"
            tc.id = new_id

        tc.order = len(tcd.test_cases)
        tcd.test_cases.append(tc)
        project_service.save_tcd(tcd)
        return tc

    def update_test_case(self, tc_id: str, updated_tc: TestCase) -> TestCase:
        tcd = self.get_tcd()
        idx = next((i for i, c in enumerate(tcd.test_cases) if c.id == tc_id), None)
        if idx is None:
            raise ProjectLoadError(f"Test case with ID '{tc_id}' not found.")
        updated_tc.id = tc_id
        tcd.test_cases[idx] = updated_tc
        project_service.save_tcd(tcd)
        return updated_tc

    def delete_test_case(self, tc_id: str):
        tcd = self.get_tcd()
        tcd.test_cases = [c for c in tcd.test_cases if c.id != tc_id]
        # Re-index order
        for idx, case in enumerate(tcd.test_cases):
            case.order = idx
        project_service.save_tcd(tcd)

    def reorder_test_cases(self, ordered_ids: List[str]) -> List[TestCase]:
        tcd = self.get_tcd()
        id_map = {c.id: c for c in tcd.test_cases}
        new_list = []
        for idx, tc_id in enumerate(ordered_ids):
            if tc_id in id_map:
                case = id_map[tc_id]
                case.order = idx
                new_list.append(case)
        # Add any remaining
        for c in tcd.test_cases:
            if c.id not in ordered_ids:
                c.order = len(new_list)
                new_list.append(c)
        tcd.test_cases = new_list
        project_service.save_tcd(tcd)
        return new_list

    def get_resolved_tcd(self, layer: Optional[str] = None) -> Dict[str, Any]:
        tcd = self.get_tcd()
        result = tcd.model_dump()
        resolved_cases = []
        for tc in tcd.test_cases:
            tc_dict = tc.model_dump()
            tc_dict["resolved_positive"] = self.resolve_probe_point(tc.probe_positive, layer).model_dump()
            tc_dict["resolved_negative"] = self.resolve_probe_point(tc.probe_negative, layer).model_dump()
            resolved_cases.append(tc_dict)
        result["test_cases"] = resolved_cases
        return result

tcd_service = TCDService()

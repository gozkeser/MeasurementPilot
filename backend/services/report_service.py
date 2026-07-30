import os
from datetime import datetime, timezone
from jinja2 import Environment, FileSystemLoader
from backend.config import TEMPLATES_DIR, SESSIONS_DIR
from backend.services.measurement_service import measurement_service
from backend.services.tcd_service import tcd_service

class ReportService:
    def __init__(self):
        self.env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

    def generate_html_report(self, session_id: str, metadata_overrides: dict = None) -> str:
        session = measurement_service.get_session(session_id)
        tcd = tcd_service.get_tcd()

        meta = {
            "organization": "Electronics QA Lab",
            "department": "Quality Assurance & Testing",
            "location": "Bench #1",
        }
        if metadata_overrides:
            meta.update(metadata_overrides)

        # Build table rows merging TCD expected range with session record
        records_map = {r.test_case_id: r for r in session.records}
        rows = []

        for tc in tcd.test_cases:
            rec = records_map.get(tc.id)
            row = {
                "test_case_id": tc.id,
                "test_case_name": tc.name,
                "expected_min": tc.expected_min,
                "expected_max": tc.expected_max,
                "unit": tc.unit,
                "status": rec.status if rec else "pending",
                "measured_value": rec.measured_value if rec else None,
                "measured_prefix": rec.measured_prefix if rec else "",
                "measured_unit": rec.measured_unit if rec else tc.unit,
                "in_range": rec.in_range if rec else False,
                "notes": rec.notes if rec else ""
            }
            rows.append(row)

        template = self.env.get_template("report_default.html")
        html_content = template.render(
            session=session.model_dump(),
            metadata=meta,
            rows=rows,
            generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        output_path = SESSIONS_DIR / f"Report_{session_id}.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return str(output_path)

    def get_reports_dir(self) -> str:
        return str(SESSIONS_DIR)

report_service = ReportService()

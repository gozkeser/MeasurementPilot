import unittest
from pathlib import Path
from backend.services.project_service import project_service
from backend.services.measurement_service import measurement_service

class TestMeasurementPrefix(unittest.TestCase):
    def setUp(self):
        sample_zip = Path(__file__).resolve().parent / "fixtures" / "sample_project.zip"
        project_service.load_zip(str(sample_zip))
        self.session = measurement_service.start_session("TestOperator")

    def test_measurement_prefix_conversion(self):
        # TC-001 in sample_project: min=3.15V, max=3.45V (base units V)
        # Record 3.3 V -> in range
        rec1 = measurement_service.record_measurement(
            session_id=self.session.session_id,
            test_case_id="TC-001",
            measured_value=3.3,
            measured_prefix="",
            measured_unit="V"
        )
        self.assertTrue(rec1.in_range)

        # Record 3300 mV -> 3.3 V base -> in range
        rec2 = measurement_service.record_measurement(
            session_id=self.session.session_id,
            test_case_id="TC-001",
            measured_value=3300.0,
            measured_prefix="m",
            measured_unit="V"
        )
        self.assertTrue(rec2.in_range)

        # Record 5000 mV -> 5.0 V base -> out of range
        rec3 = measurement_service.record_measurement(
            session_id=self.session.session_id,
            test_case_id="TC-001",
            measured_value=5000.0,
            measured_prefix="m",
            measured_unit="V"
        )
        self.assertFalse(rec3.in_range)

if __name__ == "__main__":
    unittest.main()

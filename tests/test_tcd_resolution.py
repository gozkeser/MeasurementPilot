import unittest
from pathlib import Path
from backend.services.project_service import project_service
from backend.services.tcd_service import tcd_service
from backend.models.tcd import ProbePointRef

class TestTCDResolution(unittest.TestCase):
    def setUp(self):
        sample_zip = Path(__file__).resolve().parent / "fixtures" / "sample_project.zip"
        project_service.load_zip(str(sample_zip))

    def test_resolve_tpr(self):
        ref = ProbePointRef(source="TPR", ref="TP1")
        resolved = tcd_service.resolve_probe_point(ref, "TOP")
        self.assertEqual(resolved.ref, "TP1")
        self.assertEqual(resolved.x_mm, 10.0)
        self.assertEqual(resolved.y_mm, 20.0)
        self.assertEqual(resolved.net, "3V3")
        self.assertAlmostEqual(resolved.x_px, 150.0)
        self.assertAlmostEqual(resolved.y_px, 250.0)

    def test_resolve_ctp(self):
        ref = ProbePointRef(source="CTP", ref="CTP-001")
        resolved = tcd_service.resolve_probe_point(ref, "TOP")
        self.assertEqual(resolved.x_mm, 30.0)
        self.assertEqual(resolved.y_mm, 40.0)
        self.assertAlmostEqual(resolved.x_px, 350.0)
        self.assertAlmostEqual(resolved.y_px, 450.0)

    def test_resolve_ppl(self):
        ref = ProbePointRef(source="PPL", ref="R1")
        resolved = tcd_service.resolve_probe_point(ref, "TOP")
        self.assertEqual(resolved.x_mm, 15.0)
        self.assertEqual(resolved.y_mm, 25.0)
        self.assertAlmostEqual(resolved.x_px, 200.0)
        self.assertAlmostEqual(resolved.y_px, 300.0)

    def test_resolve_not_found(self):
        ref = ProbePointRef(source="TPR", ref="NON_EXISTENT")
        resolved = tcd_service.resolve_probe_point(ref, "TOP")
        self.assertIsNotNone(resolved.error)

if __name__ == "__main__":
    unittest.main()

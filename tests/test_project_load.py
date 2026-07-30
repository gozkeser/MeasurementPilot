import unittest
from pathlib import Path
from backend.services.project_service import project_service

class TestProjectLoad(unittest.TestCase):
    def setUp(self):
        self.sample_zip = Path(__file__).resolve().parent / "fixtures" / "sample_project.zip"

    def test_load_sample_zip(self):
        info = project_service.load_zip(str(self.sample_zip))
        self.assertEqual(info.assembly_no, "sample")
        self.assertTrue(info.has_ctp)
        self.assertTrue(info.has_tcd)
        self.assertEqual(len(info.available_layers), 2)

        state = project_service.get_state()
        self.assertEqual(len(state.components), 4)
        self.assertEqual(len(state.testpoints), 3)
        self.assertEqual(len(state.ctps), 1)
        self.assertIsNotNone(state.tcd)

    def test_get_image_bytes(self):
        project_service.load_zip(str(self.sample_zip))
        top_bytes = project_service.get_image_bytes("TOP")
        self.assertTrue(len(top_bytes) > 0)
        self.assertTrue(top_bytes.startswith(b'\x89PNG'))

if __name__ == "__main__":
    unittest.main()

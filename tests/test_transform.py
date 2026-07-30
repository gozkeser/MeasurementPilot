import unittest
from backend.services.transform_service import TransformService

class TestTransform(unittest.TestCase):
    def test_transform_roundtrip(self):
        matrix = [
            [10.0, 0.0, 100.0],
            [0.0, 10.0, 200.0]
        ]
        svc = TransformService(matrix)

        px, py = svc.mm_to_px(5.0, 8.0)
        self.assertEqual(px, 150.0)
        self.assertEqual(py, 280.0)

        mx, my = svc.px_to_mm(px, py)
        self.assertAlmostEqual(mx, 5.0)
        self.assertAlmostEqual(my, 8.0)

        self.assertAlmostEqual(svc.scale_px_per_mm, 10.0)
        self.assertFalse(svc.is_mirrored)

if __name__ == "__main__":
    unittest.main()


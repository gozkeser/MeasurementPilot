import numpy as np
from typing import Tuple, List, Dict

class TransformService:
    def __init__(self, matrix: List[List[float]]):
        self._M = np.array(matrix, dtype=np.float64)  # shape (2,3)
        self._M2x2 = self._M[:, :2]
        self._t = self._M[:, 2]
        self._M2x2_inv = np.linalg.inv(self._M2x2)

    def mm_to_px(self, x_mm: float, y_mm: float) -> Tuple[float, float]:
        pt = np.array([x_mm, y_mm])
        result = self._M2x2 @ pt + self._t
        return float(result[0]), float(result[1])

    def px_to_mm(self, x_px: float, y_px: float) -> Tuple[float, float]:
        pt = np.array([x_px, y_px])
        result = self._M2x2_inv @ (pt - self._t)
        return float(result[0]), float(result[1])

    @property
    def scale_px_per_mm(self) -> float:
        return float(np.sqrt(self._M[0,0]**2 + self._M[1,0]**2))

    @property
    def is_mirrored(self) -> bool:
        det = self._M[0,0]*self._M[1,1] - self._M[0,1]*self._M[1,0]
        return det < 0

import csv
import io
import re
from typing import List
from backend.models.testpoint import TestPoint


def _parse_mm(raw: str) -> float:
    """'58mm', '44.5mm', '"58mm"', '58', '44.5' gibi formatları float'a çevirir.
    Sayı ve nokta/eksi dışındaki tüm karakterleri siler."""
    if not raw:
        return 0.0
    cleaned = re.sub(r'[^\d.\-]', '', raw.strip().strip('"\''))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_tpr(csv_content: bytes | str) -> List[TestPoint]:
    if isinstance(csv_content, bytes):
        text = csv_content.decode('utf-8-sig', errors='replace')
    else:
        text = csv_content

    reader = csv.DictReader(io.StringIO(text))
    test_points: List[TestPoint] = []

    for row in reader:
        clean_row = {k.strip(' "\'`'): v.strip(' "\'`') for k, v in row.items() if k}
        tp_id = (clean_row.get("Name") or clean_row.get("TP Name") or
                 clean_row.get("ID") or clean_row.get("id") or "")
        if not tp_id:
            continue

        raw_side = clean_row.get("Side") or clean_row.get("Layer") or clean_row.get("side") or "BOTH"
        side_upper = raw_side.upper()
        if "TOP" in side_upper:
            side = "TOP"
        elif "BOT" in side_upper:
            side = "BOT"
        else:
            side = "BOTH"

        x_mm = _parse_mm(clean_row.get("X Coord") or clean_row.get("X") or clean_row.get("x_mm") or "")
        y_mm = _parse_mm(clean_row.get("Y Coord") or clean_row.get("Y") or clean_row.get("y_mm") or "")
        hole_size = _parse_mm(clean_row.get("Hole Size") or clean_row.get("HoleSize") or clean_row.get("hole_size_mm") or "")

        tp = TestPoint(
            id=tp_id,
            net=clean_row.get("Net") or clean_row.get("net") or "",
            side=side,
            x_mm=x_mm,
            y_mm=y_mm,
            hole_size_mm=hole_size,
            type="TPR"
        )
        test_points.append(tp)

    return test_points

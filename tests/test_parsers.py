import unittest
from backend.services.ppl_parser import parse_ppl
from backend.services.tpr_parser import parse_tpr

SAMPLE_PPL = """"Designator","Comment","Layer","Footprint","Center-X(mm)","Center-Y(mm)","Rotation"
"R1","10k","TopLayer","0805","12.5","24.0","90"
"FD1","Fiducial","TopLayer","FID_05","5.0","5.0","0"
"C1","100nF","BottomLayer","0603","15.0","30.0","0"
"""

SAMPLE_TPR = """"Name","Net","Side","X Coord","Y Coord","Hole Size"
"TP1","GND","Top","10.0","20.0","0.8"
"TP2","VCC","Bottom","15.0","25.0","0.8"
"""

class TestParsers(unittest.TestCase):
    def test_parse_ppl(self):
        comps = parse_ppl(SAMPLE_PPL)
        self.assertEqual(len(comps), 3)
        self.assertEqual(comps[0].designator, "R1")
        self.assertEqual(comps[0].layer, "TOP")
        self.assertEqual(comps[0].type, "COMPONENT")
        self.assertEqual(comps[1].designator, "FD1")
        self.assertEqual(comps[1].type, "FIDUCIAL")
        self.assertEqual(comps[2].layer, "BOT")

    def test_parse_tpr(self):
        tps = parse_tpr(SAMPLE_TPR)
        self.assertEqual(len(tps), 2)
        self.assertEqual(tps[0].id, "TP1")
        self.assertEqual(tps[0].net, "GND")
        self.assertEqual(tps[0].side, "TOP")
        self.assertEqual(tps[0].x_mm, 10.0)
        self.assertEqual(tps[1].id, "TP2")
        self.assertEqual(tps[1].side, "BOT")

if __name__ == "__main__":
    unittest.main()


import os
import json
import zipfile
import zlib
import struct
from pathlib import Path

def create_dummy_png(width=800, height=600, color=(30, 41, 59)):
    # Generates a valid uncompressed raw 24-bit PNG file
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw_data = b''
    for _ in range(height):
        raw_data += b'\x00' + bytes(color) * width

    idat = chunk(b'IDAT', zlib.compress(raw_data))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def create_sample_zip(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    ppl_csv = """"Designator","Comment","Layer","Footprint","Center-X(mm)","Center-Y(mm)","Rotation"
"R1","10k","TopLayer","0805","15.0","25.0","0"
"R2","1k","TopLayer","0805","25.0","35.0","90"
"FD1","Fiducial","TopLayer","FID_05","5.0","5.0","0"
"C1","100nF","BottomLayer","0603","20.0","30.0","0"
"""

    tpr_csv = """"Name","Net","Side","X Coord","Y Coord","Hole Size"
"TP1","3V3","Top","10.0","20.0","0.8"
"TP2","GND","Top","50.0","60.0","0.8"
"TP3","VBAT","Bottom","15.0","25.0","0.8"
"""

    ctp_json = [
      {
        "id": "CTP-001",
        "name": "CTP_POWER_RAIL",
        "side": "TOP",
        "x_mm": 30.0,
        "y_mm": 40.0,
        "net": "VCC_IN",
        "notes": "Custom test pad for VCC input"
      }
    ]

    tcd_json = {
      "assembly_no": "ASSY-8765",
      "assembly_rev": "RevB",
      "version": "1.0",
      "test_cases": [
        {
          "id": "TC-001",
          "name": "3.3V Rail Voltage Test",
          "description": "Measure DC voltage between TP1 and TP2",
          "measurement_type": "DC_VOLTAGE",
          "expected_min": 3.15,
          "expected_max": 3.45,
          "unit": "V",
          "prefix": "",
          "probe_positive": { "source": "TPR", "ref": "TP1" },
          "probe_negative": { "source": "TPR", "ref": "TP2" },
          "order": 0,
          "status": "pending"
        }
      ]
    }

    top_origin = {
      "transformation_matrix": [
        [10.0, 0.0, 50.0],
        [0.0, 10.0, 50.0]
      ],
      "origin_pixel": { "x": 50, "y": 50 }
    }

    bot_origin = {
      "transformation_matrix": [
        [-10.0, 0.0, 750.0],
        [0.0, 10.0, 50.0]
      ],
      "origin_pixel": { "x": 750, "y": 50 }
    }

    top_png = create_dummy_png(800, 600, (15, 23, 42))
    bot_png = create_dummy_png(800, 600, (30, 41, 59))

    with zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("PPL.csv", ppl_csv.encode('utf-8'))
        zf.writestr("TPR.csv", tpr_csv.encode('utf-8'))
        zf.writestr("CTP.json", json.dumps(ctp_json, indent=2).encode('utf-8'))
        zf.writestr("TCD.json", json.dumps(tcd_json, indent=2).encode('utf-8'))
        zf.writestr("TOP_origin.json", json.dumps(top_origin, indent=2).encode('utf-8'))
        zf.writestr("BOT_origin.json", json.dumps(bot_origin, indent=2).encode('utf-8'))
        zf.writestr("TOP.png", top_png)
        zf.writestr("BOT.png", bot_png)

    print(f"Sample ZIP successfully created at: {output_path}")

if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "fixtures" / "sample_project.zip"
    create_sample_zip(target)

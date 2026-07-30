import sys
import os
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import argparse
import uvicorn

def main():
    parser = argparse.ArgumentParser(description="MeasurementPilot Server Launcher")
    parser.add_argument("--host", default="0.0.0.0", help="Host address to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on (default: 8765)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print("==================================================")
    print("      MeasurementPilot — Launching Server         ")
    print(f"      Host: http://{args.host}:{args.port}")
    print("==================================================")

    uvicorn.run("backend.main:app", host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()

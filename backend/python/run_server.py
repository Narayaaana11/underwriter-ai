"""
run_server.py — Python FastAPI & PySpark Server Launcher
"""
import sys
import os

from dotenv import load_dotenv
load_dotenv()

os.environ["NO_COLOR"] = "1"
os.environ["ANSI_COLORS_DISABLED"] = "1"

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("[UnderWriter AI] Launching Python API Server on http://127.0.0.1:5000...")
    uvicorn.run(app, host="127.0.0.1", port=5000, log_config=None)

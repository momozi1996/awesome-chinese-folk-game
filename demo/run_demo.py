#!/usr/bin/env python3
"""Run the game from any working directory."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.utils.server import main
if __name__ == '__main__': main()

"""Paths are anchored to this repository, never the caller's working directory."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / 'cases'
FORUM = ROOT / 'src' / 'forum_system'

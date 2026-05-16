"""pytest configuration for the backend test suite.

Adds ``backend/`` to ``sys.path`` so that ``from app.xxx import ...``
works when pytest is run from within the ``backend/`` directory.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend/ directory is on sys.path so pytest can resolve
# ``app.*`` imports without the package being installed.
sys.path.insert(0, str(Path(__file__).parent.parent))

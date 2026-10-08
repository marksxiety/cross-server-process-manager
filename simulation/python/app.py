"""XPM simulation process (Python): ticks a few times, then crashes on purpose.

Exercises the error path: with autorestart enabled, PM2 cycles through
online -> waiting restart -> errored once its restart budget is exhausted.
"""

import time
from datetime import datetime

TICKS_BEFORE_CRASH = 3

for tick in range(1, TICKS_BEFORE_CRASH + 1):
    print(f"[python-sim] {datetime.now().isoformat(timespec='seconds')} tick {tick}", flush=True)
    time.sleep(2)

raise RuntimeError("simulated crash - python-sim is designed to fail")

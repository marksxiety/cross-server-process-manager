"""XPM simulation process (Python): just a log loop."""

import time
from datetime import datetime

while True:
    print(f"[python-sim] {datetime.now().isoformat(timespec='seconds')} tick", flush=True)
    time.sleep(2)

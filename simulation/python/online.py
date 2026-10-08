"""XPM status sim: healthy tick loop (Online / Stopped via UI Stop)."""

import time
from datetime import datetime

while True:
    print(f"[status-sim] {datetime.now().isoformat(timespec='seconds')} tick", flush=True)
    time.sleep(2)

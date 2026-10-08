"""XPM status sim: crashes immediately with a traceback (Errored / Waiting Restart / Failed)."""

from datetime import datetime

print(f"[status-sim] {datetime.now().isoformat(timespec='seconds')} crashing", flush=True)
raise RuntimeError("simulated crash - status-sim is designed to fail")

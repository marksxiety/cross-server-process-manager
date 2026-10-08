"""XPM status sim: one-shot job that exits cleanly (Completed / Scheduled Idle)."""

from datetime import datetime

print(f"[status-sim] {datetime.now().isoformat(timespec='seconds')} one-shot finished", flush=True)

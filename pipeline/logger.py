import sys
from datetime import datetime, timezone


class PipelineLogger:
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self._stage_num = 0

    def stage(self, name: str):
        self._stage_num += 1
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"\n{'='*60}")
            print(f"  STAGE {self._stage_num}: {name}  [{ts}]")
            print(f"{'='*60}")
            sys.stdout.flush()

    def info(self, msg: str):
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"  [{ts}] {msg}")
            sys.stdout.flush()

    def warn(self, msg: str):
        if self.verbose:
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"  [{ts}] ! {msg}")
            sys.stdout.flush()

    def error(self, msg: str):
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"  [{ts}] X {msg}", file=sys.stderr)
        sys.stderr.flush()

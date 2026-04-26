# server/ — FastAPI Backend

## Folder Structure

```
server/
├── __init__.py
├── case_builder.py
├── ground_truth.py
├── log_adapter.py
├── main.py
└── pipeline_bridge.py
```

---

## `__init__.py`

```python
# (empty)
```

---

## `case_builder.py`

```python
"""
Assembles a full `case` dict compatible with CaseEnvironmentLoader
from UI-generated logs + ground truth.
"""

from datetime import datetime, timezone
from server.log_adapter import convert_ui_logs
from server.ground_truth import get_ground_truth, get_goal, get_assets, get_requirements


def build_case(trigger_type: str, ui_logs: list[dict]) -> dict:
    structured_logs = convert_ui_logs(ui_logs)
    known_truth = get_ground_truth(trigger_type)
    goal = get_goal(trigger_type)

    difficulty_map = {
        "BRUTE_FORCE": "easy", "CRED_STUFFING": "easy", "VPN_BRUTE": "medium",
        "LATERAL_MOVEMENT": "hard", "DATA_EXFILTRATION": "medium",
        "MALWARE_PERSISTENCE": "hard", "C2_COMMUNICATION": "hard",
        "WEB_SQL_INJECTION": "medium",
    }
    category_map = {
        "BRUTE_FORCE": "incident", "CRED_STUFFING": "incident", "VPN_BRUTE": "network",
        "LATERAL_MOVEMENT": "network", "DATA_EXFILTRATION": "incident",
        "MALWARE_PERSISTENCE": "malware", "C2_COMMUNICATION": "network",
        "WEB_SQL_INJECTION": "appsec",
    }

    now = datetime.now(timezone.utc)
    case_id = f"ui_{trigger_type.lower()}_{now.strftime('%H%M%S')}"

    return {
        "case_id": case_id,
        "goal": goal,
        "difficulty": difficulty_map.get(trigger_type, "medium"),
        "category": category_map.get(trigger_type, "incident"),
        "tags": [trigger_type.lower(), "ui_generated"],
        "created_at": now.isoformat(),
        "active": True,
        "environment": {
            "os": "Mixed — Windows Server 2019 + Ubuntu 22.04 LTS",
            "network_range": "10.10.2.0/24",
            "assets": get_assets(),
        },
        "requirements_file": get_requirements(),
        "logs": structured_logs,
        "known_truth": known_truth,
    }
```

---

## `ground_truth.py`

Ground truth definitions for 8 UI attack scenarios (BRUTE_FORCE, CRED_STUFFING, VPN_BRUTE, LATERAL_MOVEMENT, DATA_EXFILTRATION, MALWARE_PERSISTENCE, C2_COMMUNICATION, WEB_SQL_INJECTION), shared mock assets (5 hosts), shared requirements, and goal strings.

> **Note**: This file is ~250 lines. See `server/ground_truth.py` for the full source. Key exports:

```python
def get_ground_truth(trigger_type: str) -> dict: ...
def get_goal(trigger_type: str) -> str: ...
def get_assets() -> list: ...
def get_requirements() -> dict: ...
```

---

## `log_adapter.py`

```python
"""
Converts flat UI log entries {ts, tag, message} into the 3-bucket structured
format that the CyberBench pipeline's CaseEnvironmentLoader expects.

UI tags → log buckets:
  auth_logs:    AUTH_FAIL, AUTH_SUCCESS, BRUTE_FORCE, CRED_STUFFING,
                VPN_AUTH, VPN_AUTH_FAIL, USER_LOGIN
  network_logs: LATERAL_MOVE, DNS_BEACON, NET_CONN, LARGE_UPLOAD, BULK_COPY
  system_logs:  PROCESS_SPAWN, SCHED_TASK, REG_WRITE, FILE_ACCESS,
                SQLI_ATTEMPT, DB_EXFIL, LDAP_QUERY
"""

import re
from datetime import datetime, timezone

AUTH_TAGS = {
    "AUTH_FAIL", "AUTH_SUCCESS", "BRUTE_FORCE", "CRED_STUFFING",
    "VPN_AUTH", "VPN_AUTH_FAIL", "USER_LOGIN",
}
NETWORK_TAGS = {
    "LATERAL_MOVE", "DNS_BEACON", "NET_CONN", "LARGE_UPLOAD", "BULK_COPY",
}
SYSTEM_TAGS = {
    "PROCESS_SPAWN", "SCHED_TASK", "REG_WRITE", "FILE_ACCESS",
    "SQLI_ATTEMPT", "DB_EXFIL", "LDAP_QUERY",
}
SKIP_TAGS = {"SYSTEM", "PAGE_ACCESS", "SEARCH", "TRIGGER"}

IP_RE = re.compile(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b")
USER_RE = re.compile(r"'([a-zA-Z0-9_.\-]+)'")
DOMAIN_RE = re.compile(r"(?:via |→\s*resolved\s+|query:\s+)([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+)")
PORT_RE = re.compile(r":(\d{2,5})\b")
FILE_RE = re.compile(r"(?:Opened|file):\s*(\S+)")


def _today_iso(ts_str: str) -> str:
    now = datetime.now(timezone.utc)
    return f"{now.strftime('%Y-%m-%d')}T{ts_str}Z"

def _extract_ip(msg: str) -> str: ...
def _extract_user(msg: str) -> str: ...
def _extract_domain(msg: str) -> str: ...

def _parse_auth_log(tag: str, ts: str, msg: str) -> dict: ...
def _parse_network_log(tag: str, ts: str, msg: str) -> dict: ...
def _parse_system_log(tag: str, ts: str, msg: str) -> dict: ...

def convert_ui_logs(ui_logs: list[dict]) -> dict:
    """
    Convert a list of flat UI log dicts into the 3-bucket format:
    {"auth_logs": [...], "network_logs": [...], "system_logs": [...]}
    """
    auth_logs = []
    network_logs = []
    system_logs = []

    for log in ui_logs:
        tag = log.get("tag", "")
        ts = log.get("ts", "00:00:00")
        msg = log.get("message", "")

        if tag in SKIP_TAGS:
            continue
        elif tag in AUTH_TAGS:
            auth_logs.append(_parse_auth_log(tag, ts, msg))
        elif tag in NETWORK_TAGS:
            network_logs.append(_parse_network_log(tag, ts, msg))
        elif tag in SYSTEM_TAGS:
            system_logs.append(_parse_system_log(tag, ts, msg))

    return {
        "auth_logs": auth_logs,
        "network_logs": network_logs,
        "system_logs": system_logs,
    }
```

---

## `main.py`

```python
"""
FastAPI backend for CyberBench UI ↔ Pipeline integration.

Endpoints:
  POST /api/pipeline/trigger     — Accept UI logs + trigger, start pipeline async
  GET  /api/pipeline/results/{id} — Poll for pipeline results
  GET  /api/leaderboard          — Return leaderboard data
  POST /api/rl/train             — Start RL training
  GET  /api/rl/status            — RL training status + buffer stats
  POST /api/rl/stop              — Stop RL training
  GET  /api/history/{agent_name} — Agent run history
  GET  /api/health               — Health check
"""

import asyncio, os, sys, uuid, traceback
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from server.pipeline_bridge import run_ui_pipeline
from pipeline.metrics import get_leaderboard, get_agent_history
from pipeline.runner import get_rl_buffer

app = FastAPI(title="CyberBench Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"], allow_headers=["*"],
)

pipeline_runs: dict[str, dict[str, Any]] = {}

# ... TriggerRequest, TriggerResponse models ...
# ... POST /api/pipeline/trigger — runs full agent pipeline in background ...
# ... GET /api/pipeline/results/{run_id} — returns status + scores ...
# ... GET /api/leaderboard ...
# ... POST /api/rl/train, GET /api/rl/status, POST /api/rl/stop ...
# ... GET /api/history/{agent_name} ...
# ... GET /api/health ...
```

> **Note**: Full source is ~365 lines. See `server/main.py` for complete implementation including per-agent status tracking during pipeline runs.

---

## `pipeline_bridge.py`

```python
"""
Bridge between the UI-generated cases and the existing pipeline runner.
"""

from pipeline.runner import run_pipeline
from server.case_builder import build_case


class UICaseSelector:
    """Drop-in replacement for CaseSelector that returns a single pre-built case."""
    def __init__(self, case: dict):
        self._case = case
    def pick(self) -> dict:
        return self._case
    def pick_all(self) -> list:
        return [self._case]
    def pool_summary(self) -> dict:
        return {"total": 1, "by_difficulty": {self._case["difficulty"]: 1}, "by_category": {self._case["category"]: 1}}


async def run_ui_pipeline(
    trigger_type: str,
    ui_logs: list[dict],
    agent_name: str = "CyberBench-UI-Agent",
    agent_description: str = "Target agent being evaluated via the CyberBench interactive UI.",
) -> dict:
    case = build_case(trigger_type, ui_logs)
    selector = UICaseSelector(case)
    result = await run_pipeline(
        agent_name=agent_name,
        agent_description=agent_description,
        selector=selector,
        verbose=True,
    )
    return result
```

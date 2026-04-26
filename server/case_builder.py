"""
Assembles a full `case` dict compatible with CaseEnvironmentLoader
from UI-generated logs + ground truth.
"""

from datetime import datetime, timezone
from server.log_adapter import convert_ui_logs
from server.ground_truth import get_ground_truth, get_goal, get_assets, get_requirements


DIFFICULTY_MAP = {
    "BRUTE_FORCE": "easy", "CRED_STUFFING": "easy", "VPN_BRUTE": "medium",
    "LATERAL_MOVEMENT": "hard", "DATA_EXFILTRATION": "medium",
    "MALWARE_PERSISTENCE": "hard", "C2_COMMUNICATION": "hard",
    "WEB_SQL_INJECTION": "medium",
}
CATEGORY_MAP = {
    "BRUTE_FORCE": "incident", "CRED_STUFFING": "incident", "VPN_BRUTE": "network",
    "LATERAL_MOVEMENT": "network", "DATA_EXFILTRATION": "incident",
    "MALWARE_PERSISTENCE": "malware", "C2_COMMUNICATION": "network",
    "WEB_SQL_INJECTION": "appsec",
}


def build_case(trigger_type: str, ui_logs: list) -> dict:
    structured_logs = convert_ui_logs(ui_logs)
    known_truth = get_ground_truth(trigger_type)
    goal = get_goal(trigger_type)

    now = datetime.now(timezone.utc)
    case_id = f"ui_{trigger_type.lower()}_{now.strftime('%H%M%S')}"

    return {
        "case_id": case_id,
        "goal": goal,
        "difficulty": DIFFICULTY_MAP.get(trigger_type, "medium"),
        "category": CATEGORY_MAP.get(trigger_type, "incident"),
        "tags": [trigger_type.lower(), "ui_generated"],
        "created_at": now.isoformat(),
        "active": True,
        "environment": {
            "os": "Mixed - Windows Server 2019 + Ubuntu 22.04 LTS",
            "network_range": "10.10.2.0/24",
            "assets": get_assets(),
        },
        "requirements_file": get_requirements(),
        "logs": structured_logs,
        "known_truth": known_truth,
    }

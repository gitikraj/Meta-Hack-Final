"""
Converts flat UI log entries {ts, tag, message} into the 3-bucket structured
format that the CyberBench pipeline's CaseEnvironmentLoader expects.
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
DOMAIN_RE = re.compile(r"(?:via |->\s*resolved\s+|query:\s+)([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+)")
PORT_RE = re.compile(r":(\d{2,5})\b")
FILE_RE = re.compile(r"(?:Opened|file):\s*(\S+)")


def _today_iso(ts_str: str) -> str:
    now = datetime.now(timezone.utc)
    return f"{now.strftime('%Y-%m-%d')}T{ts_str}Z"


def _extract_ip(msg: str) -> str:
    m = IP_RE.search(msg or "")
    return m.group(1) if m else ""


def _extract_user(msg: str) -> str:
    m = USER_RE.search(msg or "")
    return m.group(1) if m else ""


def _extract_domain(msg: str) -> str:
    m = DOMAIN_RE.search(msg or "")
    return m.group(1) if m else ""


def _parse_auth_log(tag: str, ts: str, msg: str) -> dict:
    return {
        "ts": _today_iso(ts),
        "event": tag,
        "user": _extract_user(msg),
        "src_ip": _extract_ip(msg),
        "raw_message": msg,
    }


def _parse_network_log(tag: str, ts: str, msg: str) -> dict:
    return {
        "ts": _today_iso(ts),
        "event": tag,
        "src_ip": _extract_ip(msg),
        "domain": _extract_domain(msg),
        "raw_message": msg,
    }


def _parse_system_log(tag: str, ts: str, msg: str) -> dict:
    return {
        "ts": _today_iso(ts),
        "event": tag,
        "user": _extract_user(msg),
        "raw_message": msg,
    }


def convert_ui_logs(ui_logs: list) -> dict:
    """
    Convert a list of flat UI log dicts into the 3-bucket format.
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

"""
Ground truth for the 8 UI attack scenarios. Provides:
  - get_ground_truth(trigger_type) -> dict
  - get_goal(trigger_type)         -> str
  - get_assets()                   -> list[dict]
  - get_requirements()             -> dict
"""

SHARED_ASSETS = [
    {"id": "asset_01", "hostname": "DC01.corp.local", "ip": "10.10.2.10", "role": "Domain Controller", "os": "Windows Server 2019", "open_ports": [53, 88, 389, 445, 3268]},
    {"id": "asset_02", "hostname": "WEB02.corp.local", "ip": "10.10.2.20", "role": "Web Server", "os": "Ubuntu 22.04 LTS", "open_ports": [80, 443]},
    {"id": "asset_03", "hostname": "APP03.corp.local", "ip": "10.10.2.30", "role": "Application Server", "os": "Ubuntu 22.04 LTS", "open_ports": [8080, 22]},
    {"id": "asset_04", "hostname": "DB04.corp.local", "ip": "10.10.2.40", "role": "Database", "os": "Ubuntu 22.04 LTS", "open_ports": [5432]},
    {"id": "asset_05", "hostname": "FILE05.corp.local", "ip": "10.10.2.50", "role": "File Server", "os": "Windows Server 2019", "open_ports": [445, 139]},
]

SHARED_REQUIREMENTS = {
    "path": "requirements.txt",
    "content": [
        "fastapi>=0.110.0",
        "uvicorn>=0.29.0",
        "pydantic>=2.0.0",
        "requests>=2.31.0",
        "psycopg2-binary>=2.9.5",
        "sqlalchemy<2.0",
        "PyJWT>=2.8.0",
        "cryptography>=42.0.0",
    ],
}

GOALS = {
    "BRUTE_FORCE": "Investigate the high-frequency failed authentication burst from a single source and determine if the attacker eventually broke in.",
    "CRED_STUFFING": "Investigate the credential-stuffing pattern and determine which accounts may have been compromised by reused/leaked credentials.",
    "VPN_BRUTE": "Investigate failed VPN authentication attempts and determine if the perimeter has been breached.",
    "LATERAL_MOVEMENT": "Investigate the service-account pivoting across multiple internal hosts and identify the eventual blast radius.",
    "DATA_EXFILTRATION": "Investigate the bulk file access followed by a large outbound transfer and determine the scope of exfiltrated data.",
    "MALWARE_PERSISTENCE": "Investigate the suspicious script execution that established scheduled-task and registry-run-key persistence.",
    "C2_COMMUNICATION": "Investigate the periodic DNS beacon plus encrypted outbound traffic to a threat-actor ASN and identify the C2 infrastructure.",
    "WEB_SQL_INJECTION": "Investigate the SQL-injection payload in the search endpoint and determine if customer data was extracted.",
}

KNOWN_TRUTHS = {
    "BRUTE_FORCE": {
        "attack_type": "password_brute_force",
        "techniques": [
            {"id": "T1110.001", "name": "Password Brute Force"},
        ],
        "root_cause": "Login form has no rate limiting and no account-lockout policy on repeated failures",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Authentication endpoint exposed; account lockouts may have been triggered if attacker continued",
        "correct_immediate_actions": [
            "Block the offending source IP at the WAF",
            "Enforce a temporary account lockout after 5 failed attempts",
            "Force password reset for any account that successfully authenticated from the offending IP",
            "Add CAPTCHA or rate limiting to the /login endpoint",
            "Enable MFA on all user accounts",
        ],
    },
    "CRED_STUFFING": {
        "attack_type": "credential_stuffing",
        "techniques": [
            {"id": "T1110.004", "name": "Credential Stuffing"},
        ],
        "root_cause": "No detection for reused breached credentials; no IP/device velocity controls on /login",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Multiple breached credential pairs tested across accounts; one or more accounts may have been compromised",
        "correct_immediate_actions": [
            "Force password reset on any account where authentication recently succeeded from a new IP",
            "Block the source IPs at WAF",
            "Integrate HaveIBeenPwned (or equivalent) check on login",
            "Roll out MFA enforcement across all users",
            "Add anomaly alerting on credential-stuffing patterns (low success-per-IP, many usernames)",
        ],
    },
    "VPN_BRUTE": {
        "attack_type": "vpn_brute_force",
        "techniques": [
            {"id": "T1110.001", "name": "Password Brute Force"},
            {"id": "T1133", "name": "External Remote Services"},
        ],
        "root_cause": "VPN gateway exposed without MFA and no fail-closed lockout on repeated failures",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Perimeter VPN service under active password attack; risk of full network access if attacker succeeds",
        "correct_immediate_actions": [
            "Block the source IPs at the VPN gateway firewall",
            "Enforce MFA on all VPN accounts",
            "Lower the failed-attempt lockout threshold on the VPN concentrator",
            "Restrict VPN to allowlisted geographies where possible",
            "Audit recent successful VPN logins for anomalies",
        ],
    },
    "LATERAL_MOVEMENT": {
        "attack_type": "lateral_movement_via_smb_wmi",
        "techniques": [
            {"id": "T1021.002", "name": "SMB Lateral Movement"},
            {"id": "T1078", "name": "Valid Accounts"},
            {"id": "T1087", "name": "Account Discovery (LDAP)"},
        ],
        "root_cause": "Service account has interactive logon rights and is not restricted to its source host",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Multiple internal hosts (DC01, WEB02, APP03, DB04, FILE05) accessed via the same service account; risk of full domain compromise",
        "correct_immediate_actions": [
            "Disable the service account immediately",
            "Isolate the affected hosts from the network",
            "Force password reset for the service account",
            "Restrict service accounts to specific source hosts via Logon Workstations",
            "Hunt for any persistence dropped on the pivoted hosts",
        ],
    },
    "DATA_EXFILTRATION": {
        "attack_type": "data_exfiltration_via_https",
        "techniques": [
            {"id": "T1041", "name": "Exfiltration Over C2 Channel"},
            {"id": "T1530", "name": "Data from Information Repositories"},
        ],
        "root_cause": "No DLP on the workstation; user could bulk-stage and upload sensitive files unchecked",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Sensitive documents (HR, Finance, customer data) uploaded to an external IP",
        "correct_immediate_actions": [
            "Block the external destination IP at the firewall",
            "Suspend the user account associated with the bulk access",
            "Image the workstation for forensic review",
            "Audit which files were opened/staged in the burst window",
            "Roll out DLP that blocks large outbound HTTPS uploads to non-allowlisted destinations",
        ],
    },
    "MALWARE_PERSISTENCE": {
        "attack_type": "malware_persistence_via_powershell_dropper",
        "techniques": [
            {"id": "T1059.001", "name": "PowerShell Execution"},
            {"id": "T1053.005", "name": "Scheduled Task Persistence"},
            {"id": "T1547.001", "name": "Registry Run Key Persistence"},
        ],
        "root_cause": "User executed a script that spawned an encoded PowerShell payload; no AV/EDR blocked the chain",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Workstation backdoored with scheduled-task and registry-run-key persistence; payload pulled from external IP",
        "correct_immediate_actions": [
            "Isolate the affected workstation",
            "Kill scheduled task 'WindowsUpdateHelper'",
            "Remove HKCU\\...\\CurrentVersion\\Run\\\"updater\" registry value",
            "Delete the dropped binary (e.g., C:\\ProgramData\\svchost_update.exe)",
            "Block the staging IP at the firewall",
            "Push EDR rules blocking encoded PowerShell from non-IT processes",
        ],
    },
    "C2_COMMUNICATION": {
        "attack_type": "c2_dns_beacon_https",
        "techniques": [
            {"id": "T1071.001", "name": "C2 over HTTPS"},
            {"id": "T1071.004", "name": "Application Layer Protocol: DNS"},
        ],
        "root_cause": "No egress filtering, no DNS sinkholing, and no detection of periodic beaconing patterns",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Compromised host beaconing to threat-actor infrastructure; ongoing exfiltration possible",
        "correct_immediate_actions": [
            "Sinkhole the C2 domain at the DNS resolver",
            "Block the destination IP at the egress firewall",
            "Isolate the beaconing host",
            "Hunt for additional hosts contacting the same domain/IP",
            "Image the host for memory forensics to identify the implant",
            "Push detection rules for periodic small-payload outbound traffic",
        ],
    },
    "WEB_SQL_INJECTION": {
        "attack_type": "sql_injection_data_exfil",
        "techniques": [
            {"id": "T1190", "name": "Exploit Public-Facing Application"},
            {"id": "T1213", "name": "Data from Information Repositories"},
        ],
        "root_cause": "/api/search endpoint concatenates user input into SQL without parameterization",
        "iocs": {"ips": [], "domains": []},
        "blast_radius": "Database rows extracted via UNION SELECT; user, session, and api_key tables likely exposed",
        "correct_immediate_actions": [
            "Block the source IP at the WAF",
            "Take the vulnerable /api/search endpoint offline pending fix",
            "Force password reset for all users; rotate all API keys",
            "Patch the endpoint to use parameterized queries / ORM",
            "Enable WAF SQLi rule sets and DB query auditing",
            "Notify affected customers per breach policy",
        ],
    },
}


def get_ground_truth(trigger_type: str) -> dict:
    return KNOWN_TRUTHS.get(trigger_type, KNOWN_TRUTHS["BRUTE_FORCE"])


def get_goal(trigger_type: str) -> str:
    return GOALS.get(trigger_type, "Investigate the security incident and respond.")


def get_assets() -> list:
    return SHARED_ASSETS


def get_requirements() -> dict:
    return SHARED_REQUIREMENTS

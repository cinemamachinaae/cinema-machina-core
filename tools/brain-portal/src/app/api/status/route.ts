import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { repoPath } from "@/lib/paths";
import { safeExecFile } from "@/lib/safe-exec";
import type { BrainPortalStatus, DocsQuality, GeminiStatus, GraphifyFreshness, MediaLibraryStatus, OllamaStatus, ToolReadiness } from "@/lib/types";

const OLLAMA_DEFAULT_MODEL = "qwen2.5-coder:7b";

// Global cache to prevent inference blocking on frequent polls
let cachedOllamaStatus: OllamaStatus | null = null;
let lastOllamaCheckTime = 0;
let isOllamaChecking = false;

function nowIso(): string {
  return new Date().toISOString();
}

function levelFromAvailability(available: boolean): "ok" | "unknown" {
  return available ? "ok" : "unknown";
}

async function fileSizeBytes(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return 0;
    return stat.size;
  } catch {
    return 0;
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readSummary(relativePath: string, maxLines = 10): Promise<string[]> {
  try {
    const text = await fs.readFile(repoPath(relativePath), "utf-8");
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("[["))
      .slice(0, maxLines);
  } catch {
    return [];
  }
}

async function fileMtimeIso(relativePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(repoPath(relativePath));
    return stat.isFile() ? stat.mtime.toISOString() : null;
  } catch {
    return null;
  }
}

async function getGitStatus(): Promise<BrainPortalStatus["git"]> {
  const root = repoPath();

  const [headSha, branch, committedAt, porcelain, recent] = await Promise.all([
    safeExecFile("git", ["rev-parse", "HEAD"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["branch", "--show-current"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["show", "-s", "--format=%cI", "HEAD"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["status", "--porcelain=v1"], { cwd: root, timeoutMs: 2000 }),
    safeExecFile("git", ["log", "--oneline", "-n", "5"], { cwd: root, timeoutMs: 1500 }),
  ]);

  const sha = (headSha.stdout || "").trim();
  const shortSha = sha ? sha.slice(0, 7) : "unknown";
  const branchName = (branch.stdout || "").trim() || null;
  const committedAtIso = (committedAt.stdout || "").trim() || null;
  const changedLines = (porcelain.stdout || "").split("\n").filter((l) => l.trim().length > 0);
  const dirtySummary = changedLines.reduce(
    (summary, line) => {
      const status = line.slice(0, 2);
      const file = line.slice(3).trim();
      if (status === "??") summary.untracked += 1;
      else {
        if (status[0] && status[0] !== " ") summary.staged += 1;
        if (status[1] && status[1] !== " ") summary.unstaged += 1;
      }
      if (file && summary.preview.length < 8) summary.preview.push(file);
      return summary;
    },
    { staged: 0, unstaged: 0, untracked: 0, preview: [] as string[] },
  );
  const recentCommits = (recent.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [commitSha, ...subjectParts] = line.split(" ");
      return { sha: commitSha, subject: subjectParts.join(" ") };
    });

  return {
    head: { sha: sha || "unknown", shortSha, branch: branchName, committedAtIso },
    dirty: changedLines.length > 0,
    changedFiles: changedLines.length,
    dirtySummary,
    recentCommits,
  };
}

async function getGraphifyFreshness(headSha: string): Promise<GraphifyFreshness> {
  const reportPath = repoPath("graphify-out", "GRAPH_REPORT.md");
  const graphJsonPath = repoPath("graphify-out", "graph.json");

  const reportBytes = await fileSizeBytes(reportPath);
  const graphBytes = await fileSizeBytes(graphJsonPath);

  let builtFromCommit: string | null = null;
  if (reportBytes > 0) {
    try {
      const text = await fs.readFile(reportPath, "utf-8");
      const match = text.match(/Built from commit:\s*`([0-9a-f]{7,40})`/i);
      builtFromCommit = match?.[1] ?? null;
    } catch {
      builtFromCommit = null;
    }
  }

  const normalizedHead = (headSha || "").trim();
  const normalizedBuilt = (builtFromCommit || "").trim();

  let matchesHead: boolean | null = null;
  if (normalizedHead && normalizedBuilt) {
    matchesHead = normalizedHead.startsWith(normalizedBuilt) || normalizedBuilt.startsWith(normalizedHead);

    if (matchesHead === false) {
      const root = repoPath();
      const changed = await safeExecFile(
        "git",
        ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
        { cwd: root, timeoutMs: 1500 },
      );
      const files = (changed.stdout || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const generatedGraphArtifacts = new Set([
        "tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md",
      ]);
      const headOnlyGraphifyOut =
        files.length > 0 &&
        files.every((file) => file.startsWith("graphify-out/") || generatedGraphArtifacts.has(file));

      if (headOnlyGraphifyOut) {
        const parent = await safeExecFile("git", ["rev-parse", "HEAD^"], { cwd: root, timeoutMs: 1500 });
        const parentSha = (parent.stdout || "").trim();
        if (parentSha && (parentSha.startsWith(normalizedBuilt) || normalizedBuilt.startsWith(parentSha))) {
          matchesHead = true;
        }
      }
    }
  }

  return {
    graphReportPresent: reportBytes > 0,
    graphJsonPresent: graphBytes > 0,
    builtFromCommit,
    matchesHead,
    reportSummary: await readSummary("graphify-out/GRAPH_REPORT.md", 8),
    agentIndexSummary: await readSummary("graphify-out/AGENT_GRAPH_INDEX.md", 8),
  };
}

async function getDocsQuality(): Promise<DocsQuality> {
  const required = [
    "docs/ai/BRAIN_STACK.md",
    "docs/ai/TOOLCHAIN_ROUTING.md",
    "docs/ai/PROJECT_STATE.md",
    "docs/ai/TASK_LOG.md",
    "docs/ai/DECISIONS.md",
    "docs/ai/KNOWN_ISSUES.md",
    "docs/ai/ENVIRONMENT_MAP.md",
    "docs/ai/SERVER_AND_DEVICE_CONTEXT.md",
    "docs/ai/API_AND_INTEGRATIONS.md",
    "docs/ai/ARCHITECTURE_OVERVIEW.md",
    "docs/ai/PRODUCT_AND_BRAND_CONTEXT.md",
  ];

  const entries = await Promise.all(
    required.map(async (relativePath) => {
      const full = repoPath(relativePath);
      const bytes = await fileSizeBytes(full);
      const ok = bytes > 0;
      return { path: relativePath, ok, bytes };
    }),
  );

  return { requiredDocs: entries, ok: entries.every((e) => e.ok) };
}

async function which(cmd: string): Promise<boolean> {
  const res = await safeExecFile("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`], {
    cwd: repoPath(),
    timeoutMs: 800,
  });
  return res.ok;
}

// Background deep probe for Ollama to prevent 2.5s blocking polls
async function runOllamaDeepCheck(): Promise<OllamaStatus> {
  const available = await which("ollama");
  if (!available) {
    return {
      available: false,
      running: null,
      modelPresent: null,
      model: OLLAMA_DEFAULT_MODEL,
      level: "unknown",
      detail: "Missing: Ollama not found on PATH",
    };
  }

  // Fast check for daemon reachability and models
  let running = false;
  let modelPresent = false;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1000);
    const res = await fetch("http://127.0.0.1:11434/api/tags", { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      running = true;
      const data = await res.json();
      modelPresent = data.models?.some((m: any) => m.name.toLowerCase().includes(OLLAMA_DEFAULT_MODEL.toLowerCase())) || false;
    }
  } catch {
    running = false;
  }

  if (!running) {
    return {
      available: true,
      running: false,
      modelPresent: null,
      model: OLLAMA_DEFAULT_MODEL,
      level: "warn",
      detail: "Detected: Ollama daemon unreachable on port 11434",
    };
  }

  if (!modelPresent) {
    return {
      available: true,
      running: true,
      modelPresent: false,
      model: OLLAMA_DEFAULT_MODEL,
      level: "warn",
      detail: `Detected: Model ${OLLAMA_DEFAULT_MODEL} not pulled`,
    };
  }

  // Deep inference probe
  let callable = false;
  let latencyMs = 0;
  try {
    const start = Date.now();
    const controller = new AbortController();
    // Allow up to 10s for inference probe (since it's cached)
    const id = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_DEFAULT_MODEL,
        prompt: "Return the word 'OK' strictly.",
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(id);
    latencyMs = Date.now() - start;
    if (res.ok) {
      callable = true;
    }
  } catch {
    callable = false;
  }

  return {
    available: true,
    running: true,
    modelPresent: true,
    model: OLLAMA_DEFAULT_MODEL,
    level: callable ? "ok" : "warn",
    detail: callable 
      ? `Configured: Model callable (${latencyMs}ms latency)` 
      : "Detected: Model present but failed inference (timeout/OOM)",
  };
}

async function getOllamaStatus(): Promise<OllamaStatus> {
  const now = Date.now();
  // Return cached result if within 60s, or trigger background update
  if (cachedOllamaStatus && (now - lastOllamaCheckTime < 60000)) {
    return cachedOllamaStatus;
  }
  
  if (!isOllamaChecking) {
    isOllamaChecking = true;
    runOllamaDeepCheck().then(res => {
      cachedOllamaStatus = res;
      lastOllamaCheckTime = Date.now();
      isOllamaChecking = false;
    }).catch(() => {
      isOllamaChecking = false;
    });
  }

  return cachedOllamaStatus || {
    available: true,
    running: null,
    modelPresent: null,
    model: OLLAMA_DEFAULT_MODEL,
    level: "unknown",
    detail: "Probing Ollama inference...",
  };
}

async function getCodexHooksStatus(): Promise<ToolReadiness> {
  const hookPath = repoPath(".codex", "hooks.json");
  const bytes = await fileSizeBytes(hookPath);
  if (bytes === 0) {
    return { available: false, level: "unknown", detail: ".codex/hooks.json missing" };
  }
  try {
    const text = await fs.readFile(hookPath, "utf-8");
    const hasGraphifyHook = /graphify\s+hook-check/i.test(text);
    return {
      available: true,
      level: hasGraphifyHook ? "ok" : "warn",
      detail: hasGraphifyHook ? "Configured and active at .codex/hooks.json" : "Hooks present, but Graphify missing",
      hookPath: ".codex/hooks.json",
    };
  } catch {
    return { available: true, level: "warn", detail: "hooks.json unreadable" };
  }
}

async function getAntigravityStatus(): Promise<ToolReadiness> {
  const agentsDir = await dirExists(repoPath(".agents"));
  const skillsLock = await fileSizeBytes(repoPath("skills-lock.json"));
  
  if (agentsDir || skillsLock > 0) {
    return {
      available: true,
      level: "ok",
      detail: "Antigravity .agents workspace and skills detected",
      workspace: agentsDir ? ".agents" : null,
      skillsLock: skillsLock > 0 ? "skills-lock.json" : null,
    };
  }
  return { available: false, level: "unknown", detail: "No Antigravity footprints detected" };
}

async function getOmegaStatus(): Promise<ToolReadiness> {
  const omxDir = await dirExists(repoPath(".omx"));
  if (omxDir) {
    return {
      available: true,
      level: "ok",
      detail: "OMEGA .omx memory layer detected",
    };
  }
  return { available: false, level: "unknown", detail: "Not configured / optional: no repo-level OMEGA adapter detected" };
}

async function getClaudeCodeStatus(): Promise<ToolReadiness> {
  // Truthful check: Is there a real agent handoff protocol documented?
  const handoffProtocol = await fileSizeBytes(repoPath("docs/AGENT_HANDOFF.md"));
  const contextPack = await fileSizeBytes(repoPath("tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md"));
  
  if (handoffProtocol > 0 && contextPack > 0) {
    return {
      available: true,
      level: "ok",
      detail: "Configured: Handoff protocol and context pack active",
    };
  } else if (handoffProtocol > 0) {
    return {
      available: true,
      level: "warn",
      detail: "Detected: Handoff protocol present, but no context pack yet",
    };
  }
  return { available: false, level: "unknown", detail: "Missing: No handoff protocol found" };
}

async function probeHttp(url: string): Promise<{ok: boolean, status?: number}> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 700);
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false };
  }
}

async function getLangflowStatus(): Promise<ToolReadiness> {
  const adapterPath = repoPath("backend", "langflow_adapter.py");
  const adapterSize = await fileSizeBytes(adapterPath);
  
  if (adapterSize === 0) {
    return { available: false, level: "warn", detail: "No adapter wired - missing backend/langflow_adapter.py" };
  }

  try {
    const result = await safeExecFile("python3", [adapterPath], { cwd: repoPath(), timeoutMs: 5000 });
    if (!result.ok) {
      return { available: true, level: "error", detail: "Adapter execution failed", status: "adapter_failed" };
    }
    const health = JSON.parse(result.stdout.trim());
    return {
      available: true,
      ...health,
    };
  } catch (err) {
    return { available: true, level: "error", detail: "Adapter execution failed", status: "adapter_failed" };
  }
}

async function getRuFloStatus(): Promise<ToolReadiness> {
  const adapterPath = repoPath("backend", "ruflo_adapter.py");
  const adapterSize = await fileSizeBytes(adapterPath);
  
  if (adapterSize === 0) {
    return { available: false, level: "warn", detail: "No adapter wired - missing backend/ruflo_adapter.py" };
  }

  try {
    const result = await safeExecFile("python3", [adapterPath], { cwd: repoPath(), timeoutMs: 5000 });
    if (!result.ok) {
      return { available: true, level: "error", detail: "Adapter execution failed", status: "adapter_failed" };
    }
    const health = JSON.parse(result.stdout.trim());
    return {
      available: true,
      ...health,
    };
  } catch (err) {
    return { available: true, level: "error", detail: "Adapter execution failed", status: "adapter_failed" };
  }
}

async function getGeminiStatus(): Promise<GeminiStatus> {
  try {
    const keyPresent = Boolean(process.env.GEMINI_API_KEY);
    const cliPresent = await which("gemini");
    return {
      status: keyPresent ? "configured" : "missing",
      level: keyPresent ? "ok" : "unknown",
      detail: keyPresent
        ? `Configured: GEMINI_API_KEY is present; gemini CLI ${cliPresent ? "detected" : "not detected"}`
        : "Missing: GEMINI_API_KEY not present. Gemini is optional for long-context audits.",
      keyPresent,
      cliPresent,
    };
  } catch {
    return {
      status: "error",
      level: "error",
      detail: "Gemini presence check failed without reading secrets",
      keyPresent: false,
      cliPresent: false,
    };
  }
}

async function getReportsStatus() {
  const graphReportSummary = await readSummary("graphify-out/GRAPH_REPORT.md", 8);
  const agentIndexSummary = await readSummary("graphify-out/AGENT_GRAPH_INDEX.md", 8);
  const contextPackMtime = await fileMtimeIso("tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md");
  const graphReportMtime = await fileMtimeIso("graphify-out/GRAPH_REPORT.md");

  return {
    graphReport: {
      present: graphReportSummary.length > 0,
      path: "graphify-out/GRAPH_REPORT.md",
      summary: graphReportSummary,
    },
    agentIndex: {
      present: agentIndexSummary.length > 0,
      path: "graphify-out/AGENT_GRAPH_INDEX.md",
      summary: agentIndexSummary,
    },
    brainCheck: {
      present: (await fileSizeBytes(repoPath("scripts/cm-brain-check.sh"))) > 0,
      command: "scripts/cm-brain-check.sh",
      detail: "Run on demand for local Brain readiness; not executed inside /api/status.",
    },
    graphRefresh: {
      present: (await fileSizeBytes(repoPath("scripts/cm-graph-refresh.sh"))) > 0,
      command: "scripts/cm-graph-refresh.sh",
      detail: graphReportMtime ? `Latest graph report mtime ${graphReportMtime}` : "Graph report timestamp unavailable",
    },
    agentContextRefresh: {
      present: (await fileSizeBytes(repoPath("scripts/cm-agent-context-refresh.sh"))) > 0,
      command: "scripts/cm-agent-context-refresh.sh",
      detail: contextPackMtime ? `Latest context pack mtime ${contextPackMtime}` : "Context pack timestamp unavailable",
    },
  };
}

async function getMediaLibraryStatus(): Promise<MediaLibraryStatus> {
  return {
    plex: {
      available: false,
      level: "unknown",
      status: "not_configured",
      detail: "Placeholder: Plex adapter belongs to Cinema Machina Core playback monitoring, not Brain Portal orchestration.",
    },
    jellyfin: {
      available: false,
      level: "unknown",
      status: "not_configured",
      detail: "Placeholder: Jellyfin status exists in Core, but Brain Portal has no library adapter wired.",
    },
    movieLibrary: {
      available: false,
      level: "unknown",
      status: "unknown",
      detail: "Placeholder: no movie-library health feed is wired into the Brain Portal yet.",
    },
  };
}

export async function GET() {
  const gitPromise = getGitStatus();
  const docsPromise = getDocsQuality();
  const ollamaPromise = getOllamaStatus();
  const geminiPromise = getGeminiStatus();
  const reportsPromise = getReportsStatus();
  const mediaLibraryPromise = getMediaLibraryStatus();
  const langflowPromise = getLangflowStatus();
  const rufloPromise = getRuFloStatus();
  const codexHooksPromise = getCodexHooksStatus();
  const antigravityPromise = getAntigravityStatus();
  const omegaPromise = getOmegaStatus();
  const claudeCodePromise = getClaudeCodeStatus();

  // Graphify depends on git head
  const git = await gitPromise;
  const graphify = await getGraphifyFreshness(git.head.sha);

  const [
    docs, ollama, gemini, reports, mediaLibrary, langflow, ruflo, codexHooks, antigravity, omega, claudeCode
  ] = await Promise.all([
    docsPromise, ollamaPromise, geminiPromise, reportsPromise, mediaLibraryPromise, langflowPromise, rufloPromise, codexHooksPromise, antigravityPromise, omegaPromise, claudeCodePromise
  ]);

  const status: BrainPortalStatus & { antigravity: ToolReadiness, claudeCode: ToolReadiness } = {
    timestampIso: nowIso(),
    git,
    graphify,
    docs,
    reports,
    ollama,
    gemini,
    omega,
    langflow,
    ruflo,
    codexHooks,
    antigravity,
    claudeCode,
    mediaLibrary
  };

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

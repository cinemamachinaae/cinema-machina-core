import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/paths";
import { safeExecFile } from "@/lib/safe-exec";
import type { BrainPortalStatus, DocsQuality, GraphifyFreshness, OllamaStatus, ToolReadiness } from "@/lib/types";

const OLLAMA_DEFAULT_MODEL = "qwen2.5-coder:7b";

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

async function getGitStatus(): Promise<BrainPortalStatus["git"]> {
  const root = repoPath();

  const [headSha, branch, committedAt, porcelain] = await Promise.all([
    safeExecFile("git", ["rev-parse", "HEAD"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["branch", "--show-current"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["show", "-s", "--format=%cI", "HEAD"], { cwd: root, timeoutMs: 1500 }),
    safeExecFile("git", ["status", "--porcelain=v1"], { cwd: root, timeoutMs: 2000 }),
  ]);

  const sha = (headSha.stdout || "").trim();
  const shortSha = sha ? sha.slice(0, 7) : "unknown";
  const branchName = (branch.stdout || "").trim() || null;
  const committedAtIso = (committedAt.stdout || "").trim() || null;
  const changedLines = (porcelain.stdout || "").split("\n").filter((l) => l.trim().length > 0);

  return {
    head: { sha: sha || "unknown", shortSha, branch: branchName, committedAtIso },
    dirty: changedLines.length > 0,
    changedFiles: changedLines.length,
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
  }

  return {
    graphReportPresent: reportBytes > 0,
    graphJsonPresent: graphBytes > 0,
    builtFromCommit,
    matchesHead,
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

async function getOllamaStatus(): Promise<OllamaStatus> {
  const available = await which("ollama");
  if (!available) {
    return {
      available: false,
      running: null,
      modelPresent: null,
      model: OLLAMA_DEFAULT_MODEL,
      level: "unknown",
      detail: "ollama not found on PATH",
    };
  }

  const list = await safeExecFile("ollama", ["list"], { cwd: repoPath(), timeoutMs: 1500 });
  const modelsText = (list.stdout || "").trim();
  const modelPresent = modelsText.toLowerCase().includes(OLLAMA_DEFAULT_MODEL.toLowerCase());

  // If `ollama list` succeeds, we treat the daemon as reachable.
  const running = list.ok;

  return {
    available: true,
    running,
    modelPresent,
    model: OLLAMA_DEFAULT_MODEL,
    level: running ? (modelPresent ? "ok" : "warn") : "warn",
    detail: running
      ? modelPresent
        ? "ollama running; model present"
        : "ollama running; model not pulled"
      : "ollama installed; daemon unreachable",
  };
}

async function getCodexHooksStatus(): Promise<ToolReadiness> {
  const hookPath = repoPath(".codex", "hooks.json");
  const bytes = await fileSizeBytes(hookPath);
  if (bytes === 0) {
    return { available: false, level: "unknown", detail: ".codex/hooks.json not found" };
  }

  try {
    const text = await fs.readFile(hookPath, "utf-8");
    const hasGraphifyHook = /graphify\s+hook-check/i.test(text);
    return {
      available: true,
      level: hasGraphifyHook ? "ok" : "warn",
      detail: hasGraphifyHook ? "graphify hook-check configured" : "hooks present; graphify hook-check not detected",
    };
  } catch {
    return { available: true, level: "warn", detail: "hooks.json present but unreadable" };
  }
}

async function getToolReadiness(label: string, command: string, extraDetail?: string): Promise<ToolReadiness> {
  const available = await which(command);
  return {
    available,
    level: levelFromAvailability(available),
    detail: available ? `${label} available` : `${label} not found on PATH${extraDetail ? ` (${extraDetail})` : ""}`,
  };
}

async function probeHttp(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 700);
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return response.status > 0;
  } catch {
    return false;
  }
}

async function getLangflowStatus(): Promise<ToolReadiness> {
  // Common local Langflow defaults (user can run elsewhere; this is best-effort).
  const candidates = ["http://127.0.0.1:7860", "http://127.0.0.1:7861"];
  for (const base of candidates) {
    // A 404 still means "reachable".
    // We avoid reading any content; just check if the port responds.
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeHttp(base);
    if (ok) {
      return { available: true, level: "ok", detail: `reachable at ${base}` };
    }
  }
  return { available: false, level: "unknown", detail: "not reachable on :7860 or :7861" };
}

export async function GET() {
  const git = await getGitStatus();
  const graphify = await getGraphifyFreshness(git.head.sha);
  const docs = await getDocsQuality();
  const ollama = await getOllamaStatus();

  // OMEGA status: only surface what is safely instrumentable inside the repo.
  // We do not assume a configured MCP bridge here.
  const omega: ToolReadiness = { available: false, level: "unknown", detail: "no repo-level OMEGA adapter configured" };

  const langflow = await getLangflowStatus();
  const ruflo = await getToolReadiness("RuFlo", "ruflo");
  const codexHooks = await getCodexHooksStatus();

  const status: BrainPortalStatus = {
    timestampIso: nowIso(),
    git,
    graphify,
    docs,
    ollama,
    omega,
    langflow,
    ruflo,
    codexHooks,
  };

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

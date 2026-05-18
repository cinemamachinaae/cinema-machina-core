import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const GRAPH_PATH = path.join(REPO_ROOT, "graphify-out", "graph.json");
const OUT_COMMUNITIES = path.join(REPO_ROOT, "graphify-out", "orb-community-summaries.json");
const OUT_NODES = path.join(REPO_ROOT, "graphify-out", "orb-node-summaries.json");

const DEFAULT_MODEL = process.env.CM_OLLAMA_MODEL || "qwen2.5-coder:7b";
const MAX_COMMUNITIES = Number(process.env.CM_COMMUNITY_LIMIT || 24);
const MAX_TOP_NODES = Number(process.env.CM_NODE_LIMIT || 40);

function nowIso() {
  return new Date().toISOString();
}

function run(cmd, args, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, stdout, stderr: `${stderr}\n(timeout after ${timeoutMs}ms)` });
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

async function ensureOllamaAvailable() {
  const which = await run("bash", ["-lc", "command -v ollama >/dev/null 2>&1"]);
  if (!which.ok) {
    throw new Error("ollama not found on PATH");
  }
}

function computeDegrees(links) {
  const degree = new Map();
  for (const link of links) {
    const s = typeof link.source === "object" ? link.source.id : link.source;
    const t = typeof link.target === "object" ? link.target.id : link.target;
    if (s) degree.set(s, (degree.get(s) || 0) + 1);
    if (t) degree.set(t, (degree.get(t) || 0) + 1);
  }
  return degree;
}

function summarizeNodeForPrompt(node, degree) {
  const label = node.label || node.id;
  const type = node.type || "node";
  const community = node.community ?? "—";
  const source = node.source || "—";
  const importance = node.val ?? 0;
  const connections = degree.get(node.id) || 0;
  return `- ${label} (type=${type}, community=${community}, importance=${importance}, connections=${connections}, source=${source})`;
}

async function ollamaSummarize(prompt) {
  const res = await run("ollama", ["run", DEFAULT_MODEL, prompt], { timeoutMs: 120_000 });
  if (!res.ok) {
    throw new Error(`ollama run failed: ${res.stderr.trim() || "unknown error"}`);
  }
  return res.stdout.trim();
}

async function main() {
  await ensureOllamaAvailable();

  const raw = await fs.readFile(GRAPH_PATH, "utf-8");
  const graph = JSON.parse(raw);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const links = Array.isArray(graph.links) ? graph.links : [];

  const degree = computeDegrees(links);

  // Communities by node count.
  const communityBuckets = new Map();
  for (const node of nodes) {
    const key = String(node.community ?? "—");
    if (!communityBuckets.has(key)) communityBuckets.set(key, []);
    communityBuckets.get(key).push(node);
  }

  const topCommunities = Array.from(communityBuckets.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_COMMUNITIES);

  const communitySummaries = {};
  for (const [communityKey, bucket] of topCommunities) {
    const top = bucket
      .slice()
      .sort((a, b) => (b.val || 0) - (a.val || 0))
      .slice(0, 12);

    const context = top.map((n) => summarizeNodeForPrompt(n, degree)).join("\n");
    const prompt = [
      "You are helping summarize a repository knowledge graph community for an internal engineering dashboard.",
      "Write a premium, concise summary (3-6 sentences). No hype, no emojis, no marketing.",
      "Focus on: what this community represents, how to navigate it, and what risks/notes exist.",
      `Community: ${communityKey}`,
      "Top nodes:",
      context,
    ].join("\n");

    // eslint-disable-next-line no-await-in-loop
    const summary = await ollamaSummarize(prompt);
    communitySummaries[communityKey] = summary;
    // Light pacing to avoid overloading local models.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 250));
  }

  const topNodes = nodes
    .slice()
    .sort((a, b) => {
      const bv = b.val || 0;
      const av = a.val || 0;
      if (bv !== av) return bv - av;
      return (degree.get(b.id) || 0) - (degree.get(a.id) || 0);
    })
    .slice(0, MAX_TOP_NODES);

  const nodeSummaries = {};
  for (const node of topNodes) {
    const neighbors = [];
    for (const link of links) {
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      if (s === node.id) neighbors.push(t);
      if (t === node.id) neighbors.push(s);
    }
    const neighborList = neighbors.slice(0, 14).map((id) => {
      const n = nodes.find((x) => x.id === id);
      return n ? `${n.label || n.id} (${n.type || "node"})` : String(id);
    });

    const prompt = [
      "You are summarizing a knowledge graph node for an internal engineering dashboard.",
      "Write a concise summary (2-5 sentences) of what this node is and why it matters as a navigation waypoint.",
      "Do not invent facts; only infer from the provided metadata.",
      `Node: ${node.label || node.id}`,
      `Type: ${node.type || "node"}`,
      `Community: ${String(node.community ?? "—")}`,
      `Source/path: ${node.source || "—"}`,
      `Importance: ${String(node.val ?? 0)}`,
      `Connections: ${String(degree.get(node.id) || 0)}`,
      `Nearby: ${neighborList.join(", ") || "—"}`,
    ].join("\n");

    // eslint-disable-next-line no-await-in-loop
    const summary = await ollamaSummarize(prompt);
    nodeSummaries[node.id] = summary;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 180));
  }

  const envelopeBase = { generated_at_iso: nowIso(), model: DEFAULT_MODEL };
  await fs.writeFile(
    OUT_COMMUNITIES,
    JSON.stringify({ ...envelopeBase, summaries: communitySummaries }, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    OUT_NODES,
    JSON.stringify({ ...envelopeBase, summaries: nodeSummaries }, null, 2),
    "utf-8",
  );

  process.stdout.write(`Wrote:\n- ${OUT_COMMUNITIES}\n- ${OUT_NODES}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || String(err)}\n`);
  process.exit(1);
});


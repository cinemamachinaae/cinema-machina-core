"use client";

import { PinOff, ShieldAlert, Sparkles, Workflow } from "lucide-react";

import { Panel } from "@/components/panel";
import type { BrainPortalNode, BrainPortalStatus, InspectorDetail, OrbSummaries } from "@/lib/types";

function pillClass(level: "ok" | "warn" | "unknown" | "error") {
  switch (level) {
    case "ok":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
    case "warn":
      return "border-amber-300/25 bg-amber-300/10 text-amber-300";
    case "error":
      return "border-rose-400/25 bg-rose-400/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-white/50";
  }
}

function statusLabel(level: string | undefined): string {
  switch (level) {
    case "ok": return "Integrated";
    case "warn": return "Detected";
    case "error": return "Error";
    default: return "Not Found";
  }
}

function statusDot(level: string | undefined) {
  const color = level === "ok"
    ? "bg-emerald-400"
    : level === "warn"
      ? "bg-amber-400"
      : level === "error"
        ? "bg-rose-400"
        : "bg-white/25";

  return (
    <span className={[
      "inline-block h-2 w-2 rounded-full",
      color,
      level === "ok" ? "animate-status-glow text-emerald-400" : "",
    ].join(" ")} />
  );
}

function getNodeKey(node: BrainPortalNode): string {
  return String(node.id || "");
}

export function RightInspector(props: {
  status: BrainPortalStatus | null;
  graphMeta: { nodes: number; links: number; communities: number } | null;
  detail: InspectorDetail | null;
  node: BrainPortalNode | null;
  pinnedNode: BrainPortalNode | null;
  summaries: OrbSummaries | null;
  onDetailSelect: (id: string) => void;
  onUnpin: () => void;
  glow?: "cyan" | "green" | "amber" | "rose" | "blue" | null;
}) {
  const freshness = props.status?.graphify;
  const git = props.status?.git;

  const nodeSummary = props.node
    ? props.summaries?.nodeSummaries?.[getNodeKey(props.node)] ?? null
    : null;

  const communityKey = props.node?.macroSectionId != null ? String(props.node.macroSectionId) : null;
  const communitySummary =
    communityKey && props.summaries?.communitySummaries
      ? props.summaries.communitySummaries[communityKey] ?? null
      : null;

  const hasPinned = Boolean(props.pinnedNode);

  return (
    <Panel title="Intelligence Inspector" className="space-y-3 max-h-[calc(100dvh-32px)] overflow-y-auto" glow={props.glow}>
      {props.detail ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-white/95">{props.detail.title}</div>
              <div className="mt-1">
                <span className={["inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]", pillClass(props.detail.level)].join(" ")}>
                  {statusDot(props.detail.level)}
                  {statusLabel(props.detail.level)}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 text-[11px] leading-relaxed text-white/65">
            {props.detail.summary}
          </div>
          {props.detail.rows.length ? (
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">Details</div>
              <div className="mt-2 space-y-1.5">
                {props.detail.rows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="grid grid-cols-[96px_1fr] gap-2 text-[10px]">
                    <span className="text-white/38">{row.label}</span>
                    <span className="break-words font-mono text-white/68">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {props.detail.actions?.length ? (
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">Suggested Action</div>
              <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-white/55">
                {props.detail.actions.map((action) => <li key={action}>• {action}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : !props.node ? (
        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-white/90">System Overview</div>

          {/* Graph + Docs cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-1">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">
                Graph Integrity
              </div>
              <div className="mt-2 text-[11px] text-white/70">
                {freshness?.builtFromCommit ? (
                  <>
                    built from <span className="font-mono text-white/80">{freshness.builtFromCommit.slice(0, 7)}</span>
                  </>
                ) : (
                  "graph report missing"
                )}
              </div>
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]",
                    pillClass(
                      freshness?.matchesHead === true ? "ok" : freshness?.matchesHead === false ? "warn" : "unknown",
                    ),
                  ].join(" ")}
                >
                  {statusDot(freshness?.matchesHead === true ? "ok" : freshness?.matchesHead === false ? "warn" : undefined)}
                  {freshness?.matchesHead === true
                    ? "synchronized"
                    : freshness?.matchesHead === false
                      ? "drift detected"
                      : "unknown"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-2">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">
                Documentation
              </div>
              <div className="mt-2 text-[11px] text-white/70">
                {props.status?.docs ? (
                  <>
                    {props.status.docs.requiredDocs.filter((d) => d.ok).length}/
                    {props.status.docs.requiredDocs.length} required
                  </>
                ) : (
                  "unknown"
                )}
              </div>
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]",
                    pillClass(props.status?.docs?.ok ? "ok" : "warn"),
                  ].join(" ")}
                >
                  {statusDot(props.status?.docs?.ok ? "ok" : "warn")}
                  {props.status?.docs?.ok ? "complete" : "incomplete"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-3">
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-white/45">
                <Sparkles size={12} />
                AI Enrichment
              </div>
              <div className="mt-2 text-[11px] text-white/65 leading-relaxed">
                {props.summaries?.nodeSummaries || props.summaries?.communitySummaries ? (
                  <>
                    sidecars loaded{" "}
                    {props.summaries.model ? (
                      <span className="text-white/40 font-mono text-[10px]">{props.summaries.model}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-white/40">no sidecars found</span>
                )}
              </div>
            </div>

            {/* Timestamp card */}
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-4">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">
                Last Probe
              </div>
              <div className="mt-2 text-[11px] text-white/65 font-mono tabular-nums">
                {props.status?.timestampIso
                  ? new Date(props.status.timestampIso).toLocaleTimeString()
                  : "—"}
              </div>
            </div>
          </div>

          {/* Toolchain Readiness - full width */}
          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-5">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-white/45 mb-3">
              <Workflow size={12} />
              Toolchain Readiness
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Ollama / Qwen", id: "ollama", status: props.status?.ollama },
                { name: "Langflow", id: "langflow", status: props.status?.langflow },
                { name: "RuFlo", id: "ruflo", status: props.status?.ruflo },
                { name: "Codex Hooks", id: "codex", status: props.status?.codexHooks },
                { name: "Antigravity", id: "antigravity", status: props.status?.antigravity },
                { name: "Claude Code", id: "reports", status: props.status?.claudeCode },
                { name: "OMEGA Memory", id: "omega", status: props.status?.omega },
              ].map((tool) => (
                <button key={tool.name} type="button" onClick={() => props.onDetailSelect(tool.id)} className="flex flex-col py-1.5 px-2 rounded-lg hover:bg-white/4 transition-colors group text-left">
                  <div className="flex items-center gap-2">
                    {statusDot(tool.status?.level)}
                    <span className="text-[11px] font-medium text-white/80 flex-1">{tool.name}</span>
                    <span
                      className={[
                        "text-[9px] uppercase tracking-wider font-mono",
                        tool.status?.level === "ok"
                          ? "text-emerald-400/70"
                          : tool.status?.level === "warn"
                            ? "text-amber-400/70"
                            : "text-white/30",
                      ].join(" ")}
                    >
                      {statusLabel(tool.status?.level)}
                    </span>
                  </div>
                  {tool.status?.detail && (
                    <div className="pl-4 pr-1 pt-1 text-[9px] leading-relaxed text-white/40">
                      {tool.status.detail}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Observability contract */}
          <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-3 animate-fade-in stagger-6">
            <div className="text-[10px] tracking-[0.14em] uppercase text-white/40">
              Observability
            </div>
            <div className="mt-1.5 text-[10px] text-white/35 leading-relaxed">
              Portal surfaces instrumentable signals only. States reflect truthful probe results from the local environment.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-white/95">
                {props.node.cleanLabel || props.node.label || props.node.id}
              </div>
              <div className="mt-1 text-[11px] text-white/50 flex flex-wrap gap-1.5 items-center">
                <span className="font-mono text-[10px] bg-white/5 rounded px-1.5 py-0.5">{props.node.sourceKind ?? props.node.type ?? "node"}</span>
                <span className="text-white/60">· {props.node.clusterName}</span>
                {props.node.macroSectionLabel ? (
                  <span className="text-white/60">· {props.node.macroSectionLabel}</span>
                ) : null}
                {props.node.community != null ? (
                  <span className="text-white/40">· g-comm {String(props.node.community)}</span>
                ) : null}
                {props.node.subcluster ? (
                  <span className="text-[9px] uppercase tracking-wider font-mono bg-white/5 px-1 rounded text-white/40">{props.node.subcluster}</span>
                ) : null}
              </div>
            </div>
            {hasPinned ? (
              <button
                type="button"
                onClick={props.onUnpin}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80 hover:bg-white/8 transition-colors"
                title="Unpin"
              >
                <PinOff size={12} />
                Unpin
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
              <div className="text-[9px] tracking-[0.14em] uppercase text-white/40">Importance</div>
              <div className="mt-1 text-[13px] text-white/85 font-semibold tabular-nums">
                {props.node.importance ?? props.node.val ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
              <div className="text-[9px] tracking-[0.14em] uppercase text-white/40">Source</div>
              <div className="mt-1 text-[10px] text-white/70 break-words font-mono leading-relaxed">
                {props.node.source || "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="text-[10px] tracking-[0.14em] uppercase text-white/45">Actionable Summary</div>
            <div className="mt-2 text-[11px] text-white/65 leading-relaxed">
              {props.node.actionableSummary || props.node.clusterDescription}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-white/45">
              <Sparkles size={12} />
              Node Summary
            </div>
            <div className="mt-2 text-[11px] text-white/65 leading-relaxed">
              {nodeSummary ?? (
                <span className="text-white/35 italic">No enrichment data — run Ollama analysis to generate.</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-white/45">
              <ShieldAlert size={12} />
              Cluster Context
            </div>
            <div className="mt-2 text-[11px] text-white/65 leading-relaxed">
              {communitySummary ?? (
                <span className="text-white/35 italic">No cluster summary — run Ollama analysis to generate.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

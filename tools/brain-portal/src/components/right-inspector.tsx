"use client";

import { ExternalLink, PinOff, ShieldAlert, Sparkles, Workflow } from "lucide-react";

import { Panel } from "@/components/panel";
import type { BrainPortalNode, BrainPortalStatus, OrbSummaries } from "@/lib/types";

function pillClass(level: "ok" | "warn" | "unknown" | "error") {
  switch (level) {
    case "ok":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "warn":
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";
    case "error":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function getNodeKey(node: BrainPortalNode): string {
  return String(node.id || "");
}

export function RightInspector(props: {
  status: BrainPortalStatus | null;
  graphMeta: { nodes: number; links: number; communities: number } | null;
  node: BrainPortalNode | null;
  pinnedNode: BrainPortalNode | null;
  summaries: OrbSummaries | null;
  onUnpin: () => void;
}) {
  const freshness = props.status?.graphify;
  const git = props.status?.git;

  const nodeSummary = props.node
    ? props.summaries?.nodeSummaries?.[getNodeKey(props.node)] ?? null
    : null;

  const communityKey = props.node?.community != null ? String(props.node.community) : null;
  const communitySummary =
    communityKey && props.summaries?.communitySummaries
      ? props.summaries.communitySummaries[communityKey] ?? null
      : null;

  const hasPinned = Boolean(props.pinnedNode);

  return (
    <Panel title="Intelligence Inspector" className="space-y-3">
      {!props.node ? (
        <div className="space-y-3">
          <div className="text-[14px] font-semibold text-white/95">Portal Summary</div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="text-[11px] tracking-[0.14em] uppercase text-white/50">
                Graph Integrity
              </div>
              <div className="mt-2 text-[12px] text-white/75">
                {freshness?.builtFromCommit ? (
                  <>
                    built from <span className="font-mono">{freshness.builtFromCommit.slice(0, 7)}</span>
                  </>
                ) : (
                  "graph report missing"
                )}
              </div>
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                    pillClass(
                      freshness?.matchesHead === true ? "ok" : freshness?.matchesHead === false ? "warn" : "unknown",
                    ),
                  ].join(" ")}
                >
                  {freshness?.matchesHead === true
                    ? "fresh"
                    : freshness?.matchesHead === false
                      ? "stale vs head"
                      : "unknown"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="text-[11px] tracking-[0.14em] uppercase text-white/50">
                Brain Docs Quality
              </div>
              <div className="mt-2 text-[12px] text-white/75">
                {props.status?.docs ? (
                  <>
                    {props.status.docs.requiredDocs.filter((d) => d.ok).length}/
                    {props.status.docs.requiredDocs.length} required docs present
                  </>
                ) : (
                  "unknown"
                )}
              </div>
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                    pillClass(props.status?.docs?.ok ? "ok" : "warn"),
                  ].join(" ")}
                >
                  {props.status?.docs?.ok ? "complete" : "incomplete"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/50">
                <Sparkles size={14} />
                AI Enrichment
              </div>
              <div className="mt-2 text-[12px] text-white/75 leading-relaxed">
                {props.summaries?.nodeSummaries || props.summaries?.communitySummaries ? (
                  <>
                    sidecars loaded{" "}
                    {props.summaries.model ? (
                      <span className="text-white/45">(model: {props.summaries.model})</span>
                    ) : null}
                  </>
                ) : (
                  "no sidecars found"
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/50">
                <Workflow size={14} />
                Toolchain Readiness
              </div>
              <div className="mt-2 text-[12px] text-white/75 leading-relaxed">
                Ollama: {props.status?.ollama.level ?? "unknown"} · Langflow:{" "}
                {props.status?.langflow.level ?? "unknown"} · RuFlo:{" "}
                {props.status?.ruflo.level ?? "unknown"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="text-[11px] tracking-[0.14em] uppercase text-white/55">
              Observability contract
            </div>
            <div className="mt-2 text-[12px] text-white/60 leading-relaxed">
              Portal surfaces only instrumentable signals. It does not and cannot monitor agent internal reasoning.
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="text-[11px] tracking-[0.14em] uppercase text-white/55">
              Activity feeds (placeholder)
            </div>
            <div className="mt-2 text-[12px] text-white/60 leading-relaxed">
              Reserved for future Codex/Claude activity events and memory write feeds once instrumented via explicit adapters.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-white/95">
                {props.node.label || props.node.id}
              </div>
              <div className="mt-1 text-[12px] text-white/60">
                <span className="font-mono">{props.node.type ?? "node"}</span>
                {props.node.community != null ? (
                  <span className="ml-2">· community {String(props.node.community)}</span>
                ) : null}
              </div>
            </div>
            {hasPinned ? (
              <button
                type="button"
                onClick={props.onUnpin}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/90 hover:bg-white/8"
                title="Unpin"
              >
                <PinOff size={14} />
                Unpin
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/50">Importance</div>
              <div className="mt-1 text-[12px] text-white/80">
                {props.node.val ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] uppercase text-white/50">Source/path</div>
              <div className="mt-1 text-[12px] text-white/80 break-words font-mono">
                {props.node.source || "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/55">
              <Sparkles size={14} />
              Summary
            </div>
            <div className="mt-2 text-[12px] text-white/70 leading-relaxed">
              {nodeSummary ?? "No node summary yet (run Ollama enrichment)."}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/55">
              <ShieldAlert size={14} />
              Community context
            </div>
            <div className="mt-2 text-[12px] text-white/70 leading-relaxed">
              {communitySummary ?? "No community summary yet (run Ollama enrichment)."}
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="/orb"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/90 hover:bg-white/8"
            >
              <ExternalLink size={14} />
              Open orb
            </a>
          </div>
        </div>
      )}
    </Panel>
  );
}

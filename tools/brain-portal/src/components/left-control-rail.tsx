"use client";

import { Activity, RotateCcw, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Panel } from "@/components/panel";
import type { BrainPortalStatus } from "@/lib/types";

function LiveHeartbeat(props: { status: BrainPortalStatus | null }) {
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => !t), 2400);
    return () => clearInterval(interval);
  }, []);

  const hasData = Boolean(props.status?.timestampIso);
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "inline-block h-2 w-2 rounded-full transition-all duration-700",
          hasData
            ? tick
              ? "bg-[color:var(--cm-cyan)] shadow-[0_0_8px_rgba(0,229,255,0.5)]"
              : "bg-[color:var(--cm-cyan)] shadow-[0_0_4px_rgba(0,229,255,0.25)]"
            : "bg-white/20",
        ].join(" ")}
      />
      <span className="text-[10px] text-white/40 font-mono tabular-nums">
        {hasData ? "LIVE" : "CONNECTING"}
      </span>
    </div>
  );
}

function FreshnessBar(props: { label: string; fresh: boolean | null }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-white/50 w-14 shrink-0">{props.label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className={[
            "h-full rounded-full transition-all duration-1000",
            props.fresh === true
              ? "w-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/40"
              : props.fresh === false
                ? "w-3/5 bg-gradient-to-r from-amber-500/60 to-amber-400/30"
                : "w-1/4 bg-gradient-to-r from-white/15 to-white/5",
          ].join(" ")}
        />
      </div>
      <span className={[
        "text-[10px] font-mono w-10 text-right",
        props.fresh === true ? "text-emerald-400/80" : props.fresh === false ? "text-amber-400/80" : "text-white/30",
      ].join(" ")}>
        {props.fresh === true ? "fresh" : props.fresh === false ? "stale" : "—"}
      </span>
    </div>
  );
}

export function LeftControlRail(props: {
  status: BrainPortalStatus | null;
  graphMeta: { nodes: number; links: number; communities: number } | null;
  search: string;
  matchCount: number;
  resetMessage: string | null;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onDetailSelect: (id: string) => void;
  onResetSelection: () => void;
  glow?: "cyan" | "green" | "amber" | "rose" | "blue" | null;
}) {
  const git = props.status?.git;
  const head = git?.head?.shortSha ?? "—";
  const dirty = git?.dirty ?? false;
  const graphify = props.status?.graphify;

  return (
    <Panel title="Brain Portal" className="space-y-3" glow={props.glow}>
      {/* Header with live heartbeat */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] leading-tight font-semibold text-[color:var(--cm-text)] tracking-[-0.01em]">
            Cinema Machina Brain
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => props.onDetailSelect("git")}
              className="rounded-lg text-left text-[11px] text-[color:var(--cm-text-dim)] font-mono hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/15"
              title="Show Git workspace details"
            >
              {head}
              <span className="ml-1.5 inline-flex items-center gap-1">
                <span
                  className={[
                    "inline-block h-1.5 w-1.5 rounded-full",
                    dirty ? "bg-[color:var(--cm-amber)]" : "bg-[color:var(--cm-green)]",
                  ].join(" ")}
                />
                <span className="text-[10px]">
                  {dirty ? `${git?.changedFiles ?? 0} changed` : "clean"}
                </span>
              </span>
            </button>
            <LiveHeartbeat status={props.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={props.onResetSelection}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80 hover:bg-white/8 transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Graph metrics */}
      <div className="grid grid-cols-3 gap-2 animate-fade-in stagger-1">
        {[
          { value: props.graphMeta?.nodes, label: "Nodes" },
          { value: props.graphMeta?.links, label: "Links" },
          { value: props.graphMeta?.communities, label: "Clusters" },
        ].map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => props.onDetailSelect("graph")}
            className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center hover:bg-white/7 focus:outline-none focus:ring-1 focus:ring-[color:var(--cm-cyan)]/35"
            title="Show Graphify details"
          >
            <div className="text-[14px] font-semibold text-white/95 tabular-nums">
              {metric.value?.toLocaleString() ?? "—"}
            </div>
            <div className="text-[9px] tracking-[0.16em] uppercase text-white/45 mt-0.5">
              {metric.label}
            </div>
          </button>
        ))}
      </div>

      {/* Freshness indicators */}
      <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 space-y-2 animate-fade-in stagger-2">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-white/45 mb-1">
          <Activity size={12} />
          Data Freshness
        </div>
        <button type="button" onClick={() => props.onDetailSelect("graph")} className="block w-full rounded-lg hover:bg-white/5" title="Show graph freshness commands">
          <FreshnessBar label="Graph" fresh={graphify?.matchesHead ?? null} />
        </button>
        <button type="button" onClick={() => props.onDetailSelect("reports")} className="block w-full rounded-lg hover:bg-white/5" title="Show report and docs details">
          <FreshnessBar label="Docs" fresh={props.status?.docs?.ok ?? null} />
        </button>
      </div>

      {/* Search */}
      <div className="space-y-2 animate-fade-in stagger-3">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-white/45">
          <Search size={12} />
          Filter Nodes
        </div>
        <div className="relative">
          <input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search node labels…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-8 pr-16 text-[12px] text-white/95 placeholder:text-white/30 outline-none focus:border-[color:var(--cm-cyan)]/30 transition-colors"
          />
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
          {props.search ? (
            <button
              type="button"
              onClick={props.onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white/80"
              title="Clear search"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="text-[10px] text-white/40">
          {props.search ? `${props.matchCount.toLocaleString()} matching node${props.matchCount === 1 ? "" : "s"}` : "Type to filter by label, cluster, or source."}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 animate-fade-in stagger-4">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-white/45">
          <Sparkles size={12} />
          Quick Actions
        </div>
        <div className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
          Hover nodes to inspect · Click to pin · Search to filter ·
          Reset clears selection.
        </div>
        {props.resetMessage ? (
          <div className="mt-2 rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-2 py-1.5 text-[10px] text-emerald-200/80">
            {props.resetMessage}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

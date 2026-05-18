"use client";

import { RotateCcw, Search, Sparkles } from "lucide-react";

import { Panel } from "@/components/panel";
import type { BrainPortalStatus } from "@/lib/types";

export function LeftControlRail(props: {
  status: BrainPortalStatus | null;
  graphMeta: { nodes: number; links: number; communities: number } | null;
  search: string;
  onSearchChange: (value: string) => void;
  onResetSelection: () => void;
}) {
  const git = props.status?.git;
  const head = git?.head?.shortSha ?? "—";
  const dirty = git?.dirty ?? false;

  return (
    <Panel title="Brain Portal" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[18px] leading-tight font-semibold text-[color:var(--cm-text)]">
            Cinema Machina Brain
          </div>
          <div className="mt-1 text-[12px] text-[color:var(--cm-text-dim)]">
            Git {head}
            {git ? (
              <span className="ml-2 inline-flex items-center gap-1">
                <span
                  className={[
                    "inline-block h-2 w-2 rounded-full",
                    dirty ? "bg-[color:var(--cm-amber)]" : "bg-[color:var(--cm-green)]",
                  ].join(" ")}
                />
                <span className="text-[11px]">
                  {dirty ? `${git.changedFiles} changed` : "clean"}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={props.onResetSelection}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/90 hover:bg-white/8"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
          <div className="text-[13px] font-semibold text-white/95">
            {props.graphMeta?.nodes?.toLocaleString() ?? "—"}
          </div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-white/50">
            Nodes
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
          <div className="text-[13px] font-semibold text-white/95">
            {props.graphMeta?.links?.toLocaleString() ?? "—"}
          </div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-white/50">
            Links
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
          <div className="text-[13px] font-semibold text-white/95">
            {props.graphMeta?.communities?.toLocaleString() ?? "—"}
          </div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-white/50">
            Communities
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/55">
          <Search size={14} />
          Search / Filter
        </div>
        <div className="relative">
          <input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search node labels…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-9 text-[13px] text-white/95 placeholder:text-white/35 outline-none focus:border-white/25"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55" />
        </div>

        <div className="text-[12px] text-white/55">
          Click a node to pin details in the inspector. Search highlights matching nodes.
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/55">
          <Sparkles size={14} />
          Shortcuts
        </div>
        <div className="mt-2 text-[12px] text-white/60 leading-relaxed">
          Orb fallback:{" "}
          <a
            href="/orb"
            className="text-[color:var(--cm-cyan)] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            open Graphify Orb HTML
          </a>
          .
        </div>
      </div>
    </Panel>
  );
}


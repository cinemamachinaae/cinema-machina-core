"use client";

import {
  Brain,
  Database,
  GitBranch,
  HardDrive,
  Network,
  Orbit,
  Sparkles,
  Workflow,
} from "lucide-react";

import type { BrainPortalStatus, StatusLevel } from "@/lib/types";

function dotClass(level: StatusLevel) {
  switch (level) {
    case "ok":
      return "bg-emerald-400/80";
    case "warn":
      return "bg-amber-300/80";
    case "error":
      return "bg-rose-400/80";
    default:
      return "bg-white/25";
  }
}

function item(
  icon: React.ReactNode,
  label: string,
  level: StatusLevel,
  detail: string,
) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2">
      <span className="text-white/65">{icon}</span>
      <span className="text-[11px] tracking-[0.14em] uppercase text-white/55">
        {label}
      </span>
      <span className={["h-2 w-2 rounded-full", dotClass(level)].join(" ")} />
      <span className="text-[12px] text-white/65">{detail}</span>
    </div>
  );
}

export function BottomPulseStrip(props: { status: BrainPortalStatus | null }) {
  const git = props.status?.git;
  const graphify = props.status?.graphify;

  const graphLevel: StatusLevel =
    graphify?.matchesHead === true ? "ok" : graphify?.matchesHead === false ? "warn" : "unknown";

  return (
    <div className="w-full border-t border-white/8 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3">
        {item(<Orbit size={14} />, "Graphify", graphLevel, graphify?.matchesHead === true ? "fresh" : graphify?.matchesHead === false ? "stale" : "unknown")}
        {item(<GitBranch size={14} />, "Git", git ? (git.dirty ? "warn" : "ok") : "unknown", git ? (git.dirty ? `${git.changedFiles} changed` : "clean") : "unknown")}
        {item(<Sparkles size={14} />, "Ollama", props.status?.ollama.level ?? "unknown", props.status?.ollama.detail ?? "unknown")}
        {item(<Database size={14} />, "OMEGA", props.status?.omega.level ?? "unknown", props.status?.omega.detail ?? "unknown")}
        {item(<Workflow size={14} />, "Langflow", props.status?.langflow.level ?? "unknown", props.status?.langflow.detail ?? "unknown")}
        {item(<Brain size={14} />, "RuFlo", props.status?.ruflo.level ?? "unknown", props.status?.ruflo.detail ?? "unknown")}
        {item(<Network size={14} />, "Codex", props.status?.codexHooks.level ?? "unknown", props.status?.codexHooks.detail ?? "unknown")}
      </div>
    </div>
  );
}


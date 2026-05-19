"use client";

import {
  Brain,
  Database,
  GitBranch,
  Network,
  Orbit,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { BrainPortalStatus, StatusLevel } from "@/lib/types";

function dotClass(level: StatusLevel) {
  switch (level) {
    case "ok":
      return "bg-emerald-400/90";
    case "warn":
      return "bg-amber-300/90";
    case "error":
      return "bg-rose-400/90";
    default:
      return "bg-white/20";
  }
}

function item(
  icon: React.ReactNode,
  label: string,
  level: StatusLevel,
  detail: string,
) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/6 bg-white/[0.03] px-3 py-1.5 hover:bg-white/[0.06] transition-colors">
      <span className="text-white/50">{icon}</span>
      <span className="text-[10px] tracking-[0.12em] uppercase text-white/45 hidden sm:inline">
        {label}
      </span>
      <span className={["h-1.5 w-1.5 rounded-full shrink-0", dotClass(level)].join(" ")} />
      <span className="text-[10px] text-white/55 truncate max-w-[120px]">{detail}</span>
    </div>
  );
}

export function BottomPulseStrip(props: { status: BrainPortalStatus | null }) {
  const [pulsePhase, setPulsePhase] = useState(0);
  const git = props.status?.git;
  const graphify = props.status?.graphify;

  useEffect(() => {
    const interval = setInterval(() => setPulsePhase((p) => (p + 1) % 4), 800);
    return () => clearInterval(interval);
  }, []);

  const graphLevel: StatusLevel =
    graphify?.matchesHead === true ? "ok" : graphify?.matchesHead === false ? "warn" : "unknown";

  return (
    <div className="w-full border-t border-white/6 bg-black/30 backdrop-blur-xl">
      {/* Animated pulse line */}
      <div className="h-[1px] w-full relative overflow-hidden">
        <div
          className={`absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[color:var(--cm-cyan)]/30 to-transparent transition-transform duration-1000 ${
            pulsePhase === 0 ? "translate-x-0" :
            pulsePhase === 1 ? "translate-x-full" :
            pulsePhase === 2 ? "translate-x-[200%]" :
            "translate-x-[300%]"
          }`}
        />
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-1.5 px-4 py-2">
        {item(<Orbit size={12} />, "Graph", graphLevel, graphify?.matchesHead === true ? "synced" : graphify?.matchesHead === false ? "stale" : "—")}
        {item(<GitBranch size={12} />, "Git", git ? (git.dirty ? "warn" : "ok") : "unknown", git ? (git.dirty ? `${git.changedFiles} dirty` : "clean") : "—")}
        {item(<Sparkles size={12} />, "Ollama", props.status?.ollama.level ?? "unknown", props.status?.ollama.level === "ok" ? "ready" : props.status?.ollama.detail ?? "—")}
        {item(<Database size={12} />, "OMEGA", props.status?.omega.level ?? "unknown", props.status?.omega.level === "ok" ? "active" : "—")}
        {item(<Workflow size={12} />, "Langflow", props.status?.langflow.level ?? "unknown", props.status?.langflow.level === "ok" ? "wired" : "—")}
        {item(<Brain size={12} />, "RuFlo", props.status?.ruflo.level ?? "unknown", props.status?.ruflo.level === "ok" ? "wired" : "—")}
        {item(<Network size={12} />, "Codex", props.status?.codexHooks.level ?? "unknown", props.status?.codexHooks.level === "ok" ? "hooked" : "—")}
      </div>
    </div>
  );
}

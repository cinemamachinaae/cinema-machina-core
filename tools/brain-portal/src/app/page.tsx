"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomPulseStrip } from "@/components/bottom-pulse-strip";
import { HeroOrbCanvas } from "@/components/hero-orb-canvas";
import { LeftControlRail } from "@/components/left-control-rail";
import { RightInspector } from "@/components/right-inspector";
import type {
  BrainPortalNode,
  BrainPortalStatus,
  GraphifyGraph,
  OrbSummaries,
} from "@/lib/types";

export default function BrainPortalHome() {
  const [status, setStatus] = useState<BrainPortalStatus | null>(null);
  const [graph, setGraph] = useState<GraphifyGraph | null>(null);
  const [summaries, setSummaries] = useState<OrbSummaries | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<BrainPortalNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<BrainPortalNode | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statusRes, graphRes, summariesRes] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/graphify/graph", { cache: "no-store" }),
          fetch("/api/enrichment/summaries", { cache: "no-store" }),
        ]);

        if (!cancelled && statusRes.ok) {
          setStatus((await statusRes.json()) as BrainPortalStatus);
        }
        if (!cancelled && graphRes.ok) {
          setGraph((await graphRes.json()) as GraphifyGraph);
        }
        if (!cancelled && summariesRes.ok) {
          setSummaries((await summariesRes.json()) as OrbSummaries);
        }
      } catch {
        // Safe degraded state: UI stays up, strip will show "unknown".
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const effectiveHovered = useMemo(() => {
    if (isPinned) return null;
    return hoveredNode;
  }, [hoveredNode, isPinned]);

  const effectiveSelected = useMemo(() => {
    if (isPinned) return selectedNode;
    return selectedNode ?? effectiveHovered;
  }, [selectedNode, effectiveHovered, isPinned]);

  const graphMeta = useMemo(() => {
    if (!graph) return null;
    const nodes = graph.nodes?.length ?? 0;
    const links = graph.links?.length ?? 0;
    const communities = new Set(graph.nodes?.map((n) => n.community ?? "—") ?? []).size;
    return { nodes, links, communities };
  }, [graph]);

  return (
    <main className="relative min-h-[100dvh]">
      <HeroOrbCanvas
        graph={graph}
        search={search}
        onHover={(node) => setHoveredNode(node)}
        onSelect={(node) => {
          setSelectedNode(node);
          setIsPinned(true);
        }}
        pinnedNode={isPinned ? selectedNode : null}
      />

      <div className="pointer-events-none absolute inset-0 z-[10]">
        <div className="pointer-events-auto absolute left-4 top-4 w-[min(340px,calc(100vw-32px))]">
          <LeftControlRail
            status={status}
            graphMeta={graphMeta}
            search={search}
            onSearchChange={setSearch}
            onResetSelection={() => {
              setSelectedNode(null);
              setHoveredNode(null);
              setIsPinned(false);
            }}
            glow={search ? "cyan" : null}
          />
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 w-[min(380px,calc(100vw-32px))]">
          <RightInspector
            status={status}
            graphMeta={graphMeta}
            node={effectiveSelected}
            pinnedNode={isPinned ? selectedNode : null}
            summaries={summaries}
            onUnpin={() => setIsPinned(false)}
            glow={isPinned ? "cyan" : effectiveHovered ? "blue" : null}
          />
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-0">
          <BottomPulseStrip status={status} />
        </div>
      </div>
    </main>
  );
}


"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { BrainPortalNode, GraphifyGraph } from "@/lib/types";

function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|Android/i.test(ua) || window.matchMedia?.("(max-width: 720px)")?.matches;
}

function stableColorForCommunity(community: number | string | undefined): string {
  const palette = [
    "#7CA9FF",
    "#9A7BFF",
    "#46D7C8",
    "#E07AA6",
    "#E6C26E",
    "#5DB6E6",
    "#B5A0FF",
    "#7ED6B5",
    "#D98DBA",
    "#C9D2E3",
  ];
  const key = String(community ?? "0");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const hex = palette[Math.abs(hash) % palette.length] ?? "#7CA9FF";

  // De-saturate slightly for premium dark UI.
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, Math.min(0.85, hsl.s * 0.72), Math.min(0.85, hsl.l * 0.92));
  return `#${color.getHexString()}`;
}

function buildHaloTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.18, "rgba(255,255,255,0.35)");
  g.addColorStop(0.45, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function HeroOrbCanvas(props: {
  graph: GraphifyGraph | null;
  search: string;
  pinnedNode: BrainPortalNode | null;
  onHover: (node: BrainPortalNode | null) => void;
  onSelect: (node: BrainPortalNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<any>(null);
  const haloTextureRef = useRef<THREE.Texture | null>(null);
  const mobileLike = useMemo(() => isMobileLike(), []);

  const searchLower = props.search.trim().toLowerCase();

  useEffect(() => {
    if (!containerRef.current) return;
    if (graphRef.current) return;

    haloTextureRef.current = buildHaloTexture();

    let cancelled = false;

    async function boot() {
      const mod = await import("3d-force-graph");
      const ForceGraph3DFactory: any = (mod as any).default ?? (mod as any);
      if (cancelled) return;

      const graph = ForceGraph3DFactory()(containerRef.current);
      graphRef.current = graph;

      graph
      .backgroundColor("rgba(0,0,0,0)")
      .nodeOpacity(1.0)
      .linkOpacity(mobileLike ? 0.12 : 0.18)
      .linkWidth((l: any) => (l.label ? 0.6 : 0.22))
      .linkColor(() => "rgba(164,202,255,0.18)")
      .d3Force("charge")
      ?.strength(-55);

      graph.d3Force("link")?.distance(24);

      // Premium motion: slow orbit drift on desktop, reduced on mobile.
      const controls = graph.controls();
      controls.autoRotate = !mobileLike;
      controls.autoRotateSpeed = 0.20;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;

      graph.cameraPosition({ x: 0, y: 0, z: 420 });
      setTimeout(() => {
        try {
          graph.zoomToFit(1200, 70);
        } catch {
          // ignore
        }
      }, 850);

      // Subtle neon pulse trails on a sparse subset of links (desktop only).
      if (!mobileLike) {
        graph
          .linkDirectionalParticles((l: any) => {
            const key = `${typeof l.source === "object" ? l.source.id : l.source}|${typeof l.target === "object" ? l.target.id : l.target}`;
            let h = 0;
            for (let i = 0; i < key.length; i += 1) h = (h * 33 + key.charCodeAt(i)) | 0;
            return Math.abs(h) % 17 === 0 ? 1 : 0;
          })
          .linkDirectionalParticleWidth(1.0)
          .linkDirectionalParticleSpeed(0.002)
          .linkDirectionalParticleColor(() => "rgba(110, 190, 255, 0.86)");
      }

      graph.onNodeHover((node: any) => {
        props.onHover((node as BrainPortalNode) ?? null);
        containerRef.current!.style.cursor = node ? "pointer" : "default";
      });

      graph.onNodeClick((node: any) => {
        props.onSelect(node as BrainPortalNode);
      });
    }

    void boot();

    return () => {
      cancelled = true;
      try {
        graphRef.current?._destructor?.();
      } catch {
        // ignore
      }
      graphRef.current = null;
    };
  }, [mobileLike, props]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const haloTexture = haloTextureRef.current;
    if (!haloTexture) return;

    const pinnedId = props.pinnedNode?.id ?? null;

    graph.nodeThreeObject((node: any) => {
      const n = node as BrainPortalNode;
      const group = new THREE.Group();

      const colorHex = stableColorForCommunity(n.community);
      const emphasized = Boolean(
        (pinnedId && n.id === pinnedId) ||
          (searchLower && String(n.label || "").toLowerCase().includes(searchLower)),
      );

      const haloMat = new THREE.SpriteMaterial({
        map: haloTexture,
        color: new THREE.Color(emphasized ? "#dff5ff" : colorHex),
        transparent: true,
        opacity: emphasized ? 0.42 : 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Sprite(haloMat);
      const baseVal = n.val || 4;
      const haloScale = 10 + Math.min(28, baseVal * 2.2);
      halo.scale.set(haloScale * (emphasized ? 1.08 : 1.0), haloScale * (emphasized ? 1.08 : 1.0), 1);
      group.add(halo);

      return group;
    });

    graph.nodeColor((node: any) => {
      const n = node as BrainPortalNode;
      if (searchLower && String(n.label || "").toLowerCase().includes(searchLower)) return "#f2f8ff";
      return stableColorForCommunity(n.community);
    });

    graph.nodeVal((node: any) => {
      const n = node as BrainPortalNode;
      const base = n.val || 4;
      if (searchLower && String(n.label || "").toLowerCase().includes(searchLower)) return base * 1.35;
      return base * 1.05;
    });

    graph.refresh();
  }, [props.pinnedNode, props.search, searchLower]);

  return (
    <div className="fixed inset-0 z-[1]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

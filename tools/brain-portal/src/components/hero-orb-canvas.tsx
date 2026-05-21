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

const STABLE_SECTION_COLORS: Record<number, string> = {
  0: "#7CA9FF",
  1: "#66E3B4",
  2: "#C69CFF",
  3: "#E6C26E",
  4: "#9DBBFF",
  5: "#E07AA6",
  6: "#46D7C8",
  7: "#8DEBFF",
  8: "#FFB86B",
  9: "#00E5FF",
  10: "#B7C4D9",
  11: "#8FE388",
  12: "#F2D394",
  13: "#C9D2E3",
};

const CLUSTER_CENTERS: Record<number, { x: number; y: number; z: number }> = {
  0: { x: 0, y: 0, z: 0 },
  1: { x: -55, y: 24, z: -18 },
  2: { x: 138, y: 54, z: -20 },
  3: { x: -118, y: 88, z: 26 },
  4: { x: -160, y: 30, z: 42 },
  5: { x: -135, y: -24, z: 76 },
  6: { x: -58, y: 116, z: -70 },
  7: { x: -118, y: 138, z: -24 },
  8: { x: -178, y: 92, z: -58 },
  9: { x: 44, y: 36, z: -76 },
  10: { x: 156, y: -12, z: 56 },
  11: { x: 64, y: -130, z: 42 },
  12: { x: -30, y: -150, z: -54 },
  13: { x: 18, y: -78, z: 112 },
};

function clusterCenter(id: number | string | undefined) {
  const numId = typeof id === "number" ? id : parseInt(String(id ?? "13"), 10);
  return CLUSTER_CENTERS[isNaN(numId) ? 13 : numId] || CLUSTER_CENTERS[13];
}

function stableColorForCommunity(clusterId: number | string | undefined): string {
  const numId = typeof clusterId === "number" ? clusterId : parseInt(String(clusterId ?? "13"), 10);
  const hex = STABLE_SECTION_COLORS[isNaN(numId) ? 13 : numId] || "#C9D2E3";
  return hex;
}

function buildHaloTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.2, "rgba(255,255,255,0.95)");
  g.addColorStop(0.5, "rgba(255,255,255,0.70)");
  g.addColorStop(0.8, "rgba(255,255,255,0.25)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  
  // Protect from automatic disposal by 3d-force-graph since we share this texture
  tex.dispose = () => {
    // intentional no-op
  };
  
  return tex;
}

function buildLabelSprite(text: string, color: string, fontSize = 14, isCluster = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const padding = 8;
  const font = `${isCluster ? "600" : "500"} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + padding * 2;
  const height = fontSize + padding * 2;
  canvas.width = width;
  canvas.height = height;

  if (isCluster) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(width / 6, height / 6, 1);
  return sprite;
}

export function HeroOrbCanvas(props: {
  graph: GraphifyGraph | null;
  search: string;
  pinnedNode: BrainPortalNode | null;
  onHover: (node: BrainPortalNode | null) => void;
  onSelect: (node: BrainPortalNode) => void;
  resetSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<any>(null);
  const haloTextureRef = useRef<THREE.Texture | null>(null);
  const mobileLike = useMemo(() => isMobileLike(), []);

  const searchLower = props.search.trim().toLowerCase();

  const onHoverRef = useRef(props.onHover);
  const onSelectRef = useRef(props.onSelect);
  const graphDataRef = useRef(props.graph);

  useEffect(() => {
    onHoverRef.current = props.onHover;
    onSelectRef.current = props.onSelect;
    graphDataRef.current = props.graph;
  }, [props.onHover, props.onSelect, props.graph]);

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
        .linkOpacity(mobileLike ? 0.15 : 0.25)
        .linkWidth((l: any) => (l.label ? 0.5 : 0.18))
        .linkColor(() => "rgba(164,202,255,0.18)")
        .cooldownTicks(mobileLike ? 80 : 140)
        .d3AlphaDecay(0.035)
        .d3VelocityDecay(0.36)
        .d3Force("charge")
        ?.strength(-55);

      graph.d3Force("link")?.distance(24);
      graph.d3Force("cluster", (alpha: number) => {
        const data = graph.graphData?.();
        const nodes = data?.nodes || [];
        const strength = mobileLike ? 0.012 : 0.018;
        for (const raw of nodes) {
          const node = raw as any;
          const center = clusterCenter(node.clusterId);
          if (node.isClusterHub) {
            node.fx = center.x;
            node.fy = center.y;
            node.fz = center.z;
            continue;
          }
          node.vx = (node.vx || 0) + (center.x - (node.x || 0)) * strength * alpha;
          node.vy = (node.vy || 0) + (center.y - (node.y || 0)) * strength * alpha;
          node.vz = (node.vz || 0) + (center.z - (node.z || 0)) * strength * alpha;
        }
      });

      // Premium slow orbit on desktop
      const controls = graph.controls();
      controls.autoRotate = !mobileLike;
      controls.autoRotateSpeed = 0.18;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;

      graph.cameraPosition({ x: 0, y: 0, z: 420 });
      setTimeout(() => {
        try { graph.zoomToFit(1200, 70); } catch { /* ignore */ }
      }, 850);

      // Particle trails on a sparse subset of links (desktop only)
      if (!mobileLike) {
        graph
          .linkDirectionalParticles((l: any) => {
            const key = `${typeof l.source === "object" ? l.source.id : l.source}|${typeof l.target === "object" ? l.target.id : l.target}`;
            let h = 0;
            for (let i = 0; i < key.length; i += 1) h = (h * 33 + key.charCodeAt(i)) | 0;
            return Math.abs(h) % 12 === 0 ? 1 : 0;
          })
          .linkDirectionalParticleWidth(0.8)
          .linkDirectionalParticleSpeed(0.0018)
          .linkDirectionalParticleColor(() => "rgba(110, 190, 255, 0.75)");
      }

      graph.onNodeHover((node: any) => {
        onHoverRef.current(node ? ({ ...node, label: node.cleanLabel || node.label || node.clusterName } as BrainPortalNode) : null);
        containerRef.current!.style.cursor = node ? "pointer" : "default";
      });

      graph.onNodeClick((node: any) => {
        onSelectRef.current({ ...node, label: node.cleanLabel || node.label || node.clusterName } as BrainPortalNode);
      });

      // Apply initial data if already available
      if (graphDataRef.current) {
        graph.graphData(graphDataRef.current);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      try { graphRef.current?._destructor?.(); } catch { /* ignore */ }
      graphRef.current = null;
    };
  }, [mobileLike]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (props.graph) {
      const currentData = graph.graphData();
      const needsUpdate =
        !currentData ||
        !currentData.nodes ||
        currentData.nodes.length !== props.graph.nodes.length ||
        currentData.links.length !== props.graph.links.length;

      if (needsUpdate) {
        graph.graphData(props.graph);
        try { graph.d3ReheatSimulation?.(); } catch { /* ignore */ }
      }
    }

    const haloTexture = haloTextureRef.current;
    if (!haloTexture) return;

    const pinnedId = props.pinnedNode?.id ?? null;

    graph.nodeThreeObjectExtend(false);
    graph.nodeThreeObject((node: any) => {
      const n = node as BrainPortalNode;
      const group = new THREE.Group();

      const colorHex = stableColorForCommunity(n.clusterId ?? n.macroSectionId);
      const emphasized = Boolean(
        (pinnedId && n.id === pinnedId) ||
          (searchLower && `${n.cleanLabel || n.label || ""} ${n.clusterName || ""}`.toLowerCase().includes(searchLower)),
      );

      // 1. Outer Halo Sprite (glowing border)
      const baseVal = n.val || 4;
      const isHub = Boolean(n.isClusterHub) || baseVal >= 18;
      
      const haloMat = new THREE.SpriteMaterial({
        map: haloTexture,
        color: new THREE.Color(emphasized ? "#ffffff" : colorHex),
        transparent: true,
        opacity: emphasized ? 0.95 : (isHub ? 0.90 : 0.75),
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.renderOrder = 1;
      
      const haloScale = n.isClusterHub ? 34 : 8 + Math.min(25, baseVal * 1.8);
      halo.scale.set(
        haloScale * (emphasized ? 1.15 : 1.0),
        haloScale * (emphasized ? 1.15 : 1.0),
        1,
      );
      group.add(halo);

      // 2. Inner Core Sprite (bright central point)
      const coreMat = new THREE.SpriteMaterial({
        map: haloTexture,
        color: new THREE.Color(emphasized ? "#ffffff" : colorHex),
        transparent: true,
        opacity: emphasized ? 1.0 : 0.95,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
      });
      const core = new THREE.Sprite(coreMat);
      core.renderOrder = 2;
      const coreScale = haloScale * (n.isClusterHub ? 0.46 : 0.38);
      core.scale.set(coreScale, coreScale, 1);
      group.add(core);

      // 3. Text Label Sprite (only show for emphasized nodes or macro-section hub nodes)
      const showLabel = emphasized || Boolean(n.isClusterHub) || (n.val != null && n.val >= 22);
      const isClusterHub = Boolean(n.isClusterHub) || (n.val != null && n.val >= 22);
      
      if (showLabel && (n.cleanLabel || n.label)) {
        const label = buildLabelSprite(
          n.cleanLabel || n.label || n.clusterName || "node",
          emphasized ? "rgba(255,255,255,1.0)" : "rgba(240,248,255,0.95)",
          emphasized ? 15 : 12,
          isClusterHub
        );
        label.position.set(0, haloScale * 0.5, 0);
        label.renderOrder = 3;
        group.add(label);
      }

      return group;
    });

    graph.nodeColor((node: any) => {
      const n = node as BrainPortalNode;
      if (searchLower && `${n.cleanLabel || n.label || ""} ${n.clusterName || ""}`.toLowerCase().includes(searchLower)) return "#f2f8ff";
      return stableColorForCommunity(n.clusterId ?? n.macroSectionId);
    });

    graph.nodeVal((node: any) => {
      const n = node as BrainPortalNode;
      const base = n.val || 4;
      if (searchLower && `${n.cleanLabel || n.label || ""} ${n.clusterName || ""}`.toLowerCase().includes(searchLower)) return base * 1.35;
      return base * 1.05;
    });

    graph.refresh();
  }, [props.graph, props.pinnedNode, props.search, searchLower]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || props.resetSignal === 0) return;
    try {
      graph.cameraPosition({ x: 0, y: 0, z: 420 }, { x: 0, y: 0, z: 0 }, 900);
      graph.zoomToFit(900, 70);
    } catch {
      // Non-critical; reset still clears app state.
    }
  }, [props.resetSignal]);

  return (
    <div className="fixed inset-0 z-[1]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

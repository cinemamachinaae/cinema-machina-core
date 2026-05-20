# AI Brain Template — Bootstrapping Local-First Control Portals

This template provides a standardized architectural blueprint for bootstrapping a local-first, agent-friendly playback-chain monitoring, diagnostics, and control platform ("AI Brain Portal") for new projects.

---

## 1. Directory Structure

A standardized AI Brain repository is structured as follows:

```txt
├── docs/
│   ├── AGENT_HANDOFF.md         # Active agent-to-agent session handoff protocol
│   ├── ARCHITECTURE.md          # Core playback-chain layout and systems architecture
│   └── ai/
│       ├── AI_BRAIN_TEMPLATE.md  # (This file) Reusability reference
│       ├── BRAIN_STACK.md        # AI/Ollama configuration and routing rules
│       └── PROJECT_STATE.md      # Live/current task state and checkpoints
├── graphify-out/
│   ├── graph.json               # Extracted codebase dependency graph
│   ├── AGENT_GRAPH_INDEX.md     # High-signal graph index for code navigation
│   └── cluster-map.json         # Stable macro-section cluster definitions
├── backend/                     # Backend APIs / Integration Adapters
│   ├── app/                     # FastAPI app entry points
│   ├── langflow_adapter.py      # Langflow agent-run adapters
│   └── ruflo_adapter.py         # RuFlo workflow controllers
└── tools/
    └── brain-portal/            # Next.js / TypeScript Unified Dashboard
        ├── src/app/             # Telemetry endpoints & Single Portal Routing
        └── src/components/      # React & 3D Force Graph Orb Visualization
```

---

## 2. Core Architecture Rules

1. **Local-First & High Performance:** No external cloud dependencies required for basic boot. Telemetry and state APIs must return instantly.
2. **Deterministic Statuses:** Integration states must be classified strictly as:
   - `Missing`: Service or executable not found on host.
   - `Detected`: Configuration or script files present, but service unreachable.
   - `Reachable`: HTTP ping or TCP connection successful.
   - `Confirmed`: Downstream verification passed, active payloads flowing.
3. **Never Speculate:** Playback quality state must be explicitly labeled as `confirmed`, `inferred`, or `unknown`.
4. **Stable Macro-Sections:** The graph must be grouped into stable domains mapped to predictable IDs (0-5) and HSL-tailored colors.

---

## 3. Creating the 3D Orb Component

The Hero Orb uses a glowing `3d-force-graph` visualization. Implement the following parameters in Next.js/React:

```typescript
// 1. Luminous Radial Glow Canvas
function buildHaloTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.2, "rgba(255,255,255,0.8)");
  g.addColorStop(0.5, "rgba(255,255,255,0.35)");
  g.addColorStop(0.8, "rgba(255,255,255,0.08)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.dispose = () => {}; // Protect from auto-disposal
  return tex;
}

// 2. Additive Blending for Node Sprites
const haloMat = new THREE.SpriteMaterial({
  map: haloTexture,
  color: new THREE.Color(nodeColor),
  transparent: true,
  opacity: emphasized ? 0.85 : 0.45,
  depthWrite: false,
  blending: THREE.AdditiveBlending, // Glow effect
});
```

---

## 4. Graph Mapping & Macro-Sections

Each node must be categorized into stable sections. Use `src/app/api/graphify/graph/route.ts` to assign properties dynamically:

* **Section 0 (Brain Portal UI):** `#7CA9FF`
* **Section 1 (Graphify / Orb):** `#00E5FF`
* **Section 2 (Brain Ops / Context):** `#E6C26E`
* **Section 3 (Integrations):** `#46D7C8`
* **Section 4 (Agent Handoff):** `#E07AA6`
* **Section 5 (Docs / Config / Runtime):** `#C9D2E3`

Keep the simulation warm by setting `graph.d3AlphaTarget(0.02)` to prevent cooling during auto-rotation.

---

## 5. Bootstrapping Checklist

- [ ] Initialize repository and configure `.gitignore` for local caches.
- [ ] Install FastAPI backend scaffold with `/health` endpoint.
- [ ] Configure Next.js frontend with unified `/` route.
- [ ] Extract repository graph using `Graphify` CLI/tooling to `graphify-out/graph.json`.
- [ ] Populate `docs/ai/PROJECT_STATE.md` to begin agent-session recording.
- [ ] Run typescript checks (`npx tsc --noEmit`) to verify compilation.

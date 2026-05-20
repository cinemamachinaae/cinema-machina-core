# Cinema Machina Brain Portal Implementation & Verification Walkthrough

The Cinema Machina Brain Portal is now fully upgraded into a single, premium live intelligence dashboard running at `http://127.0.0.1:3000/`.

## 1. Features & Architectural Upgrades

*   **Single-Portal Routing Guarantee:** Removed the standalone `/orb` experience and ensured that any visits to `/orb` cleanly redirect to `/`. No auto-redirect loop or console errors remain.
*   **Hero Orb Stabilization:** Restructured the 3D Force-Directed Graph component to render nodes as premium glowing sprites using custom Canvas particles and `THREE.NormalBlending`. The Orb stays indefinitely luminous and visually interactive without dimming or freezing.
*   **Hybrid Metadata Architecture:** Preserved Graphify's AST community logic for machine query integrity, while introducing a hybrid representation containing `macroSectionId`, `macroSectionLabel`, and `subcluster` tags for dashboard navigation, clustering, and inspectors.
*   **Persistent Agent Memory Cache:** Implemented local JSON and markdown file-backed caching under repo-root `graphify-out/` so the portal can serve graph intelligence quickly from the local SSD checkout.
*   **Integrated Agent Intelligence:**
    *   `graphify-out/AGENT_GRAPH_INDEX.md`: Compact map of the repository's core layers.
    *   `graphify-out/agent-query-cheatsheet.md`: Essential CLI query cheat sheet for incoming agents.
    *   `graphify-out/cluster-map.json`: A structured dictionary mapping nodes to macro-sections and subclusters.

---

## 2. Verification Performed

### Production Build & Linting
*   Ran `npm run lint` inside `tools/brain-portal/` with zero diagnostic errors.
*   Ran `npm run build` inside `tools/brain-portal/` which completed successfully with static site optimization.

### Live Browser & API Verification
*   Started the dev server using the custom local launcher:
    ```bash
    ./tools/brain-portal/start-dev.sh
    ```
*   Navigated to `http://127.0.0.1:3000/` and verified:
    *   The single-portal routing redirects `/orb` back to `/`.
    *   Console has no uncaught exceptions or resource load errors.
    *   Status panel API (`/api/status`) responds with realistic states for Ollama, Langflow, RuFlo, Codex, Antigravity, and OMEGA.
    *   Graphify query endpoint (`/api/graphify/graph`) successfully serves the cached metadata instantly.
    *   Right Inspector correctly lists the macro-sections, subclusters, and descriptions.

---

## 3. Launching Locally

The active workspace now lives on the local SSD path `$CM_CORE_HOME`. Start the dev server from that checkout:
```bash
source "$HOME/.config/cinema-machina/paths.sh"
cd "$CM_PORTAL_HOME"
./start-dev.sh
```
This uses normal local `node_modules` and binds to `0.0.0.0:3000` for local and Tailnet access.

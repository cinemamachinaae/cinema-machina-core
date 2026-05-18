# Cinema Machina Brain Portal - Design Specification & Implementation Blueprint

The goal of this initiative is to evolve the existing 3D Orb Brain viewer into a high-end, interactive "Cinema Machina Brain Portal." This portal will serve as a luxury technical dashboard for visualizing repository structure, AI enrichment state, OMEGA memory health, and local toolchain readiness (Ollama, Langflow, RuFlo, Codex).

> [!IMPORTANT]
> **Project Scope Clarity**
> - This is a separate internal Brain Portal, not a redesign of Cinema Machina Core’s existing product frontend.
> - The portal belongs strictly under `tools/brain-portal/`.
> - `graphify-out/Cinema-Machina-Core-Orb-Brain-3D.html` remains a supported Orb visualization asset, but the new Portal should become the main command-center surface.
> - Future AI enrichment via Ollama, Graphify metadata, OMEGA status, Langflow, and RuFlo should be designed as modular data adapters.

The visual language will adhere to a premium, cinematic, minimalist aesthetic—prioritizing deep dark sapphire/obsidian tones with luminous data, avoiding "gamer HUD" aesthetics in favor of Apple-level restraint.

## Architectural Recommendation

**Decision:** **Create a New Dedicated Portal App (Next.js)**
*   **Why:** To support live system toggles (Langflow, RuFlo, Ollama), Git state polling, and OMEGA memory integration, a dynamic frontend with a backend proxy is required.
*   **How:** We will scaffold a lightweight Next.js (or Vite/React) dashboard in `tools/brain-portal/`. The existing 3D Graphify Orb canvas will be ported into a dedicated React component (`<HeroOrbCanvas />`), extracting the core Three.js/Force-Graph logic from the static HTML while retaining the `orb-runtime.bundle.js` logic where possible.

## Layout Hierarchy & Component Structure

The portal follows a 4-zone cinematic layout:

### 1. `BrainPortalShell` (Main Layout Container)
*   Provides the global dark sapphire/obsidian background (`#02040a` to `#060b18`).
*   Manages the global state (selected node, active filters, live toolchain status).

### A. `HeroOrbZone` (Center/Background)
*   **Visuals:** Full-screen or large central canvas. Minimalist framing. Luminous nodes, deep space background.
*   **Effects:** Subtle parallax camera drift. Slow particle pulses along important relational links.
*   **Interactions:** Hover for quick tooltips. Click to pin node and populate the Right Inspector.

### B. `LeftControlRail` (Left Sidebar - 300px width, Glassmorphic)
*   **`BrainOverview`:** High-level project title and global graph health score.
*   **`SearchFilterPalette`:** Elegant input field. Filter toggles for: *File, Service, Backend, Frontend, Docs, Plex/Jellyfin, AI/Tooling*.
*   **`ViewModeSelector`:** Toggles for Community Focus Mode, Heat/Activity Overlay (recent git changes).

### C. `RightIntelligenceInspector` (Right Sidebar - 350px width, Glassmorphic)
*   **Empty State (`PortalSummaryView`):** Shows graph freshness, commit age, node counts, OMEGA readiness, AI enrichment completion %.
*   **Selected State (`NodeDetailView`):**
    *   Header: Title, Node Type, Importance.
    *   Metadata: Community tag, Source path, Connected nodes count.
    *   Intelligence: AI-generated summary, "Why this matters" section.
    *   Relations: Suggested related files.

### D. `BottomSystemPulseStrip` (Footer - 40px height, Fixed Bottom)
*   A slim, elegant, live status rail. Uses minimal icons and subtle color indicators (emerald for active, slate for inactive/unknown, amber for warnings).
*   **Items:** `Graphify (Fresh/Stale)`, `OMEGA (DB Status)`, `Ollama (Model)`, `Langflow (Port)`, `RuFlo (MCP)`, `Codex Hook`, `Git (Clean/Dirty)`.

### E. `DashboardOverlayPanels` (Modal/Expandable Cards)
*   Triggered from the Left Rail or Bottom Strip.
*   `GraphIntegrityCard`: Lists orphans, duplicate labels, corrupt chunks.
*   `AIEnrichmentCard`: Summaries of pending/completed node processing.
*   `DocsQualityCard`: Tracks presence of required architecture docs vs stale warnings.
*   `FutureInsightFeed`: Reserved stub area for Agent Activity Events and Anomalies.

## Premium Visual Rules & Design Tokens

To achieve the "Private Command Center" aesthetic without falling into cyberpunk clichés:

> [!TIP]
> **Design Philosophy:** "Luminous Data, Infinite Void." The UI chrome should recede; the data should emit light.

*   **Color Palette:**
    *   **Background:** Obsidian / Deep Sapphire (`#02040a`, `#060b18`).
    *   **Panels:** Translucent glass (`rgba(10, 15, 30, 0.4)`), 1px solid subtle borders (`rgba(255,255,255, 0.05)`).
    *   **Text:** Primary (`#F3F4F6`), Secondary (`#9CA3AF`), Tertiary/Labels (`#6B7280`).
    *   **Accent (Luminous Data):** Electric Cyan (`#00E5FF`), Bioluminescent Blue (`#3B82F6`), Alert Amber (`#F59E0B` for warnings, sparingly).
*   **Typography:**
    *   Use highly legible, technical sans-serif (e.g., `Inter`, `Geist Mono` for code/paths, `Outfit` for display).
    *   Strict hierarchy. Small uppercase tracking for section headers (e.g., `GRAPH FRESHNESS`).
*   **Animation Budget:**
    *   **Desktop:** Premium restrained motion with subtle living graph motion, pulse trails, particle accents, and refined transitions.
    *   **Mobile/iPhone:** Reduced particle density and simplified effects for responsiveness.
    *   **Rule:** Prioritize elegance and clarity over visual overload. No flashing or strobe effects.
*   **Iconography:**
    *   Use Lucide-style thin-line monochrome icons (or equivalent minimal line icons) to maintain technical restraint and an Apple-level look.

## Precise Implementation Brief for Codex

Codex will execute the following steps safely:

1.  **Scaffolding (`Phase 1`):**
    *   Initialize a new Next.js 14+ (App Router) environment inside the `Cinema Machina Core` monorepo at `tools/brain-portal/`.
    *   Install Tailwind CSS v4 and configure the premium design tokens (obsidian colors, glass utilities).
    *   Install Lucide-react for iconography.
2.  **Layout Shell Integration (`Phase 2`):**
    *   Build the `BrainPortalShell` layout.
    *   Create static, visually accurate mockups of the `LeftControlRail`, `RightIntelligenceInspector`, and `BottomSystemPulseStrip` using hardcoded data to establish the aesthetic.
3.  **Orb Integration (`Phase 3`):**
    *   Migrate the Graphify `3d-force-graph` instantiation into a React `useEffect` inside a `<HeroOrbCanvas />` component.
    *   Apply the refined particle movement and camera drift logic as per the animation budget.
4.  **Data Wiring (Subsequent Phases):**
    *   Connect the Left and Right panels to the Orb's `onNodeClick` and `onNodeHover` events.
    *   Implement API routes to fetch real system data using modular data adapters (Ollama status, Graphify metadata, OMEGA status, Langflow, RuFlo).

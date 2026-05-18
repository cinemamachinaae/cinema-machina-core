# Cinema Machina Brain Portal Implementation Tasks

This checklist is to guide Codex through the implementation of the Brain Portal, as defined in the approved `implementation_plan.md` design blueprint.

- `[ ]` **Phase 1: Project Scaffolding**
  - `[ ]` Initialize Next.js 14+ (App Router) environment in the designated portal directory at `tools/brain-portal/`.
  - `[ ]` Install Tailwind CSS v4 and configure the Cinema Machina premium design tokens (obsidian backgrounds, glassmorphism utilities, cyan/blue accent colors).
  - `[ ]` Install Lucide-react for thin-line monochrome icons.
- `[ ]` **Phase 2: Layout Shell Construction**
  - `[ ]` Build `BrainPortalShell` main layout component to handle the global dark sapphire aesthetic and core routing.
  - `[ ]` Build and style the `LeftControlRail` (Brain Overview, SearchFilterPalette, ViewModeSelector).
  - `[ ]` Build and style the `RightIntelligenceInspector` (PortalSummaryView empty state, NodeDetailView selected state).
  - `[ ]` Build and style the `BottomSystemPulseStrip` (Status indicators for Graphify, OMEGA, Ollama, Langflow, RuFlo, Codex, Git).
- `[ ]` **Phase 3: 3D Orb Integration**
  - `[ ]` Create the `<HeroOrbCanvas />` React component.
  - `[ ]` Migrate the `3d-force-graph` and Three.js logic from `Cinema-Machina-Core-Orb-Brain-3D.html` into the React component.
  - `[ ]` Apply refined visual effects (Desktop: subtle living motion, pulse trails, particle accents. Mobile: reduced density for responsiveness).
- `[ ]` **Phase 4: Component Wiring & Overlay Panels**
  - `[ ]` Wire the Orb's `onNodeClick` and `onNodeHover` events to update global state and populate the `RightIntelligenceInspector`.
  - `[ ]` Build the `DashboardOverlayPanels` (GraphIntegrityCard, AIEnrichmentCard, DocsQualityCard) as modal or expandable overlay components.
  - `[ ]` Scaffold stub panels for future AI Insight Feed integrations.
- `[ ]` **Phase 5: Data Integration & System Status**
  - `[ ]` Implement local API routes or hooks to fetch real-time Git status.
  - `[ ]` Implement integration to check local Ollama availability and model status.
  - `[ ]` Integrate live Graphify JSON data parsing to populate node counts and integrity checks.
  - `[ ]` (Optional) Connect to Langflow/RuFlo status APIs if available.

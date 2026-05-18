"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchApiJsonResult, resolveApiBaseUrl } from "../lib/api";

type Confidence = "confirmed" | "inferred" | "unknown";

type HealthStatus = {
  status: string;
  service: string;
  confidence: Confidence;
};

type PlaybackSession = {
  title: string | null;
  user: string | null;
  client_name: string | null;
  decision: string;
  confidence: Confidence;
};

type PlaybackState = {
  sessions: PlaybackSession[];
  sources_checked: string[];
  error: string | null;
};

type SourceMediaState = {
  codec: string | null;
  codec_confidence: Confidence;
  container: string | null;
  container_confidence: Confidence;
  bitrate_kbps: number | null;
  bitrate_confidence: Confidence;
  hdr_format: string | null;
  hdr_confidence: Confidence;
  audio_codec: string | null;
  audio_codec_confidence: Confidence;
};

type OutputState = {
  video_mode: string | null;
  video_mode_confidence: Confidence;
  audio_mode: string | null;
  audio_mode_confidence: Confidence;
  passthrough: boolean | null;
  passthrough_confidence: Confidence;
};

type DeviceState = {
  name: string | null;
  name_confidence: Confidence;
  kind: string | null;
  kind_confidence: Confidence;
  reachable?: boolean | null;
  reachable_confidence?: Confidence;
  foreground_app?: string | null;
  foreground_app_confidence?: Confidence;
  foreground_package?: string | null;
  foreground_package_confidence?: Confidence;
};

type ChainSnapshot = {
  active: boolean;
  confidence: Confidence;
  source: SourceMediaState | null;
  media_server: DeviceState | null;
  playback_client: DeviceState | null;
  display_device: DeviceState | null;
  audio_device: DeviceState | null;
  output_state: OutputState | null;
  warnings: string[];
};

type ShieldState = {
  configured: boolean;
  reachable: boolean | null;
  reachable_confidence: Confidence;
  adb_connected: boolean | null;
  adb_connected_confidence: Confidence;
  connection_state: string | null;
  connection_state_confidence: Confidence;
  foreground_app_name: string | null;
  foreground_app_name_confidence: Confidence;
  foreground_app: string | null;
  foreground_app_confidence: Confidence;
  foreground_package: string | null;
  foreground_package_confidence: Confidence;
  media_session_summary: string | null;
  media_session_summary_confidence: Confidence;
  display_mode: string | null;
  display_mode_confidence: Confidence;
  confidence: Confidence;
  warnings: string[];
};

type ConfiguredSourceState = {
  configured: boolean;
  confidence: Confidence;
};

type ConfiguredSources = {
  plex: ConfiguredSourceState;
  jellyfin: ConfiguredSourceState;
  shield: ConfiguredSourceState;
};

type SystemOverview = {
  timestamp: string;
  health: HealthStatus;
  playback: PlaybackState;
  chain: ChainSnapshot;
  shield: ShieldState;
  configured_sources: ConfiguredSources;
  warnings: string[];
};

type DashboardState = {
  health: HealthStatus | null;
  overview: SystemOverview | null;
  diagnostics: string[];
  lastUpdated: string | null;
};

const REFRESH_INTERVAL_MS = 5000;

const defaultHealth: HealthStatus = {
  status: "unknown",
  service: "cinema-machina-core",
  confidence: "unknown",
};

const defaultPlayback: PlaybackState = {
  sessions: [],
  sources_checked: [],
  error: null,
};

const defaultChain: ChainSnapshot = {
  active: false,
  confidence: "unknown",
  source: null,
  media_server: null,
  playback_client: null,
  display_device: null,
  audio_device: null,
  output_state: null,
  warnings: [],
};

const defaultShield: ShieldState = {
  configured: false,
  reachable: null,
  reachable_confidence: "unknown",
  adb_connected: null,
  adb_connected_confidence: "unknown",
  connection_state: null,
  connection_state_confidence: "unknown",
  foreground_app_name: null,
  foreground_app_name_confidence: "unknown",
  foreground_app: null,
  foreground_app_confidence: "unknown",
  foreground_package: null,
  foreground_package_confidence: "unknown",
  media_session_summary: null,
  media_session_summary_confidence: "unknown",
  display_mode: null,
  display_mode_confidence: "unknown",
  confidence: "unknown",
  warnings: [],
};

const defaultConfiguredSources: ConfiguredSources = {
  plex: { configured: false, confidence: "confirmed" },
  jellyfin: { configured: false, confidence: "confirmed" },
  shield: { configured: false, confidence: "confirmed" },
};

const defaultOverview: SystemOverview = {
  timestamp: "",
  health: defaultHealth,
  playback: defaultPlayback,
  chain: defaultChain,
  shield: defaultShield,
  configured_sources: defaultConfiguredSources,
  warnings: [],
};

const defaultState: DashboardState = {
  health: null,
  overview: null,
  diagnostics: [],
  lastUpdated: null,
};

const navigation = [
  "Overview",
  "Playback Chain",
  "Source Integrity",
  "Device Recognition",
  "Diagnostics",
];

const chainNodes = [
  { key: "source", label: "Source" },
  { key: "media_server", label: "Server" },
  { key: "playback_client", label: "Client" },
  { key: "display_device", label: "Display" },
  { key: "audio_device", label: "Audio" },
] as const;

function confidenceTone(confidence: Confidence): string {
  if (confidence === "confirmed") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-100";
  }

  if (confidence === "inferred") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-50";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString()} kbps`;
  }

  return value.replace(/_/g, " ");
}

function formatDecision(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(value: boolean | null | undefined): string {
  if (value === true) {
    return "Online";
  }

  if (value === false) {
    return "Offline";
  }

  return "Unknown";
}

function shieldReachabilityLabel(shield: ShieldState): string {
  if (!shield.configured) {
    return "Unconfigured";
  }

  if (shield.reachable === true) {
    return "Reachable";
  }

  if (shield.reachable === false) {
    return "Unreachable";
  }

  return "Unknown";
}

function apiStateLabel(isLoading: boolean, health: HealthStatus | null, overview: SystemOverview | null, diagnostics: string[]): string {
  if (isLoading && health === null && overview === null) {
    return "Checking";
  }

  if (health?.status === "ok" && overview !== null && diagnostics.length === 0) {
    return "Healthy";
  }

  if (health?.status === "ok" || overview !== null) {
    return "Degraded";
  }

  return "Offline";
}

function apiStateTone(label: string): "default" | "online" | "warning" {
  if (label === "Healthy") {
    return "online";
  }

  if (label === "Degraded") {
    return "warning";
  }

  return "default";
}

function formatLastUpdated(value: string | null): string {
  if (!value) {
    return "Awaiting first sample";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Awaiting first sample";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeOverview(overview: SystemOverview | null): SystemOverview {
  if (overview === null) {
    return defaultOverview;
  }

  return {
    timestamp: overview.timestamp ?? "",
    health: overview.health ?? defaultHealth,
    playback: {
      sessions: Array.isArray(overview.playback?.sessions) ? overview.playback.sessions : [],
      sources_checked: Array.isArray(overview.playback?.sources_checked)
        ? overview.playback.sources_checked
        : [],
      error: overview.playback?.error ?? null,
    },
    chain: {
      ...defaultChain,
      ...overview.chain,
      warnings: Array.isArray(overview.chain?.warnings) ? overview.chain.warnings : [],
    },
    shield: {
      ...defaultShield,
      ...overview.shield,
      warnings: Array.isArray(overview.shield?.warnings) ? overview.shield.warnings : [],
    },
    configured_sources: {
      plex: overview.configured_sources?.plex ?? defaultConfiguredSources.plex,
      jellyfin: overview.configured_sources?.jellyfin ?? defaultConfiguredSources.jellyfin,
      shield: overview.configured_sources?.shield ?? defaultConfiguredSources.shield,
    },
    warnings: Array.isArray(overview.warnings) ? overview.warnings : [],
  };
}

function summarizeWarning(warning: string): string {
  const trimmed = warning.trim();
  if (!trimmed) {
    return "Diagnostic event reported.";
  }

  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("plex:")) {
    return "Plex integration reported an error.";
  }
  if (lowered.startsWith("jellyfin:")) {
    return "Jellyfin integration reported an error.";
  }

  return trimmed.length > 180 ? `${trimmed.slice(0, 176)}...` : trimmed;
}

function sourceHealthTone(
  configured: boolean,
  checked: boolean,
  hasIssue: boolean,
): "default" | "online" | "warning" {
  if (!configured) {
    return "default";
  }
  if (hasIssue) {
    return "warning";
  }
  if (checked) {
    return "online";
  }
  return "default";
}

function sourceStatusLabel(configured: boolean, checked: boolean, hasIssue: boolean): string {
  if (!configured) {
    return "Unconfigured";
  }
  if (hasIssue) {
    return "Degraded";
  }
  return checked ? "Online" : "Idle";
}

function getChainNodePresentation(
  key: (typeof chainNodes)[number]["key"],
  chain: ChainSnapshot,
): {
  value: string;
  detail: string;
  confidence: Confidence;
} {
  if (key === "source") {
    return {
      value: chain.source?.codec ?? "Unknown",
      detail: chain.source?.container ?? "Telemetry pending",
      confidence: chain.source?.codec_confidence ?? "unknown",
    };
  }

  const node = chain[key];
  return {
    value: node?.name ?? "Unknown",
    detail: node?.kind ?? "Telemetry pending",
    confidence: node?.name_confidence ?? "unknown",
  };
}

function StatusChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "online" | "warning";
}) {
  const toneClass =
    tone === "online"
      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-100"
      : tone === "warning"
        ? "border-amber-300/35 bg-amber-300/12 text-amber-50"
        : "border-white/10 bg-white/5 text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${confidenceTone(confidence)}`}
    >
      {confidence}
    </span>
  );
}

function Panel({
  title,
  eyebrow,
  children,
  online = false,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  online?: boolean;
}) {
  return (
    <section
      className={`glass-panel dashboard-card rounded-[24px] border border-white/8 p-5 shadow-[0_20px_44px_rgba(0,0,0,0.24)] ${online ? "dashboard-card-online" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function DataLine({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence?: Confidence;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/6 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-sm text-slate-100">{value}</span>
        {confidence ? <ConfidenceChip confidence={confidence} /> : null}
      </div>
    </div>
  );
}

function DeviceCard({
  label,
  value,
  detail,
  confidence,
}: {
  label: string;
  value: string;
  detail: string;
  confidence: Confidence;
}) {
  return (
    <div className="dashboard-card rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <ConfidenceChip confidence={confidence} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-100">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{detail}</p>
    </div>
  );
}

function SourceTile({
  label,
  configured,
  checked,
  hasIssue,
  sessions,
  confidence,
}: {
  label: string;
  configured: boolean;
  checked: boolean;
  hasIssue: boolean;
  sessions: number;
  confidence: Confidence;
}) {
  const tone = sourceHealthTone(configured, checked, hasIssue);
  const status = sourceStatusLabel(configured, checked, hasIssue);

  return (
    <div className="dashboard-card rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-sm font-medium text-slate-100">{status}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusChip label={status} tone={tone} />
          <ConfidenceChip confidence={confidence} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <p>Checked</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{checked ? "Yes" : "No"}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <p>Sessions</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{sessions}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-6 text-sm text-slate-300">
      {text}
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("http://127.0.0.1:8000");
  const refreshInFlight = useRef(false);
  const refreshController = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshDashboard(initialLoad: boolean): Promise<void> {
      if (!initialLoad && refreshInFlight.current) {
        return;
      }

      refreshInFlight.current = true;
      refreshController.current?.abort();
      const controller = new AbortController();
      refreshController.current = controller;

      try {
        if (initialLoad) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const [healthResult, overviewResult] = await Promise.all([
          fetchApiJsonResult<HealthStatus>("/health", {
            signal: controller.signal,
            timeoutMs: 5000,
          }),
          fetchApiJsonResult<SystemOverview>("/system/overview", {
            signal: controller.signal,
            timeoutMs: 6000,
          }),
        ]);

        if (cancelled) {
          return;
        }

        const diagnostics: string[] = [];
        if (!healthResult.ok) {
          diagnostics.push("Health endpoint is unavailable.");
        }
        if (!overviewResult.ok) {
          diagnostics.push("System overview is unavailable.");
        }

        const sampleTime = new Date().toISOString();
        setState((previous) => ({
          health: healthResult.ok ? healthResult.data : previous.health,
          overview: overviewResult.ok ? normalizeOverview(overviewResult.data) : previous.overview,
          diagnostics,
          lastUpdated: healthResult.ok || overviewResult.ok ? sampleTime : previous.lastUpdated,
        }));
        setIsLoading(false);
        setIsRefreshing(false);
      } finally {
        refreshInFlight.current = false;
      }
    }

    refreshDashboard(true).catch(() => {
      if (!cancelled) {
        setState({
          health: null,
          overview: null,
          diagnostics: ["Dashboard refresh is unavailable."],
          lastUpdated: null,
        });
        setIsLoading(false);
        setIsRefreshing(false);
        refreshInFlight.current = false;
      }
    });

    const interval = window.setInterval(() => {
      refreshDashboard(false).catch(() => {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            diagnostics: ["Dashboard refresh is unavailable."],
          }));
          setIsRefreshing(false);
          refreshInFlight.current = false;
        }
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      refreshController.current?.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setApiBaseUrl(resolveApiBaseUrl());
  }, []);

  const health = state.health ?? defaultHealth;
  const overview = useMemo(() => normalizeOverview(state.overview), [state.overview]);
  const playback = overview.playback;
  const chain = overview.chain;
  const shield = overview.shield;
  const configuredSources = overview.configured_sources;
  const activeSession = playback.sessions[0] ?? null;
  const systemOnline = health.status === "ok";
  const apiState = apiStateLabel(isLoading, state.health, state.overview, state.diagnostics);
  const diagnostics = [...overview.warnings.map(summarizeWarning), ...state.diagnostics];
  const sourceSummary = chain.source;
  const output = chain.output_state;
  const warningsJoined = diagnostics.join(" ").toLowerCase();
  const plexIssue = warningsJoined.includes("plex integration reported");
  const jellyfinIssue = warningsJoined.includes("jellyfin integration reported");
  const shieldIssue =
    warningsJoined.includes("shield is unreachable") ||
    warningsJoined.includes("adb executable is not available") ||
    warningsJoined.includes("adb connection timed out");

  const sourcesChecked = new Set(playback.sources_checked ?? []);
  const plexChecked = sourcesChecked.has("plex");
  const jellyfinChecked = sourcesChecked.has("jellyfin");
  const shieldChecked = shield.configured;
  const totalSessions = playback.sessions?.length ?? 0;
  return (
    <main className="cinema-ambient signal-grid min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 md:px-6 xl:px-8">
        <aside className="hidden w-72 shrink-0 flex-col justify-between rounded-[28px] border border-white/8 bg-black/25 p-5 backdrop-blur-md lg:flex">
          <div>
            <div className={`glass-panel dashboard-card rounded-[24px] border border-white/8 p-5 ${systemOnline ? "dashboard-card-online" : ""}`}>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Cinema Machina</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-[0.08em] text-slate-50">Core</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Local-first monitoring for the source-to-screen playback chain.
              </p>
            </div>

            <nav className="mt-8 space-y-2">
              {navigation.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-xl border px-4 py-3 text-sm tracking-[0.12em] ${
                    index === 0
                      ? "border-white/12 bg-white/[0.07] text-slate-50"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  {item}
                </div>
              ))}
            </nav>
          </div>

          <div className={`glass-panel dashboard-card rounded-[24px] border border-white/8 p-4 ${systemOnline ? "dashboard-card-online" : ""}`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Refresh Loop</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip
                label={isRefreshing ? "Refreshing" : "Monitoring"}
                tone={isRefreshing ? "warning" : "online"}
              />
              <StatusChip label={formatLastUpdated(state.lastUpdated)} />
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              Polling every 5 seconds with a production-safe read-only overview.
            </p>
          </div>
        </aside>

        <div className="flex-1">
          <header className={`glass-panel dashboard-card rounded-[28px] border border-white/8 px-5 py-5 ${systemOnline ? "dashboard-card-online" : ""}`}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Production Monitoring UI
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-[0.06em] text-slate-50 md:text-3xl">
                  Playback Chain Control Room
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  A truthful monitoring surface for source capability, server decisions, client state, and device recognition.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className={`dashboard-card rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ${systemOnline ? "dashboard-card-online" : ""}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">System Online</p>
                  <div className="mt-3 flex items-center gap-2">
                    <StatusChip label={systemOnline ? "Online" : isLoading ? "Checking" : "Offline"} tone={systemOnline ? "online" : "default"} />
                  </div>
                </div>
                <div className={`dashboard-card rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ${systemOnline ? "dashboard-card-online" : ""}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signal Confidence</p>
                  <div className="mt-3">
                    <ConfidenceChip confidence={chain.confidence} />
                  </div>
                </div>
                <div className={`dashboard-card rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ${chain.active ? "dashboard-card-online" : ""}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active Playback</p>
                  <p className="mt-3 text-base font-medium text-slate-100">
                    {chain.active ? "Detected" : "No active playback"}
                  </p>
                </div>
                <div className={`dashboard-card rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ${apiState === "Healthy" ? "dashboard-card-online" : ""}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Backend API State</p>
                  <div className="mt-3">
                    <StatusChip label={apiState} tone={apiStateTone(apiState)} />
                  </div>
                </div>
                <div className="dashboard-card rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last Updated</p>
                  <p className="mt-3 text-base font-medium text-slate-100">{formatLastUpdated(state.lastUpdated)}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Panel title="Live Playback Chain Map" eyebrow="Playback Chain" online={systemOnline}>
              <div className={`grid gap-3 md:grid-cols-5 ${isLoading ? "scanline-loading" : ""} ${systemOnline ? "chain-online" : ""}`}>
                {chainNodes.map((node) => {
                  const presentation = getChainNodePresentation(node.key, chain);

                  return (
                    <div
                      key={node.label}
                      className={`chain-link dashboard-card rounded-2xl border border-white/8 bg-black/20 p-4 ${systemOnline ? "dashboard-card-online" : ""}`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{node.label}</p>
                      <p className="mt-4 text-sm font-medium text-slate-100">{formatDecision(presentation.value)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {formatDecision(presentation.detail)}
                      </p>
                      <div className="mt-4">
                        <ConfidenceChip confidence={presentation.confidence} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                {chain.active ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                    Live chain data is anchored in real media-session metadata. Downstream display and audio fields remain intentionally unknown until those integrations are available.
                  </div>
                ) : (
                  <EmptyState text="No active playback detected" />
                )}
              </div>
            </Panel>

            <Panel title="Configured Sources" eyebrow="System Inputs" online={systemOnline}>
              <div className="grid gap-3">
                <SourceTile
                  label="Plex"
                  configured={configuredSources.plex.configured}
                  checked={plexChecked}
                  hasIssue={plexIssue}
                  sessions={totalSessions}
                  confidence={configuredSources.plex.confidence}
                />
                <SourceTile
                  label="Jellyfin"
                  configured={configuredSources.jellyfin.configured}
                  checked={jellyfinChecked}
                  hasIssue={jellyfinIssue}
                  sessions={totalSessions}
                  confidence={configuredSources.jellyfin.confidence}
                />
                <SourceTile
                  label="Shield"
                  configured={configuredSources.shield.configured}
                  checked={shieldChecked}
                  hasIssue={shieldIssue}
                  sessions={shield.foreground_app_name ? 1 : 0}
                  confidence={configuredSources.shield.confidence}
                />
              </div>
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">API Connection</p>
                <p className="mt-3 text-sm text-slate-100">{apiBaseUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusChip label={apiState} tone={apiStateTone(apiState)} />
                  <ConfidenceChip confidence={health.confidence} />
                </div>
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Source File Capability" eyebrow="Source Intelligence" online={systemOnline}>
              {chain.active ? (
                <div className="grid gap-2">
                  <DataLine label="Video Codec" value={formatDecision(sourceSummary?.codec)} confidence={sourceSummary?.codec_confidence} />
                  <DataLine label="Container" value={formatDecision(sourceSummary?.container)} confidence={sourceSummary?.container_confidence} />
                  <DataLine label="Bitrate" value={formatValue(sourceSummary?.bitrate_kbps)} confidence={sourceSummary?.bitrate_confidence} />
                  <DataLine label="HDR" value={formatDecision(sourceSummary?.hdr_format)} confidence={sourceSummary?.hdr_confidence} />
                  <DataLine label="Audio Codec" value={formatDecision(sourceSummary?.audio_codec)} confidence={sourceSummary?.audio_codec_confidence} />
                </div>
              ) : (
                <EmptyState text="No active playback detected" />
              )}
            </Panel>

            <Panel title="Media Server Decision" eyebrow="Server State" online={systemOnline}>
              <div className="grid gap-2">
                <DataLine label="Server" value={formatDecision(chain.media_server?.name)} confidence={chain.media_server?.name_confidence} />
                <DataLine label="Decision" value={formatDecision(activeSession?.decision)} confidence={activeSession?.confidence ?? "unknown"} />
                <DataLine label="User" value={formatDecision(activeSession?.user)} />
                <DataLine
                  label="Checked Sources"
                  value={playback.sources_checked.length > 0 ? playback.sources_checked.map(formatDecision).join(", ") : "None"}
                />
              </div>
            </Panel>

            <Panel title="Playback Client Device" eyebrow="Client State" online={systemOnline}>
              <div className="grid gap-2">
                <DataLine label="Client" value={formatDecision(chain.playback_client?.name)} confidence={chain.playback_client?.name_confidence} />
                <DataLine label="Kind" value={formatDecision(chain.playback_client?.kind)} confidence={chain.playback_client?.kind_confidence} />
                <DataLine label="Reachable" value={statusLabel(chain.playback_client?.reachable)} confidence={chain.playback_client?.reachable_confidence ?? "unknown"} />
                <DataLine label="Foreground App" value={formatDecision(shield.foreground_app_name ?? chain.playback_client?.foreground_app)} confidence={shield.foreground_app_name ? shield.foreground_app_name_confidence : chain.playback_client?.foreground_app_confidence ?? "unknown"} />
                <DataLine label="Foreground Package" value={formatDecision(shield.foreground_package ?? chain.playback_client?.foreground_package)} confidence={shield.foreground_package ? shield.foreground_package_confidence : chain.playback_client?.foreground_package_confidence ?? "unknown"} />
              </div>
            </Panel>

            <Panel title="Display Device" eyebrow="Display State" online={systemOnline}>
              <div className="grid gap-2">
                <DataLine label="Display" value={formatDecision(chain.display_device?.name)} confidence={chain.display_device?.name_confidence} />
                <DataLine label="Class" value={formatDecision(chain.display_device?.kind)} confidence={chain.display_device?.kind_confidence} />
                <DataLine label="Display Mode" value={formatDecision(shield.display_mode ?? output?.video_mode)} confidence={shield.display_mode ? shield.display_mode_confidence : output?.video_mode_confidence ?? "unknown"} />
                <DataLine label="Signal Confidence" value={chain.active ? "Monitoring" : "Idle"} confidence={chain.confidence} />
              </div>
            </Panel>

            <Panel title="Audio Chain" eyebrow="Audio State" online={systemOnline}>
              <div className="grid gap-2">
                <DataLine label="Audio Device" value={formatDecision(chain.audio_device?.name)} confidence={chain.audio_device?.name_confidence} />
                <DataLine label="Device Class" value={formatDecision(chain.audio_device?.kind)} confidence={chain.audio_device?.kind_confidence} />
                <DataLine label="Audio Mode" value={formatDecision(output?.audio_mode)} confidence={output?.audio_mode_confidence ?? "unknown"} />
                <DataLine
                  label="Passthrough"
                  value={
                    output?.passthrough === true
                      ? "Enabled"
                      : output?.passthrough === false
                        ? "Disabled"
                        : "Unknown"
                  }
                  confidence={output?.passthrough_confidence ?? "unknown"}
                />
              </div>
            </Panel>

            <Panel title="Signal Integrity" eyebrow="Transport State" online={systemOnline}>
              <div className="grid gap-2">
                <DataLine label="Video Mode" value={formatDecision(output?.video_mode)} confidence={output?.video_mode_confidence ?? "unknown"} />
                <DataLine label="Audio Mode" value={formatDecision(output?.audio_mode)} confidence={output?.audio_mode_confidence ?? "unknown"} />
                <DataLine
                  label="Passthrough"
                  value={
                    output?.passthrough === true
                      ? "Enabled"
                      : output?.passthrough === false
                        ? "Disabled"
                        : "Unknown"
                  }
                  confidence={output?.passthrough_confidence ?? "unknown"}
                />
                <DataLine label="Shield Display Mode" value={formatDecision(shield.display_mode)} confidence={shield.display_mode_confidence} />
                <DataLine label="Overview Confidence" value={formatDecision(chain.confidence)} confidence={chain.confidence} />
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <Panel title="Device Recognition" eyebrow="Read-Only Device Monitor" online={systemOnline}>
              <div className="grid gap-3 md:grid-cols-3">
                <DeviceCard
                  label="Shield"
                  value={shieldReachabilityLabel(shield)}
                  detail={shield.foreground_app_name ?? "Foreground app unknown"}
                  confidence={shield.confidence}
                />
                <DeviceCard
                  label="Display"
                  value={formatDecision(chain.display_device?.name)}
                  detail={formatDecision(shield.display_mode)}
                  confidence={shield.display_mode ? shield.display_mode_confidence : chain.display_device?.name_confidence ?? "unknown"}
                />
                <DeviceCard
                  label="Audio"
                  value={formatDecision(chain.audio_device?.name)}
                  detail={
                    output?.passthrough === true
                      ? "Passthrough enabled"
                      : output?.passthrough === false
                        ? "Passthrough disabled"
                        : "Passthrough unknown"
                  }
                  confidence={output?.passthrough_confidence ?? chain.audio_device?.name_confidence ?? "unknown"}
                />
              </div>

              <div className="mt-5 grid gap-2">
                <DataLine label="Configured" value={shield.configured ? "Yes" : "No"} confidence="confirmed" />
                <DataLine label="Reachable" value={statusLabel(shield.reachable)} confidence={shield.reachable_confidence} />
                <DataLine label="ADB Connected" value={statusLabel(shield.adb_connected)} confidence={shield.adb_connected_confidence} />
                <DataLine label="Foreground App" value={formatDecision(shield.foreground_app_name)} confidence={shield.foreground_app_name_confidence} />
                <DataLine label="Foreground Package" value={formatDecision(shield.foreground_package)} confidence={shield.foreground_package_confidence} />
                <DataLine label="Media Session" value={formatDecision(shield.media_session_summary)} confidence={shield.media_session_summary_confidence} />
                <DataLine label="Display Mode" value={formatDecision(shield.display_mode)} confidence={shield.display_mode_confidence} />
              </div>
            </Panel>

            <Panel title="Diagnostics and Warnings" eyebrow="System Diagnostics" online={systemOnline}>
              {diagnostics.length === 0 ? (
                <EmptyState text="No diagnostics raised" />
              ) : (
                <div className="space-y-3">
                  {diagnostics.map((warning) => (
                    <div
                      key={warning}
                      className="rounded-2xl border border-amber-300/20 bg-amber-300/6 px-4 py-4 text-sm leading-6 text-amber-50"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}

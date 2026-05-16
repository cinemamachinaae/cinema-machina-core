"use client";

import { useEffect, useState } from "react";

import { fetchApiJson } from "../lib/api";

type HealthStatus = {
  status: string;
  service?: string;
  confidence: "confirmed" | "inferred" | "unknown";
};

type PlaybackSession = {
  title: string | null;
  user: string | null;
  client_name: string | null;
  decision: string;
};

type PlaybackState = {
  sessions: PlaybackSession[];
  sources_checked: string[];
  error: string | null;
};

type Confidence = "confirmed" | "inferred" | "unknown";

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

type DeviceState = {
  name: string | null;
  name_confidence: Confidence;
  kind: string | null;
  kind_confidence: Confidence;
  reachable: boolean | null;
  reachable_confidence: Confidence;
  foreground_app: string | null;
  foreground_app_confidence: Confidence;
  foreground_package: string | null;
  foreground_package_confidence: Confidence;
};

type OutputState = {
  video_mode: string | null;
  video_mode_confidence: Confidence;
  audio_mode: string | null;
  audio_mode_confidence: Confidence;
  passthrough: boolean | null;
  passthrough_confidence: Confidence;
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
  connection_state: string | null;
  connection_state_confidence: Confidence;
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

type LoadState = {
  health: HealthStatus | null;
  playback: PlaybackState | null;
  chain: ChainSnapshot | null;
  shield: ShieldState | null;
  errors: string[];
};

const initialState: LoadState = {
  health: null,
  playback: null,
  chain: null,
  shield: null,
  errors: [],
};

const navItems = [
  "Overview",
  "Playback Chain",
  "Devices",
  "Signals",
  "Diagnostics",
];

const chainStages = [
  { key: "source", label: "Source" },
  { key: "media_server", label: "Server" },
  { key: "playback_client", label: "Client" },
  { key: "display_device", label: "Display" },
  { key: "audio_device", label: "Audio" },
] as const;

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unknown";
  }

  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString()} kbps`;
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function confidenceTone(confidence: Confidence): string {
  if (confidence === "confirmed") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (confidence === "inferred") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function StatusChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "online";
}) {
  const toneClass =
    tone === "online"
      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-100"
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
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-100">{value}</span>
        {confidence ? <ConfidenceChip confidence={confidence} /> : null}
      </div>
    </div>
  );
}

function DeviceCard({
  label,
  device,
}: {
  label: string;
  device: DeviceState | null;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <ConfidenceChip confidence={device?.kind_confidence ?? "unknown"} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-100">
        {device?.name ?? "Unknown"}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {device?.kind ? device.kind.replace(/_/g, " ") : "Awaiting telemetry"}
      </p>
    </div>
  );
}

function shieldStatusLabel(shield: ShieldState | null): string {
  if (shield === null || shield.configured === false) {
    return "Unknown";
  }

  if (shield.reachable === true) {
    return "Reachable";
  }

  if (shield.reachable === false) {
    return "Unreachable";
  }

  return "Unknown";
}

export default function Dashboard() {
  const [state, setState] = useState<LoadState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard(): Promise<void> {
      setIsLoading(true);

      const [healthResult, playbackResult, chainResult, shieldResult] = await Promise.allSettled([
        fetchApiJson<HealthStatus>("/health"),
        fetchApiJson<PlaybackState>("/playback/current"),
        fetchApiJson<ChainSnapshot>("/chain/current"),
        fetchApiJson<ShieldState>("/devices/shield/state"),
      ]);

      if (cancelled) {
        return;
      }

      const errors: string[] = [];

      if (healthResult.status === "rejected") {
        errors.push(`Health API: ${healthResult.reason instanceof Error ? healthResult.reason.message : "Unknown error"}`);
      }

      if (playbackResult.status === "rejected") {
        errors.push(`Playback API: ${playbackResult.reason instanceof Error ? playbackResult.reason.message : "Unknown error"}`);
      }

      if (chainResult.status === "rejected") {
        errors.push(`Chain API: ${chainResult.reason instanceof Error ? chainResult.reason.message : "Unknown error"}`);
      }

      if (shieldResult.status === "rejected") {
        errors.push(`Shield API: ${shieldResult.reason instanceof Error ? shieldResult.reason.message : "Unknown error"}`);
      }

      setState({
        health: healthResult.status === "fulfilled" ? healthResult.value : null,
        playback: playbackResult.status === "fulfilled" ? playbackResult.value : null,
        chain: chainResult.status === "fulfilled" ? chainResult.value : null,
        shield: shieldResult.status === "fulfilled" ? shieldResult.value : null,
        errors,
      });
      setIsLoading(false);
    }

    loadDashboard().catch(() => {
      if (!cancelled) {
        setState({
          health: null,
          playback: null,
          chain: null,
          shield: null,
          errors: ["Dashboard refresh failed."],
        });
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const health = state.health;
  const playback = state.playback;
  const chain = state.chain;
  const shield = state.shield;
  const systemOnline = health?.status === "ok";
  const warnings = [
    ...(chain?.warnings ?? []),
    ...(shield?.warnings ?? []),
    ...(playback?.error ? [playback.error] : []),
    ...state.errors,
  ];

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-5 py-5 lg:px-8">
        <aside className="hidden w-64 shrink-0 flex-col justify-between rounded-[28px] border border-white/8 bg-black/25 p-5 backdrop-blur-md lg:flex">
          <div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Cinema Machina
              </p>
              <h1 className="mt-3 text-xl font-semibold tracking-[0.08em] text-slate-50">
                Core
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Monitoring and control-plane foundation for high-end playback chains.
              </p>
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item, index) => (
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

          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Runtime
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip label={systemOnline ? "System Online" : "Checking System"} tone={systemOnline ? "online" : "default"} />
              <ConfidenceChip confidence={health?.confidence ?? "unknown"} />
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-5 backdrop-blur-md">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Production Dashboard Foundation
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-[0.08em] text-slate-50 md:text-3xl">
                  Playback Chain Control Plane
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    System Online
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <StatusChip
                      label={systemOnline ? "Online" : isLoading ? "Loading" : "Offline"}
                      tone={systemOnline ? "online" : "default"}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Signal Confidence
                  </p>
                  <div className="mt-3">
                    <ConfidenceChip confidence={chain?.confidence ?? "unknown"} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Active Playback
                  </p>
                  <p className="mt-3 text-lg font-medium text-slate-100">
                    {chain?.active ? "Detected" : "No active playback"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <Panel title="Now Playing Chain" eyebrow="Playback Chain">
              <div className="grid gap-3 md:grid-cols-5">
                {chainStages.map((stage) => {
                  const item =
                    stage.key === "source"
                      ? chain?.source
                      : chain?.[stage.key];

                  const value =
                    stage.key === "source"
                      ? chain?.source?.codec ?? "Unknown"
                      : (item as DeviceState | null)?.name ?? "Unknown";

                  const confidence =
                    stage.key === "source"
                      ? chain?.source?.codec_confidence ?? "unknown"
                      : (item as DeviceState | null)?.name_confidence ?? "unknown";

                  const detail =
                    stage.key === "source"
                      ? chain?.source?.container ?? "Media metadata unavailable"
                      : (item as DeviceState | null)?.kind ?? "Telemetry pending";

                  return (
                    <div
                      key={stage.label}
                      className="relative rounded-xl border border-white/8 bg-black/20 p-4"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {stage.label}
                      </p>
                      <p className="mt-4 text-sm font-medium text-slate-100">{value}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {detail.replace(/_/g, " ")}
                      </p>
                      <div className="mt-4">
                        <ConfidenceChip confidence={confidence} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-white/12 bg-black/15 p-4">
                <p className="text-sm text-slate-300">
                  {chain?.active
                    ? "Chain visibility is active. Upstream playback metadata is live, while downstream device and signal telemetry remain intentionally unknown until dedicated integrations are added."
                    : "No active playback. The dashboard is online and waiting for a real session before it renders a full source-to-output chain."}
                </p>
              </div>
            </Panel>

            <Panel title="Warnings and Diagnostics" eyebrow="Diagnostics">
              {warnings.length > 0 ? (
                <div className="space-y-3">
                  {warnings.map((warning) => (
                    <div
                      key={warning}
                      className="rounded-xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-50"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-slate-300">
                    No diagnostics are raised. Unknown fields are expected until downstream monitoring is connected.
                  </p>
                </div>
              )}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="Device Monitor" eyebrow="Display and Audio">
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shield</p>
                    <ConfidenceChip confidence={shield?.confidence ?? "unknown"} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-100">
                    {shieldStatusLabel(shield)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {shield?.foreground_package ?? "Foreground app unavailable"}
                  </p>
                </div>
                <DeviceCard label="Display" device={chain?.display_device ?? null} />
                <DeviceCard label="Audio" device={chain?.audio_device ?? null} />
              </div>

              <div className="mt-4 space-y-1">
                <DataLine
                  label="Foreground App"
                  value={shield?.foreground_app ?? "Unknown"}
                  confidence={shield?.foreground_app_confidence ?? "unknown"}
                />
                <DataLine
                  label="Display Mode"
                  value={shield?.display_mode ?? "Unknown"}
                  confidence={shield?.display_mode_confidence ?? "unknown"}
                />
              </div>
            </Panel>

            <Panel title="Media Server" eyebrow="Upstream Session">
              <div className="space-y-1">
                <DataLine
                  label="Server"
                  value={chain?.media_server?.name ?? "Unknown"}
                  confidence={chain?.media_server?.name_confidence ?? "unknown"}
                />
                <DataLine
                  label="Sessions"
                  value={String(playback?.sessions.length ?? 0)}
                />
                <DataLine
                  label="Decision"
                  value={playback?.sessions[0]?.decision ?? "Unknown"}
                />
              </div>
            </Panel>

            <Panel title="Signal Integrity" eyebrow="Video and Audio">
              <div className="space-y-1">
                <DataLine
                  label="Source Codec"
                  value={formatValue(chain?.source?.codec)}
                  confidence={chain?.source?.codec_confidence ?? "unknown"}
                />
                <DataLine
                  label="Container"
                  value={formatValue(chain?.source?.container)}
                  confidence={chain?.source?.container_confidence ?? "unknown"}
                />
                <DataLine
                  label="Audio Codec"
                  value={formatValue(chain?.source?.audio_codec)}
                  confidence={chain?.source?.audio_codec_confidence ?? "unknown"}
                />
                <DataLine
                  label="Passthrough"
                  value={formatValue(chain?.output_state?.passthrough)}
                  confidence={chain?.output_state?.passthrough_confidence ?? "unknown"}
                />
              </div>
            </Panel>

            <Panel title="System Status" eyebrow="Health and Activity">
              <div className="space-y-1">
                <DataLine
                  label="Health"
                  value={systemOnline ? "System online" : isLoading ? "Loading" : "Unavailable"}
                  confidence={health?.confidence ?? "unknown"}
                />
                <DataLine
                  label="Source"
                  value={playback?.sources_checked.length ? playback.sources_checked.join(", ") : "None"}
                />
                <DataLine
                  label="Playback"
                  value={chain?.active ? playback?.sessions[0]?.title ?? "Active session" : "No active playback"}
                />
                <DataLine
                  label="Client"
                  value={playback?.sessions[0]?.client_name ?? "Unknown"}
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}

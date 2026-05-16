"use client";

import { useEffect, useState } from "react";

import { fetchApiJson } from "../lib/api";

type HealthStatus = {
  status: string;
  version: string;
};

type PlaybackSession = {
  title: string;
  state?: string;
};

type PlaybackState = {
  sessions: PlaybackSession[];
  sources_checked: string[];
  error: string | null;
};

export default function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    fetchApiJson<HealthStatus>("/health")
      .then((data) => setHealth(data))
      .catch((err) => setHealthError(err.message));

    fetchApiJson<PlaybackState>("/playback/current")
      .then((data) => setPlayback(data))
      .catch((err) => setPlaybackError(err.message));
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto font-sans">
      <header className="mb-12 border-b border-border pb-6">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Cinema Machina <span className="font-semibold">Core</span>
        </h1>
        <p className="text-sm text-gray-400 tracking-wide uppercase">
          Playback Diagnostic & Control Plane
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Health Card */}
        <section className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-3"></span>
            System Health
          </h2>
          {healthError ? (
            <div className="text-red-400 text-sm">Error: {healthError}</div>
          ) : health ? (
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="capitalize">{health.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span>{health.version}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
          )}
        </section>

        {/* Playback Status Card */}
        <section className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4">Playback State</h2>
          {playbackError ? (
            <div className="text-red-400 text-sm">Error: {playbackError}</div>
          ) : playback ? (
            <div className="space-y-4 text-sm text-gray-300">
              {playback.error && (
                <div className="text-red-400 bg-red-950/20 p-2 border border-red-900/50 rounded">
                  {playback.error}
                </div>
              )}
              
              <div>
                <span className="text-gray-500 block mb-1">Active Sessions</span>
                {playback.sessions.length > 0 ? (
                  <ul className="space-y-2">
                    {playback.sessions.map((session, i) => (
                      <li key={i} className="bg-background border border-border p-3 rounded">
                        <div className="font-medium text-white">{session.title}</div>
                        <div className="text-xs text-gray-500 mt-1">State: {session.state ?? "unknown"}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic">No active playback detected.</div>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-gray-500 block mb-1">Sources Checked</span>
                <div className="flex gap-2">
                  {playback.sources_checked.length > 0 ? (
                    playback.sources_checked.map((source, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-background border border-border rounded uppercase">
                        {source}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">None</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
          )}
        </section>
      </div>
    </main>
  );
}

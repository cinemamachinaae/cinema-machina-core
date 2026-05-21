export type StatusLevel = "ok" | "warn" | "unknown" | "error";

export type BrainPortalNode = {
  id: string;
  label?: string;
  type?: string;
  community?: number | string;
  graphifyCommunity?: number | string;
  macroSectionId?: number;
  macroSectionLabel?: string;
  macroSectionName?: string;
  clusterId: number;
  clusterName: string;
  clusterGroup: string;
  clusterDescription: string;
  source?: string;
  source_file?: string;
  source_location?: string;
  val?: number;
  cleanLabel: string;
  sourceKind: "file" | "symbol" | "doc" | "config" | "runtime" | "virtual-hub" | "unknown" | string;
  importance: number;
  actionableSummary: string;
  isClusterHub?: boolean;
  subcluster?: "routes" | "components" | "adapters" | "scripts" | "docs" | "generated-artifacts" | "runtime" | "other" | string;
};

export type GraphifyLink = {
  source: string;
  target: string;
  label?: string;
};

export type GraphifyGraph = {
  nodes: BrainPortalNode[];
  links: GraphifyLink[];
};

export type GitStatus = {
  head: {
    sha: string;
    shortSha: string;
    branch: string | null;
    committedAtIso: string | null;
  };
  dirty: boolean;
  changedFiles: number;
  dirtySummary?: {
    staged: number;
    unstaged: number;
    untracked: number;
    preview: string[];
  };
  recentCommits?: Array<{
    sha: string;
    subject: string;
  }>;
};

export type GraphifyFreshness = {
  graphReportPresent: boolean;
  graphJsonPresent: boolean;
  builtFromCommit: string | null;
  matchesHead: boolean | null;
  reportSummary?: string[];
  agentIndexSummary?: string[];
};

export type DocsQuality = {
  requiredDocs: Array<{ path: string; ok: boolean; bytes: number }>;
  ok: boolean;
};

export type ToolReadiness = {
  available: boolean;
  level: StatusLevel;
  detail: string;
  status?: string;
  [key: string]: unknown;
};

export type GeminiStatus = {
  status: "configured" | "missing" | "error";
  level: StatusLevel;
  detail: string;
  keyPresent: boolean;
  cliPresent?: boolean;
};

export type BrainReportStatus = {
  graphReport: { present: boolean; path: string; summary: string[] };
  agentIndex: { present: boolean; path: string; summary: string[] };
  brainCheck: { present: boolean; command: string; detail: string };
  graphRefresh: { present: boolean; command: string; detail: string };
  agentContextRefresh: { present: boolean; command: string; detail: string };
};

export type MediaLibraryStatus = {
  plex: ToolReadiness;
  jellyfin: ToolReadiness;
  movieLibrary: ToolReadiness;
};

export type InspectorDetail = {
  id: string;
  title: string;
  level: StatusLevel;
  summary: string;
  rows: Array<{ label: string; value: string }>;
  actions?: string[];
};

export type OllamaStatus = {
  available: boolean;
  running: boolean | null;
  modelPresent: boolean | null;
  model: string;
  level: StatusLevel;
  detail: string;
};

export type BrainPortalStatus = {
  timestampIso: string;
  git: GitStatus;
  graphify: GraphifyFreshness;
  docs: DocsQuality;
  reports?: BrainReportStatus;
  ollama: OllamaStatus;
  gemini?: GeminiStatus;
  omega: ToolReadiness;
  langflow: ToolReadiness;
  ruflo: ToolReadiness;
  codexHooks: ToolReadiness;
  antigravity: ToolReadiness;
  claudeCode: ToolReadiness;
  mediaLibrary?: MediaLibraryStatus;
};

export type OrbSummaries = {
  communitySummaries: Record<string, string> | null;
  nodeSummaries: Record<string, string> | null;
  generatedAtIso: string | null;
  model: string | null;
};

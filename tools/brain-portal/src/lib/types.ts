export type StatusLevel = "ok" | "warn" | "unknown" | "error";

export type BrainPortalNode = {
  id: string;
  label?: string;
  type?: string;
  community?: number | string;
  graphifyCommunity?: number | string;
  macroSectionId?: number;
  macroSectionLabel?: string;
  source?: string;
  source_file?: string;
  source_location?: string;
  val?: number;
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
};

export type GraphifyFreshness = {
  graphReportPresent: boolean;
  graphJsonPresent: boolean;
  builtFromCommit: string | null;
  matchesHead: boolean | null;
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
  ollama: OllamaStatus;
  omega: ToolReadiness;
  langflow: ToolReadiness;
  ruflo: ToolReadiness;
  codexHooks: ToolReadiness;
  antigravity: ToolReadiness;
  claudeCode: ToolReadiness;
};

export type OrbSummaries = {
  communitySummaries: Record<string, string> | null;
  nodeSummaries: Record<string, string> | null;
  generatedAtIso: string | null;
  model: string | null;
};

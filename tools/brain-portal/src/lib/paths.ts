import path from "node:path";

export function getRepoRoot(): string {
  // tools/brain-portal -> repo root
  return path.resolve(process.cwd(), "../..");
}

export function repoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}


import path from "node:path";

export function getRepoRoot(): string {
  if (process.env.CM_CORE_HOME) {
    return path.resolve(process.env.CM_CORE_HOME);
  }

  return path.resolve(process.cwd(), "../..");
}

export function repoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}

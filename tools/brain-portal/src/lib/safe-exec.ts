import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ExecResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export async function safeExecFile(
  file: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 1500,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), exitCode: 0 };
  } catch (error: any) {
    const stdout = String(error?.stdout ?? "");
    const stderr = String(error?.stderr ?? error?.message ?? "");
    const code = typeof error?.code === "number" ? error.code : null;
    return { ok: false, stdout, stderr, exitCode: code };
  }
}


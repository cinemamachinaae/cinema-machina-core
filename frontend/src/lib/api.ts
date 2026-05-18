const DEFAULT_BACKEND_PORT = "8000";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
}

type FetchApiOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number | undefined,
): Promise<Response> {
  if (!timeoutMs) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  const signal = init.signal
    ? mergeSignals(init.signal, controller.signal)
    : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function mergeSignals(primary: AbortSignal, secondary: AbortSignal): AbortSignal {
  if (primary.aborted) {
    return primary;
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();

  primary.addEventListener("abort", onAbort, { once: true });
  secondary.addEventListener("abort", onAbort, { once: true });

  return controller.signal;
}

export async function fetchApiJsonResult<T>(
  path: string,
  options: FetchApiOptions = {},
): Promise<ApiResult<T>> {
  const url = `${resolveApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: options.signal,
      },
      options.timeoutMs,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    return { ok: false, error: `Request failed (${response.status})`, status: response.status };
  }

  if (!bodyText.trim()) {
    return { ok: false, error: `Request failed (${response.status})`, status: response.status };
  }

  try {
    return { ok: true, data: JSON.parse(bodyText) as T };
  } catch {
    return { ok: false, error: "Invalid API response", status: response.status };
  }
}

export async function fetchApiJson<T>(path: string): Promise<T> {
  const result = await fetchApiJsonResult<T>(path);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

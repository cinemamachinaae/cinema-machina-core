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

export async function fetchApiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    throw new Error(`Request failed (${response.status})`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new Error("Invalid API response");
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return payload as T;
}

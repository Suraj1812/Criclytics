import type { ApiErrorPayload, DashboardPayload, MatchDetail, MatchStatus, MediaDetail } from "@/types/cricket";

const REQUEST_TIMEOUT_MS = 8_000;

export class ApiClientError extends Error {
  code: string;
  statusCode: number;
  retryable: boolean;

  constructor({
    message,
    code = "request_failed",
    statusCode = 500,
    retryable = true
  }: {
    message: string;
    code?: string;
    statusCode?: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

export async function fetchDashboardFeed(options: { series?: string | null; status?: MatchStatus | null; signal?: AbortSignal } = {}) {
  const url = new URL("/api/matches", window.location.origin);

  if (options.series) {
    url.searchParams.set("series", options.series);
  }

  if (options.status) {
    url.searchParams.set("status", options.status);
  }

  return fetchJson<DashboardPayload>(url.toString(), options.signal);
}

export async function fetchMatchDetail(matchId: string, signal?: AbortSignal) {
  return fetchJson<MatchDetail>(`/api/match/${encodeURIComponent(matchId)}`, signal);
}

export async function fetchMediaDetail(url: string, signal?: AbortSignal) {
  const endpoint = new URL("/api/media/resolve", window.location.origin);
  endpoint.searchParams.set("url", url);
  return fetchJson<MediaDetail>(endpoint.toString(), signal);
}

async function fetchJson<T>(input: RequestInfo | URL, signal?: AbortSignal): Promise<T> {
  const { signal: requestSignal, cleanup } = createRequestSignal(signal, REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(input, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      signal: requestSignal
    });
  } catch (error) {
    cleanup();

    if (requestSignal.aborted && !signal?.aborted) {
      throw new ApiClientError({
        code: "request_timeout",
        message: "The request took too long. Criclytics will keep the latest cached data on screen and retry shortly.",
        statusCode: 504,
        retryable: true
      });
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ApiClientError({
        code: "offline",
        message: "You appear to be offline. Reconnect to resume live cricket updates.",
        statusCode: 0,
        retryable: true
      });
    }

    throw new ApiClientError({
      code: "network_failure",
      message: "The live data request failed before the server could respond. Criclytics will retry automatically.",
      statusCode: 0,
      retryable: true
    });
  }

  const rawBody = await response.text();
  cleanup();
  const payload = tryParseJson(rawBody);

  if (!payload) {
    throw new ApiClientError({
      code: "invalid_payload",
      message: "The server returned unreadable data. Criclytics is holding the last good response where possible.",
      statusCode: response.status || 502,
      retryable: true
    });
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload;
    throw new ApiClientError({
      code: errorPayload.error?.code || "request_failed",
      message: errorPayload.error?.message || "The server request failed.",
      statusCode: response.status,
      retryable: errorPayload.error?.retryable ?? response.status >= 500
    });
  }

  return payload as T;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createRequestSignal(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);

  function abortFromExternal() {
    controller.abort(externalSignal?.reason);
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    }
  };
}

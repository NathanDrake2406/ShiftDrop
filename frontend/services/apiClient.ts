import { ApiError } from "../types/api";

export type ApiRequestOptions = {
  method?: string;
  token?: string;
  headers?: HeadersInit;
  body?: unknown;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const buildUrl = (path: string) => {
  if (!API_BASE_URL) return path;
  return new URL(path, API_BASE_URL).toString();
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const hasBody = options.body !== undefined;
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let details: Record<string, string[]> | undefined;

    try {
      const contentType = response.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as {
          error?: string;
          message?: string;
          details?: Record<string, string[]>;
        };
        message = data.message ?? data.error ?? message;
        details = data.details;
      }
    } catch {
      // Ignore parse errors and fall back to statusText.
    }

    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

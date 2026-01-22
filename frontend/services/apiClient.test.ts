import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type JsonRecord = Record<string, unknown>;

const mockFetch = vi.fn();

const makeJsonResponse = (body: JsonRecord, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const loadApiClient = async (baseUrl = "https://api.example.test") => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", baseUrl);
  return await import("./apiClient");
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apiRequest", () => {
  it("builds the request URL from base and parses JSON", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ ok: true }));

    const { apiRequest } = await loadApiClient();
    const result = await apiRequest<{ ok: boolean }>("/pools");

    expect(result).toEqual({ ok: true });

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/pools");
    expect((options as RequestInit | undefined)?.method).toBe("GET");
  });

  it("sends JSON body and auth header when provided", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: "pool-1" }, { status: 201 }));

    const { apiRequest } = await loadApiClient();
    await apiRequest("/pools", {
      method: "POST",
      token: "token-123",
      body: { name: "Night Shift" },
      headers: { "X-Request-Id": "req-1" },
    });

    const [, options] = mockFetch.mock.calls[0] ?? [];
    const headers = new Headers((options as RequestInit | undefined)?.headers);

    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Request-Id")).toBe("req-1");
    expect((options as RequestInit | undefined)?.body).toBe(JSON.stringify({ name: "Night Shift" }));
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { apiRequest } = await loadApiClient();
    const result = await apiRequest("/pools");

    expect(result).toBeUndefined();
  });

  it("throws ApiError with details for JSON error responses", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse(
        {
          error: "BadRequest",
          message: "Invalid payload",
          details: { name: ["Required"] },
        },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const { apiRequest } = await loadApiClient();

    let error: unknown;
    try {
      await apiRequest("/pools");
    } catch (err) {
      error = err;
    }

    expect((error as { name?: string }).name).toBe("ApiError");
    expect((error as { status?: number }).status).toBe(400);
    expect((error as { message?: string }).message).toBe("Invalid payload");
    expect((error as { details?: Record<string, string[]> }).details).toEqual({ name: ["Required"] });
  });

  it("falls back to statusText for non-JSON error responses", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Oops", {
        status: 500,
        statusText: "Server Error",
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const { apiRequest } = await loadApiClient();

    await expect(apiRequest("/pools")).rejects.toMatchObject({
      status: 500,
      message: "Server Error",
    });
  });
});

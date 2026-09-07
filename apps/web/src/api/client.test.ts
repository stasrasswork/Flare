import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./client";

afterEach(() => vi.restoreAllMocks());

describe("request", () => {
  it("sends credentials, JSON body and workspace header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await request<{ ok: boolean }>("/flags", { method: "POST", workspaceId: "workspace-1", body: { enabled: true } });

    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(options).toEqual(expect.objectContaining({ credentials: "include", body: JSON.stringify({ enabled: true }) }));
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-workspace-id")).toBe("workspace-1");
  });

  it("normalizes API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Not allowed" } }), { status: 403 }));

    await expect(request("/flags")).rejects.toEqual(expect.objectContaining<ApiError>({ name: "ApiError", status: 403, code: "FORBIDDEN", message: "Not allowed" }));
  });
});

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  workspaceId?: string;
};

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, workspaceId, ...fetchOptions } = options;
  const headers = new Headers(body === undefined ? undefined : { "content-type": "application/json" });
  if (workspaceId) {
    headers.set("x-workspace-id", workspaceId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => undefined)) as ErrorPayload | T | undefined;
  if (!response.ok) {
    const error = payload as ErrorPayload | undefined;
    throw new ApiError(
      error?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      error?.error?.code,
    );
  }

  return payload as T;
}

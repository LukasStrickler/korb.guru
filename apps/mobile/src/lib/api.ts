import type { ExampleItem, HelloResponse } from "@korb/contracts";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/** Read at call time so tests can set process.env before calling (babel-preset-expo inlines direct process.env.EXPO_PUBLIC_*). */
const getApiBaseUrl = (): string => {
  const env = process.env;
  const baseUrl = env["EXPO_PUBLIC_API_BASE_URL"];

  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in mobile environment");
  }

  return baseUrl.replace(/\/$/, "");
};

/** Generate a request ID for correlation with backend logs. */
const getRequestId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/** Error with status and optional server message (response body detail). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const apiFetch = async <TResponse>(
  path: `/${string}`,
  options: ApiRequestOptions = {},
): Promise<TResponse> => {
  const { body, headers, ...rest } = options;

  const requestId = getRequestId();
  const init: RequestInit = {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, init);

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const json = await response.json();
      if (typeof json?.detail === "string") detail = json.detail;
      else if (Array.isArray(json?.detail))
        detail = json.detail.map(String).join("; ");
    } catch {
      detail = (await response.text()) || undefined;
    }
    throw new ApiError(
      `API request failed (${response.status})`,
      response.status,
      detail,
    );
  }

  return (await response.json()) as TResponse;
};

/**
 * Call the API with a Clerk session token for protected endpoints.
 * Get the token with: const token = await getToken(); from useAuth().
 */
export const apiFetchWithAuth = async <TResponse>(
  path: `/${string}`,
  token: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> => {
  const { headers, ...rest } = options;
  return apiFetch<TResponse>(path, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });
};

export const fetchHello = (): Promise<HelloResponse> => {
  return apiFetch<HelloResponse>("/hello");
};

/** Fetch example rows from Postgres (GET /examples). Public endpoint; no auth. */
export const fetchExamples = (): Promise<ExampleItem[]> => {
  return apiFetch<ExampleItem[]>("/examples");
};

/** Response shape for GET /me (placeholder protected endpoint). */
export type MeResponse = { user_id: string; message: string };

/** Call the protected /me endpoint. Pass the Clerk token from useAuth().getToken(). */
export const fetchMe = (token: string): Promise<MeResponse> => {
  return apiFetchWithAuth<MeResponse>("/me", token);
};

/** Response from DELETE /me (account deletion). */
export type DeleteMeResponse = { ok: boolean };

/**
 * Request account deletion (App Store compliance). Backend should delete Clerk user
 * in production; app then deletes Convex data and signs out.
 */
export const deleteAccount = (token: string): Promise<DeleteMeResponse> => {
  return apiFetchWithAuth<DeleteMeResponse>("/me", token, { method: "DELETE" });
};

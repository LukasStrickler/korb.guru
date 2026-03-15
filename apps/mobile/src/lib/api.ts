import type { ExampleItem, HelloResponse } from "@korb/contracts";

export type ProductSearchResult = {
  id: string;
  name: string;
  price: number | null;
  retailer: string;
  category: string;
  discount_pct: number | null;
};

export type Recipe = {
  id: string;
  title: string;
  cost: number | null;
  time_minutes: number | null;
  ingredients: string[];
};

export type GroceryItem = {
  id: string;
  ingredient_name: string;
  quantity: string | null;
  category: string;
  is_checked: boolean;
};

export type GroceryList = {
  id: string;
  name: string;
  estimated_total: number;
  items: GroceryItem[];
};

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * In dev, when EXPO_PUBLIC_API_BASE_URL is localhost/127.0.0.1, physical devices
 * cannot reach it (localhost = the device). Use the Metro bundler host so the
 * app talks to the same machine that runs the API.
 */
function getDevServerHost(): string | null {
  if (typeof __DEV__ !== "boolean" || !__DEV__) return null;
  try {
    const Constants = require("expo-constants").default;
    const manifest = Constants.expoConfig ?? Constants.manifest;
    const debuggerHost =
      manifest?.debuggerHost ??
      (typeof manifest?.hostUri === "string"
        ? manifest.hostUri.replace(/^exp:\/\//, "").split("/")[0]
        : null);
    if (debuggerHost && typeof debuggerHost === "string") {
      const host = debuggerHost.split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") return host;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Read at call time so tests can set process.env before calling (babel-preset-expo inlines direct process.env.EXPO_PUBLIC_*). */
export const getApiBaseUrl = (): string => {
  const env = process.env;
  let baseUrl = env["EXPO_PUBLIC_API_BASE_URL"];

  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in mobile environment");
  }

  baseUrl = baseUrl.replace(/\/$/, "");

  const devHost = getDevServerHost();
  if (devHost) {
    const match = baseUrl.match(
      /^https?:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?/,
    );
    if (match) {
      const port = match[2] ?? "8001";
      const protocol = baseUrl.startsWith("https") ? "https" : "http";
      const pathSuffix = baseUrl.slice(match[0].length) || "";
      return `${protocol}://${devHost}:${port}${pathSuffix}`;
    }
  }

  return baseUrl;
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
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (typeof json?.detail === "string") detail = json.detail;
      else if (Array.isArray(json?.detail))
        detail = json.detail.map(String).join("; ");
    } catch {
      detail = text || undefined;
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

/** Response shape for GET /api/v1/users/me. */
export type MeResponse = { user_id: string; message: string };

/** Call the protected /me endpoint. Pass the Clerk token from useAuth().getToken(). */
export const fetchMe = (token: string): Promise<MeResponse> => {
  return apiFetchWithAuth<MeResponse>("/api/v1/users/me", token);
};

/** Response from DELETE /api/v1/users/me (account deletion). */
export type DeleteMeResponse = { ok: boolean };

/**
 * Request account deletion (App Store compliance). Backend should delete Clerk user
 * in production; app then deletes Convex data and signs out.
 */
export const deleteAccount = (token: string): Promise<DeleteMeResponse> => {
  return apiFetchWithAuth<DeleteMeResponse>("/api/v1/users/me", token, {
    method: "DELETE",
  });
};

export const searchProducts = (
  token: string,
  query: string,
  retailers?: string[],
) =>
  apiFetchWithAuth<ProductSearchResult[]>(
    `/api/v1/products/search?q=${encodeURIComponent(query)}${retailers?.length ? `&retailers=${retailers.join(",")}` : ""}`,
    token,
  );

export const getDeals = (token: string) =>
  apiFetchWithAuth<ProductSearchResult[]>("/api/v1/products/deals", token);

export const askProductQuestion = (token: string, question: string) =>
  apiFetchWithAuth<{ answer: string; products: ProductSearchResult[] }>(
    "/api/v1/products/ask",
    token,
    { method: "POST", body: { question } },
  );

export const discoverRecipes = (token: string) =>
  apiFetchWithAuth<Recipe[]>("/api/v1/recipes/discover", token);

export const swipeRecipe = (
  token: string,
  recipeId: string,
  action: "accept" | "reject",
) =>
  apiFetchWithAuth<{ status: string }>(
    `/api/v1/recipes/${recipeId}/swipe`,
    token,
    { method: "POST", body: { action } },
  );

export const getGroceryLists = (token: string) =>
  apiFetchWithAuth<GroceryList[]>("/api/v1/grocery/lists", token);

export const getRecommendedProducts = (token: string, limit = 10) =>
  apiFetchWithAuth<ProductSearchResult[]>(
    `/api/v1/products/recommended?limit=${limit}`,
    token,
  );

export const submitProductFeedback = (
  token: string,
  productId: string,
  helpful: boolean,
) =>
  apiFetchWithAuth<{ status: string }>("/api/v1/products/feedback", token, {
    method: "POST",
    body: { product_id: productId, helpful },
  });

export const bulkUpdateGroceryItems = (
  token: string,
  updates: { item_id: string; is_checked: boolean }[],
) =>
  apiFetchWithAuth<{ updated: number }>("/api/v1/grocery/items/bulk", token, {
    method: "PATCH",
    body: { updates },
  });

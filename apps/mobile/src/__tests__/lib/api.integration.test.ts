/**
 * Integration tests for the API client: real fetch, MSW fake server.
 * TDD skill: "Integration = components + hooks + services together"; "Network → Use MSW or fakes".
 */
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchHello, fetchMe } from "@/lib/api";

const BASE = "http://test.api";

const server = setupServer(
  http.get(`${BASE}/hello`, () => {
    return HttpResponse.json({ message: "Hello from FastAPI" });
  }),
  http.get(`${BASE}/api/v1/users/me`, ({ request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({
      user_id: "user_123",
      message: "Hi",
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Mobile API client (integration)", () => {
  beforeEach(() => {
    if (!process.env["EXPO_PUBLIC_API_BASE_URL"]) {
      process.env["EXPO_PUBLIC_API_BASE_URL"] = BASE;
    }
  });

  it("fetchHello returns message from fake server", async () => {
    const result = await fetchHello();
    expect(result.message).toBe("Hello from FastAPI");
  });

  it("fetchMe includes bearer token and returns user", async () => {
    const result = await fetchMe("my-secret-token");
    expect(result.user_id).toBe("user_123");
    expect(result.message).toBe("Hi");
  });

  it("throws on missing EXPO_PUBLIC_API_BASE_URL", async () => {
    const saved = process.env["EXPO_PUBLIC_API_BASE_URL"];
    process.env["EXPO_PUBLIC_API_BASE_URL"] = "";

    await expect(fetchHello()).rejects.toThrow(
      "Missing EXPO_PUBLIC_API_BASE_URL in mobile environment",
    );

    process.env["EXPO_PUBLIC_API_BASE_URL"] = saved ?? BASE;
  });

  it("throws on non-ok response", async () => {
    server.use(
      http.get(`${BASE}/hello`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    await expect(fetchHello()).rejects.toThrow("API request failed (500)");
  });
});

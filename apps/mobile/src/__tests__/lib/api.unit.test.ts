/**
 * Unit tests for ApiError only. Fetch/API client behavior is in api.integration.test.ts (MSW).
 */
import { ApiError } from "@/lib/api";

describe("ApiError", () => {
  it("is an Error with name ApiError", () => {
    const err = new ApiError("test", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("test");
  });

  it("exposes status and optional detail", () => {
    const err = new ApiError("Bad request", 400, "Invalid email");
    expect(err.status).toBe(400);
    expect(err.detail).toBe("Invalid email");
  });

  it("detail can be undefined", () => {
    const err = new ApiError("Not found", 404);
    expect(err.status).toBe(404);
    expect(err.detail).toBeUndefined();
  });
});

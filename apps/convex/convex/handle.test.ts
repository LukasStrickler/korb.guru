import { describe, expect, it } from "vitest";
import {
  validateHandle,
  normalizeHandle,
  HANDLE_REGEX,
  RESERVED_HANDLES,
} from "./handle";

describe("handle validation", () => {
  describe("HANDLE_REGEX", () => {
    it("matches valid handles", () => {
      expect(HANDLE_REGEX.test("johndoe")).toBe(true);
      expect(HANDLE_REGEX.test("john_doe")).toBe(true);
      expect(HANDLE_REGEX.test("john123")).toBe(true);
      expect(HANDLE_REGEX.test("ABC")).toBe(true);
      expect(HANDLE_REGEX.test("a".repeat(30))).toBe(true);
    });

    it("rejects invalid handles", () => {
      expect(HANDLE_REGEX.test("ab")).toBe(false);
      expect(HANDLE_REGEX.test("a".repeat(31))).toBe(false);
      expect(HANDLE_REGEX.test("john-doe")).toBe(false);
      expect(HANDLE_REGEX.test("john.doe")).toBe(false);
      expect(HANDLE_REGEX.test("john doe")).toBe(false);
      expect(HANDLE_REGEX.test("")).toBe(false);
    });
  });

  describe("RESERVED_HANDLES", () => {
    it("contains expected reserved words", () => {
      expect(RESERVED_HANDLES).toContain("add");
      expect(RESERVED_HANDLES).toContain("invite");
      expect(RESERVED_HANDLES).toContain("api");
      expect(RESERVED_HANDLES).toContain("admin");
      expect(RESERVED_HANDLES).toContain("support");
      expect(RESERVED_HANDLES).toContain("help");
      expect(RESERVED_HANDLES).toContain("app");
    });
  });

  describe("normalizeHandle", () => {
    it("lowercases and trims", () => {
      expect(normalizeHandle("  JohnDoe  ")).toBe("johndoe");
      expect(normalizeHandle("John_Doe")).toBe("john_doe");
      expect(normalizeHandle("ABC123")).toBe("abc123");
    });

    it("returns empty for whitespace-only input", () => {
      expect(normalizeHandle("   ")).toBe("");
      expect(normalizeHandle("")).toBe("");
    });
  });

  describe("validateHandle", () => {
    it("accepts valid handles", () => {
      expect(() => validateHandle("johndoe")).not.toThrow();
      expect(() => validateHandle("john_doe")).not.toThrow();
      expect(() => validateHandle("user123")).not.toThrow();
    });

    it("rejects too short handles", () => {
      expect(() => validateHandle("ab")).toThrow(
        "Handle must be 3–30 characters",
      );
    });

    it("rejects too long handles", () => {
      expect(() => validateHandle("a".repeat(31))).toThrow(
        "Handle must be 3–30 characters",
      );
    });

    it("rejects invalid characters", () => {
      expect(() => validateHandle("john-doe")).toThrow(
        "Handle must be 3–30 characters",
      );
      expect(() => validateHandle("john.doe")).toThrow(
        "Handle must be 3–30 characters",
      );
    });

    it("rejects reserved handles (case-insensitive)", () => {
      expect(() => validateHandle("add")).toThrow("This handle is reserved");
      expect(() => validateHandle("ADD")).toThrow("This handle is reserved");
      expect(() => validateHandle("Admin")).toThrow("This handle is reserved");
      expect(() => validateHandle("API")).toThrow("This handle is reserved");
    });
  });
});

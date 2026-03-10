export const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export const RESERVED_HANDLES = [
  "add",
  "invite",
  "api",
  "admin",
  "support",
  "help",
  "app",
];

export function validateHandle(handle: string): void {
  if (!HANDLE_REGEX.test(handle)) {
    throw new Error(
      "Handle must be 3–30 characters, letters, numbers, and underscores only.",
    );
  }
  const lower = handle.toLowerCase();
  if (RESERVED_HANDLES.includes(lower)) {
    throw new Error("This handle is reserved.");
  }
}

export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().trim();
}

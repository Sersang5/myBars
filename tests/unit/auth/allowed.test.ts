import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/auth/allowed";

describe("isAllowedEmail", () => {
  it("matches ignoring case and surrounding whitespace", () => {
    expect(isAllowedEmail("Yo@Mail.com ", "yo@mail.com")).toBe(true);
  });
  it("rejects a different email", () => {
    expect(isAllowedEmail("otro@mail.com", "yo@mail.com")).toBe(false);
  });
  it("rejects null/undefined/empty", () => {
    expect(isAllowedEmail(null, "yo@mail.com")).toBe(false);
    expect(isAllowedEmail(undefined, "yo@mail.com")).toBe(false);
    expect(isAllowedEmail("", "")).toBe(false);
  });
});

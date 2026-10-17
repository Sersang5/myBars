import { describe, expect, it } from "vitest";
import { unauthorizedResponseKind } from "@/lib/auth/unauthorized";

describe("unauthorizedResponseKind", () => {
  it("answers JSON for API paths", () => {
    expect(unauthorizedResponseKind("/api/places/autocomplete")).toBe("json");
  });
  it("redirects pages", () => {
    expect(unauthorizedResponseKind("/bars")).toBe("redirect");
    expect(unauthorizedResponseKind("/")).toBe("redirect");
    expect(unauthorizedResponseKind("/apiary")).toBe("redirect");
  });
});

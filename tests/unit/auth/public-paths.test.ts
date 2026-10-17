import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";

describe("isPublicPath", () => {
  it.each(["/login", "/auth/callback", "/_next/static/x.js", "/manifest.webmanifest", "/icons/192.png", "/icon-192.png"])(
    "%s is public",
    (p) => expect(isPublicPath(p)).toBe(true),
  );
  it.each(["/", "/bars", "/login-history", "/login/x", "/iconos", "/swXjs", "/manifestXwebmanifest", "/authx/callback", "/_nextx/a"])(
    "%s is protected",
    (p) => expect(isPublicPath(p)).toBe(false),
  );
});

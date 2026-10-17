const EXACT = new Set(["/login", "/manifest.webmanifest", "/favicon.ico", "/sw.js"]);
const PREFIXES = ["/auth/", "/_next/", "/icons/"];
const ICON_FILE = /^\/(icon|apple-icon)[^/]*\.(png|ico|svg)$/;

/** Paths reachable without a session. Everything else requires the allowed user. */
export function isPublicPath(pathname: string): boolean {
  return (
    EXACT.has(pathname) ||
    PREFIXES.some((p) => pathname.startsWith(p)) ||
    ICON_FILE.test(pathname)
  );
}

/** API paths answer 401 JSON; pages redirect to /login. */
export function unauthorizedResponseKind(pathname: string): "json" | "redirect" {
  return pathname.startsWith("/api/") ? "json" : "redirect";
}

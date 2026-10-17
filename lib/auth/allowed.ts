const normalize = (value: string) => value.trim().toLowerCase();

/** True when `email` equals the single allowed email (trimmed, case-insensitive). */
export function isAllowedEmail(email: string | null | undefined, allowed: string): boolean {
  if (!email || !allowed.trim()) return false;
  return normalize(email) === normalize(allowed);
}

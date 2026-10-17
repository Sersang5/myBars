export function normalizeTagName(raw: string): string {
  const name = raw.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  if (name === "") throw new Error("Tag name cannot be empty");
  return name;
}

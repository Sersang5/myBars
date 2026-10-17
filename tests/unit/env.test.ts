import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnv } from "@/lib/env";

const full = {
  GOOGLE_MAPS_API_KEY: "g-key",
  ANTHROPIC_API_KEY: "a-key",
  ANTHROPIC_MODEL: "claude-test",
  ALLOWED_EMAIL: "me@example.com",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
};

function without(...keys: (keyof typeof full)[]) {
  const copy: Record<string, string> = { ...full };
  for (const k of keys) delete copy[k];
  return copy;
}

function setEnv(values: Record<string, string>) {
  for (const key of Object.keys(full)) vi.stubEnv(key, "");
  for (const [k, v] of Object.entries(values)) vi.stubEnv(k, v);
}

afterEach(() => vi.unstubAllEnvs());

describe("getServerEnv", () => {
  it("returns the parsed env, mapping NEXT_PUBLIC_SUPABASE_* names", () => {
    setEnv(full);
    expect(getServerEnv()).toEqual({
      GOOGLE_MAPS_API_KEY: "g-key",
      ANTHROPIC_API_KEY: "a-key",
      ANTHROPIC_MODEL: "claude-test",
      ALLOWED_EMAIL: "me@example.com",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "anon",
    });
  });

  it("defaults ANTHROPIC_MODEL to claude-opus-5-5", () => {
    setEnv(without("ANTHROPIC_MODEL"));
    expect(getServerEnv().ANTHROPIC_MODEL).toBe("claude-opus-5-5");
  });

  it("throws listing every missing variable", () => {
    setEnv(without("GOOGLE_MAPS_API_KEY", "ANTHROPIC_API_KEY"));
    expect(() => getServerEnv()).toThrow(/GOOGLE_MAPS_API_KEY/);
    expect(() => getServerEnv()).toThrow(/ANTHROPIC_API_KEY/);
  });
});

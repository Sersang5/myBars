import { z } from "zod";

const nonEmpty = z.string().min(1);

const schema = z.object({
  GOOGLE_MAPS_API_KEY: nonEmpty,
  ANTHROPIC_API_KEY: nonEmpty,
  ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
  ALLOWED_EMAIL: nonEmpty,
  SUPABASE_URL: nonEmpty,
  SUPABASE_ANON_KEY: nonEmpty,
});

export type ServerEnv = z.infer<typeof schema>;

/** Validates server-side env vars. Throws an Error listing every missing/invalid variable. */
export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = schema.safeParse({
    GOOGLE_MAPS_API_KEY: source.GOOGLE_MAPS_API_KEY || undefined,
    ANTHROPIC_API_KEY: source.ANTHROPIC_API_KEY || undefined,
    ANTHROPIC_MODEL: source.ANTHROPIC_MODEL || undefined,
    ALLOWED_EMAIL: source.ALLOWED_EMAIL || undefined,
    SUPABASE_URL: source.SUPABASE_URL || source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    SUPABASE_ANON_KEY:
      source.SUPABASE_ANON_KEY || source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Missing or invalid environment variables: ${names.join(", ")}`);
  }
  return result.data;
}

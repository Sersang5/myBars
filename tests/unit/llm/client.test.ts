import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createClaudeLlm, LlmError } from "@/lib/llm/client";

const schema = z.object({ a: z.number() });

type SentBody = {
  model: string;
  max_tokens: number;
  betas: string[];
  fallbacks: string;
  output_config: { effort: string; format: unknown };
  system: string;
  messages: unknown[];
};

function fakeClient(impl: (body: Record<string, unknown>) => Promise<unknown>) {
  const bodies: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        create: (body: Record<string, unknown>) => {
          bodies.push(body);
          return impl(body);
        },
      },
    },
  } as unknown as Pick<Anthropic, "beta">;
  return { client, bodies };
}

const ok = (text: string, stop_reason = "end_turn") => ({
  stop_reason,
  content: [{ type: "text", text }],
});

describe("createClaudeLlm", () => {
  it("sends the required request shape", async () => {
    const { client, bodies } = fakeClient(async () => ok('{"a":1}'));
    const llm = createClaudeLlm("k", "claude-opus-5-5", client);
    expect(await llm.json({ system: "S", user: "U", schema })).toEqual({ a: 1 });
    const b = bodies[0] as SentBody;
    expect(b.model).toBe("claude-opus-5-5");
    expect(b.max_tokens).toBe(16000);
    expect(b.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(b.fallbacks).toBe("default");
    expect(b.output_config.effort).toBe("low");
    expect(b.output_config.format).toBeTruthy();
    expect(b.system).toBe("S");
    expect(b.messages).toEqual([{ role: "user", content: "U" }]);
    for (const k of ["thinking", "tool_choice", "temperature"]) expect(k in b).toBe(false);
  });

  it("honours maxTokens", async () => {
    const { client, bodies } = fakeClient(async () => ok('{"a":1}'));
    await createClaudeLlm("k", "m", client).json({ system: "S", user: "U", schema, maxTokens: 500 });
    expect((bodies[0] as SentBody).max_tokens).toBe(500);
  });

  it("maps refusal", async () => {
    const { client } = fakeClient(async () => ok("", "refusal"));
    await expect(createClaudeLlm("k", "m", client).json({ system: "S", user: "U", schema })).rejects.toMatchObject({
      kind: "refusal",
    });
  });

  it("maps invalid JSON and schema mismatch to invalid_output", async () => {
    for (const text of ["not json", '{"a":"x"}']) {
      const { client } = fakeClient(async () => ok(text));
      const p = createClaudeLlm("k", "m", client).json({ system: "S", user: "U", schema });
      await expect(p).rejects.toMatchObject({ kind: "invalid_output" });
      await expect(p).rejects.toBeInstanceOf(LlmError);
    }
  });

  it("maps SDK errors to api", async () => {
    const { client } = fakeClient(async () => {
      throw new Anthropic.APIError(500, { error: { message: "x" } }, "x", new Headers());
    });
    await expect(createClaudeLlm("k", "m", client).json({ system: "S", user: "U", schema })).rejects.toMatchObject({
      kind: "api",
    });
  });
});

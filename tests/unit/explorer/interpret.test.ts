import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { interpret } from "@/lib/explorer/interpret";
import { LlmError, type Llm } from "@/lib/llm/client";
import croquetas from "../../fixtures/llm/interpret-croquetas.json";
import tortillas from "../../fixtures/llm/interpret-tortillas-nuevo.json";

function fakeLlm(response: unknown) {
  const calls: { system: string; user: string; schema: z.ZodType<unknown> }[] = [];
  const llm: Llm = {
    async json<T>(args: { system: string; user: string; schema: z.ZodType<T> }) {
      calls.push(args as never);
      return args.schema.parse(response);
    },
  };
  return { llm, calls };
}

describe("interpret", () => {
  it("includes the prompt in the user message and returns the intent", async () => {
    const { llm, calls } = fakeLlm(croquetas);
    const intent = await interpret(llm, "quiero probar las mejores croquetas");
    expect(calls[0].user).toContain("quiero probar las mejores croquetas");
    expect(intent.searchQueries).toEqual(["mejores croquetas", "bar de croquetas caseras"]);
  });

  it("limits searchQueries to 1-3 non-empty strings", async () => {
    const { llm, calls } = fakeLlm(croquetas);
    await interpret(llm, "x");
    const schema = calls[0].schema;
    const base = { placeType: null, wantsNewOnly: false, reviewSignals: [] };
    expect(schema.safeParse({ ...base, searchQueries: [] }).success).toBe(false);
    expect(schema.safeParse({ ...base, searchQueries: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(schema.safeParse({ ...base, searchQueries: [""] }).success).toBe(false);
    expect(schema.safeParse({ ...base, searchQueries: ["a", "b", "c"] }).success).toBe(true);
  });

  it("detects wantsNewOnly from the fixture", async () => {
    const { llm } = fakeLlm(tortillas);
    const intent = await interpret(llm, "quiero probar un nuevo bar que destaque por las tortillas");
    expect(intent.wantsNewOnly).toBe(true);
  });

  it("falls back to the raw prompt when the llm throws", async () => {
    const llm: Llm = {
      async json() {
        throw new LlmError("api", "boom");
      },
    };
    expect(await interpret(llm, "croquetas")).toEqual({
      searchQueries: ["croquetas"],
      placeType: null,
      wantsNewOnly: false,
      reviewSignals: [],
    });
  });
});

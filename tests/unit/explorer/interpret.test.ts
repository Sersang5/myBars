import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("interpret", () => {
  it("includes the prompt in the user message and returns the intent", async () => {
    const { llm, calls } = fakeLlm(croquetas);
    const intent = await interpret(llm, "quiero probar las mejores croquetas");
    expect(calls[0].user).toContain("quiero probar las mejores croquetas");
    expect(intent.searchQueries).toEqual(["mejores croquetas", "bar de croquetas caseras"]);
  });

  it("asks with a 10 s timeout", async () => {
    const { llm, calls } = fakeLlm(croquetas);
    await interpret(llm, "x");
    expect((calls[0] as { timeoutMs?: number }).timeoutMs).toBe(10_000);
  });

  it("keeps at most 3 non-empty search queries", async () => {
    const base = { wantsNewOnly: false, reviewSignals: [] };
    const { llm } = fakeLlm({ ...base, searchQueries: ["a", " ", "b", "c", "d"] });
    expect((await interpret(llm, "x")).searchQueries).toEqual(["a", "b", "c"]);
  });

  it("falls back to the prompt when no usable query comes back", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const searchQueries of [[], ["", "  "]]) {
      const { llm } = fakeLlm({ wantsNewOnly: true, reviewSignals: [], searchQueries });
      expect((await interpret(llm, "croquetas")).searchQueries).toEqual(["croquetas"]);
    }
    expect(error).toHaveBeenCalledWith("[explore] interpret failed", "ZodError", expect.any(String));
  });

  it("does not return a placeType", async () => {
    const { llm } = fakeLlm(croquetas);
    expect(await interpret(llm, "x")).not.toHaveProperty("placeType");
  });

  it("detects wantsNewOnly from the fixture", async () => {
    const { llm } = fakeLlm(tortillas);
    const intent = await interpret(llm, "quiero probar un nuevo bar que destaque por las tortillas");
    expect(intent.wantsNewOnly).toBe(true);
  });

  it("falls back to the raw prompt when the llm throws, and logs it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const llm: Llm = {
      async json() {
        throw new LlmError("api", "boom");
      },
    };
    expect(await interpret(llm, "croquetas")).toEqual({
      searchQueries: ["croquetas"],
      wantsNewOnly: false,
      reviewSignals: [],
    });
    expect(error).toHaveBeenCalledWith("[explore] interpret failed", "api", "boom");
  });
});

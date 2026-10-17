import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export interface Llm {
  json<T>(args: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>;
}

export type LlmErrorKind = "refusal" | "invalid_output" | "api";

export class LlmError extends Error {
  kind: LlmErrorKind;
  constructor(kind: LlmErrorKind, message: string) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
  }
}

export function createClaudeLlm(apiKey: string, model: string, client?: Pick<Anthropic, "beta">): Llm {
  const sdk = client ?? new Anthropic({ apiKey });
  return {
    async json<T>({ system, user, schema, maxTokens }: Parameters<Llm["json"]>[0] & { schema: z.ZodType<T> }) {
      let message;
      try {
        message = await sdk.beta.messages.create({
          model,
          max_tokens: maxTokens ?? 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low", format: zodOutputFormat(schema as z.ZodType) },
          system,
          messages: [{ role: "user", content: user }],
        });
      } catch (e) {
        if (e instanceof Anthropic.APIError) throw new LlmError("api", e.message);
        throw e;
      }

      if (message.stop_reason === "refusal") throw new LlmError("refusal", "The model refused the request");

      const text = message.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      try {
        return schema.parse(JSON.parse(text));
      } catch (e) {
        throw new LlmError("invalid_output", e instanceof Error ? e.message : "Invalid model output");
      }
    },
  };
}

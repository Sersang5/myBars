import { z } from "zod";
import { errorKind, type Llm } from "@/lib/llm/client";
import type { Intent } from "./types";

const SYSTEM_PROMPT = `Eres el intérprete de un explorador de bares y restaurantes.
Convierte el deseo del usuario, escrito en lenguaje natural, en entre 1 y 3 búsquedas para Google Maps, en español, cortas y concretas (por ejemplo "mejores croquetas caseras").
- wantsNewOnly: true si el usuario pide algo nuevo, quiere probar, descubrir o dice que no ha ido; false en caso contrario.
- reviewSignals: qué buscar en las reseñas para saber si el local encaja (platos, cualidades, ambiente).
Responde solo con el JSON del esquema.`;

const TIMEOUT_MS = 10_000;
const MAX_QUERIES = 3;

/** What the model returns; lenient so one extra query does not throw away the whole answer. */
const modelSchema = z.object({
  searchQueries: z.array(z.string()),
  wantsNewOnly: z.boolean(),
  reviewSignals: z.array(z.string()),
});

/** The validated intent: 1–3 non-empty queries. */
export const intentSchema = modelSchema.extend({
  searchQueries: z.array(z.string().min(1)).min(1).max(MAX_QUERIES),
});

export async function interpret(llm: Llm, prompt: string): Promise<Intent> {
  try {
    const raw = await llm.json({
      system: SYSTEM_PROMPT,
      user: `Deseo del usuario: ${prompt}`,
      schema: modelSchema,
      timeoutMs: TIMEOUT_MS,
    });
    const searchQueries = raw.searchQueries
      .map((q) => q.trim())
      .filter((q) => q !== "")
      .slice(0, MAX_QUERIES);
    return intentSchema.parse({ ...raw, searchQueries });
  } catch (e) {
    console.error("[explore] interpret failed", errorKind(e), e instanceof Error ? e.message : String(e));
    return { searchQueries: [prompt], wantsNewOnly: false, reviewSignals: [] };
  }
}

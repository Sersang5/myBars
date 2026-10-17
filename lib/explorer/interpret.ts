import { z } from "zod";
import type { Llm } from "@/lib/llm/client";
import type { Intent } from "./types";

const SYSTEM_PROMPT = `Eres el intérprete de un explorador de bares y restaurantes.
Convierte el deseo del usuario, escrito en lenguaje natural, en entre 1 y 3 búsquedas para Google Maps, en español, cortas y concretas (por ejemplo "mejores croquetas caseras").
- placeType: tipo de local ("bar", "restaurante", "cafetería"...) o null si no se puede deducir.
- wantsNewOnly: true si el usuario pide algo nuevo, quiere probar, descubrir o dice que no ha ido; false en caso contrario.
- reviewSignals: qué buscar en las reseñas para saber si el local encaja (platos, cualidades, ambiente).
Responde solo con el JSON del esquema.`;

export const intentSchema = z.object({
  searchQueries: z.array(z.string().min(1)).min(1).max(3),
  placeType: z.string().nullable(),
  wantsNewOnly: z.boolean(),
  reviewSignals: z.array(z.string()),
});

export async function interpret(llm: Llm, prompt: string): Promise<Intent> {
  try {
    return await llm.json({ system: SYSTEM_PROMPT, user: `Deseo del usuario: ${prompt}`, schema: intentSchema });
  } catch {
    return { searchQueries: [prompt], placeType: null, wantsNewOnly: false, reviewSignals: [] };
  }
}

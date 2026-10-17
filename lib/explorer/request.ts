import { z } from "zod";

export const exploreRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("city"), cityId: z.string().uuid() }),
    z.object({
      kind: z.literal("near"),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusM: z.union([z.literal(1000), z.literal(2000), z.literal(5000)]),
    }),
  ]),
  novelty: z.enum(["auto", "new", "include"]),
});

export type ExploreRequestBody = z.infer<typeof exploreRequestSchema>;

import { z } from "zod";

export const ratingSchema = z.number().min(1).max(5).multipleOf(0.5);
const nullableRating = ratingSchema.nullable();

export const tagNameSchema = z
  .string()
  .max(60)
  .refine((s) => s.trim() !== "");

export const barInputSchema = z.object({
  ratingLocal: nullableRating.optional(),
  ratingService: nullableRating.optional(),
  ratingFood: nullableRating.optional(),
  ratingOverallManual: nullableRating.optional(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
  notes: z.string().max(5000).optional(),
  tags: z
    .array(z.object({ name: tagNameSchema, rating: nullableRating }))
    .optional(),
});

export const googlePlaceIdSchema = z.string().min(1).max(300);
export const idSchema = z.string().min(1).max(100);
export const statusSchema = z.enum(["visited", "pending"]);
export const noteSchema = z.string().max(5000).nullable();
export const reasonSchema = z.string().max(1000).nullable();

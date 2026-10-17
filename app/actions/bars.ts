"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  barInputSchema,
  googlePlaceIdSchema,
  idSchema,
  noteSchema,
  reasonSchema,
  statusSchema,
} from "@/lib/bars/schemas";
import type { Bar } from "@/lib/bars/types";
import type { CityRow, TagRow } from "@/lib/db/types";
import { createServerSupabase } from "@/lib/db/server";
import { PlacesError } from "@/lib/places/types";
import { getDeps } from "@/lib/server/deps";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const NOT_SIGNED_IN = "No has iniciado sesión";
const INVALID = "Datos no válidos";

function placesMessage(err: PlacesError): string {
  switch (err.kind) {
    case "quota":
      return "Se ha superado el límite de Google Places";
    case "not_found":
      return "No se ha encontrado el lugar";
    case "auth":
      return "Error de autenticación con Google Places";
    default:
      return "No se pudo contactar con Google Places";
  }
}

type Deps = Awaited<ReturnType<typeof getDeps>>;

async function run<T>(
  fn: (deps: Deps) => Promise<T>,
  opts: { revalidate?: boolean } = {},
): Promise<ActionResult<T>> {
  try {
    const sb = await createServerSupabase();
    const { data } = await sb.auth.getUser();
    if (!data.user) return { ok: false, error: NOT_SIGNED_IN };
    const result = await fn(await getDeps());
    if (opts.revalidate) {
      revalidatePath("/bars");
      revalidatePath("/pending");
    }
    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof PlacesError) return { ok: false, error: placesMessage(err) };
    console.error(err);
    return { ok: false, error: "Ha ocurrido un error inesperado" };
  }
}

/** Returns `{ value }` on success, or null when the input is invalid. */
function parse<S extends z.ZodType>(schema: S, input: unknown): { value: z.output<S> } | null {
  const r = schema.safeParse(input);
  return r.success ? { value: r.data } : null;
}

const invalid = { ok: false, error: INVALID } as const;

export async function listBarsAction(cityId: string, status: "visited" | "pending"): Promise<ActionResult<Bar[]>> {
  const c = parse(idSchema, cityId);
  const s = parse(statusSchema, status);
  if (!c || !s) return invalid;
  return run(({ repo }) => repo.listBars(c.value, s.value));
}

export async function listCitiesAction(): Promise<ActionResult<CityRow[]>> {
  return run(({ repo }) => repo.listCities());
}

export async function listTagsAction(): Promise<ActionResult<TagRow[]>> {
  return run(({ repo }) => repo.listTags());
}

export async function addVisitedBarAction(
  googlePlaceId: string,
  input: unknown,
): Promise<ActionResult<{ barId: string; existed: boolean }>> {
  const id = parse(googlePlaceIdSchema, googlePlaceId);
  const data = parse(barInputSchema, input);
  if (!id || !data) return invalid;
  return run(({ service }) => service.addVisitedBar(id.value, data.value), { revalidate: true });
}

export async function addPendingBarAction(
  googlePlaceId: string,
  reason: string | null,
): Promise<ActionResult<{ barId: string; existed: boolean }>> {
  const id = parse(googlePlaceIdSchema, googlePlaceId);
  const r = parse(reasonSchema, reason);
  if (!id || !r) return invalid;
  return run(({ service }) => service.addPendingBar(id.value, r.value), { revalidate: true });
}

export async function updateBarAction(barId: string, input: unknown): Promise<ActionResult<null>> {
  const id = parse(idSchema, barId);
  const data = parse(barInputSchema, input);
  if (!id || !data) return invalid;
  return run(
    async ({ service }) => {
      await service.updateBar(id.value, data.value);
      return null;
    },
    { revalidate: true },
  );
}

export async function markVisitedAction(barId: string, input: unknown): Promise<ActionResult<null>> {
  const id = parse(idSchema, barId);
  const data = parse(barInputSchema, input);
  if (!id || !data) return invalid;
  return run(
    async ({ service }) => {
      await service.markVisited(id.value, data.value);
      return null;
    },
    { revalidate: true },
  );
}

export async function addVisitAction(barId: string, note: string | null): Promise<ActionResult<null>> {
  const id = parse(idSchema, barId);
  const n = parse(noteSchema, note);
  if (!id || !n) return invalid;
  return run(
    async ({ service }) => {
      await service.addVisit(id.value, n.value);
      return null;
    },
    { revalidate: true },
  );
}

export async function deleteBarAction(barId: string): Promise<ActionResult<null>> {
  const id = parse(idSchema, barId);
  if (!id) return invalid;
  return run(
    async ({ service }) => {
      await service.deleteBar(id.value);
      return null;
    },
    { revalidate: true },
  );
}

export async function addCityAction(googlePlaceId: string): Promise<ActionResult<CityRow>> {
  const id = parse(googlePlaceIdSchema, googlePlaceId);
  if (!id) return invalid;
  return run(({ service }) => service.addCity(id.value), { revalidate: true });
}

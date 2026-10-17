import "server-only";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/server";
import { PlacesError } from "@/lib/places/types";

const STATUS_BY_KIND = {
  auth: 502,
  unknown: 502,
  network: 502,
  quota: 429,
  not_found: 404,
} as const;

export async function requireUser(): Promise<boolean> {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  return !!data.user;
}

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export function placesErrorResponse(err: unknown): NextResponse {
  if (err instanceof PlacesError) {
    return NextResponse.json({ error: err.kind }, { status: STATUS_BY_KIND[err.kind] });
  }
  console.error(err);
  return NextResponse.json({ error: "unknown" }, { status: 500 });
}

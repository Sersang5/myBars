import { NextResponse } from "next/server";
import { PlacesError } from "@/lib/places/types";

export function exploreErrorResponse(err: unknown): NextResponse {
  if (err instanceof PlacesError) {
    if (err.kind === "auth")
      return NextResponse.json({ error: "auth", message: "La clave de Google Maps no es válida" }, { status: 502 });
    if (err.kind === "quota")
      return NextResponse.json({ error: "quota", message: "Se ha superado la cuota de Google Maps" }, { status: 429 });
    return NextResponse.json({ error: err.kind, message: "Error al consultar Google Maps" }, { status: 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "unknown", message: "Algo ha fallado. Inténtalo de nuevo." }, { status: 500 });
}

import { NextResponse, type NextRequest } from "next/server";
import { selectOwnBars } from "@/lib/explorer/own";
import { exploreRequestSchema } from "@/lib/explorer/request";
import { runExplore } from "@/lib/explorer/run";
import { PlacesError, type LocationScope } from "@/lib/places/types";
import { getDeps } from "@/lib/server/deps";
import { badRequest, requireUser, unauthorized } from "@/lib/server/places-route";

export const maxDuration = 60;

const CITY_RADIUS_M = 10_000;

function errorResponse(err: unknown): NextResponse {
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

export async function POST(req: NextRequest) {
  try {
    if (!(await requireUser())) return unauthorized();
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest();
    }
    const parsed = exploreRequestSchema.safeParse(json);
    if (!parsed.success) return badRequest();
    const body = parsed.data;

    const { repo, places, details, llm } = await getDeps();
    const cities = await repo.listCities();

    let scope: LocationScope;
    let visitedBars;
    if (body.scope.kind === "city") {
      const cityId = body.scope.cityId;
      const city = cities.find((c) => c.id === cityId);
      if (!city || city.lat === null || city.lng === null) return badRequest();
      scope = { kind: "city", center: { lat: city.lat, lng: city.lng }, radiusM: CITY_RADIUS_M };
      visitedBars = await repo.listBars(city.id, "visited");
    } else {
      scope = { kind: "near", center: { lat: body.scope.lat, lng: body.scope.lng }, radiusM: body.scope.radiusM };
      visitedBars = (await Promise.all(cities.map((c) => repo.listBars(c.id, "visited")))).flat();
    }

    const [visitedIds, pendingIds] = await Promise.all([
      repo.listAllVisitedGooglePlaceIds(),
      repo.listPendingGooglePlaceIds(),
    ]);

    const response = await runExplore(
      { llm, places, details, visitedIds, pendingIds, ownBars: selectOwnBars(visitedBars, scope) },
      { prompt: body.prompt, scope, novelty: body.novelty },
    );
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err);
  }
}

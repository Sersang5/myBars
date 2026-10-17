import { NextResponse, type NextRequest } from "next/server";
import { getDeps } from "@/lib/server/deps";
import { badRequest, placesErrorResponse, requireUser, unauthorized } from "@/lib/server/places-route";

export async function GET(req: NextRequest) {
  try {
    if (!(await requireUser())) return unauthorized();
    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim();
    if (q.length > 200) return badRequest();
    if (q.length < 2) return NextResponse.json([]);

    const lat = params.get("lat");
    const lng = params.get("lng");
    const latN = lat === null || lat === "" ? NaN : Number(lat);
    const lngN = lng === null || lng === "" ? NaN : Number(lng);
    const hasLat = lat !== null && lat !== "";
    const hasLng = lng !== null && lng !== "";
    if (hasLat !== hasLng) return badRequest();
    if (hasLat && !(Math.abs(latN) <= 90 && Math.abs(lngN) <= 180)) return badRequest();
    const bias = hasLat ? { lat: latN, lng: lngN } : null;

    const { places } = await getDeps();
    return NextResponse.json(await places.autocomplete(q, bias));
  } catch (err) {
    return placesErrorResponse(err);
  }
}

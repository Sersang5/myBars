import { NextResponse, type NextRequest } from "next/server";
import { googlePlaceIdSchema } from "@/lib/bars/schemas";
import { getDeps } from "@/lib/server/deps";
import { badRequest, placesErrorResponse, requireUser, unauthorized } from "@/lib/server/places-route";

export async function GET(req: NextRequest) {
  try {
    if (!(await requireUser())) return unauthorized();
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (!googlePlaceIdSchema.safeParse(id).success) return badRequest();

    const { details } = await getDeps();
    return NextResponse.json(await details(id));
  } catch (err) {
    return placesErrorResponse(err);
  }
}

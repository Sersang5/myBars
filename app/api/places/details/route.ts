import { NextResponse, type NextRequest } from "next/server";
import { getDeps } from "@/lib/server/deps";
import { placesErrorResponse, requireUser, unauthorized } from "@/lib/server/places-route";

export async function GET(req: NextRequest) {
  try {
    if (!(await requireUser())) return unauthorized();
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const { details } = await getDeps();
    return NextResponse.json(await details(id));
  } catch (err) {
    return placesErrorResponse(err);
  }
}

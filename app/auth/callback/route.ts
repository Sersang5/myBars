import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/bars`);
  }
  // Typically the link was opened in a different browser than the one that asked for it
  // (iOS home-screen PWA vs Safari), so the PKCE verifier is missing.
  return NextResponse.redirect(`${origin}/login?error=link`);
}

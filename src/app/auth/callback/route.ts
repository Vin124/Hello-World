import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Google -> Supabase -> here with ?code=. Exchange it for a session, then
// send first-timers (no name on file) to onboarding.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing%20auth%20code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", data.user.id)
    .single();

  if (!profile?.first_name || !profile?.last_name) {
    return NextResponse.redirect(
      `${origin}/onboarding?next=${encodeURIComponent(next)}`,
    );
  }
  return NextResponse.redirect(`${origin}${next}`);
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postLoginPath } from "@/lib/access-control";
import type { Role } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : { data: null };
      if (profile?.role) {
        return NextResponse.redirect(`${origin}${postLoginPath(profile.role as Role, next)}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/entrar?erro=auth`);
}

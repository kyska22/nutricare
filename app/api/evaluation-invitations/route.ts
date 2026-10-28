import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let response = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: nutritionist, error: nutritionistError } = await supabase
    .from("nutritionists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (nutritionistError || (!nutritionist && user.app_metadata?.role !== "nutritionist")) {
    return NextResponse.json({ error: "Nutritionist access required." }, { status: 403 });
  }
  const { data: token, error } = await supabase.rpc("create_evaluation_invitation");
  if (error || typeof token !== "string") return NextResponse.json({ error: error?.message ?? "Invitation creation failed." }, { status: 400 });
  const origin = request.nextUrl.origin;
  return NextResponse.json({ url: `${origin}/?invite=${encodeURIComponent(token)}` }, { headers: response.headers });
}

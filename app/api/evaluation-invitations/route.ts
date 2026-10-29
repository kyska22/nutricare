import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let commitResponseCookies: Array<(response: NextResponse) => void> = [];
  const json = (body: unknown, init?: ResponseInit) => {
    const result = NextResponse.json(body, init);
    commitResponseCookies.forEach((commit) => commit(result));
    return result;
  };
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => request.cookies.set(name, value));
        commitResponseCookies = cookies.map(({ name, value, options }) => (response) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  try {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Authentication required." }, { status: 401 });
  const { data: nutritionist, error: nutritionistError } = await supabase
    .from("nutritionists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (nutritionistError || (!nutritionist && user.app_metadata?.role !== "nutritionist")) {
    return json({ error: "Nutritionist access required." }, { status: 403 });
  }
  const { data: token, error } = await supabase.rpc("create_evaluation_invitation");
  if (error || typeof token !== "string") {
    console.error("[evaluation-invitations] Invitation creation failed:", error?.message);
    return json({ error: error?.message ?? "Invitation creation failed." }, { status: 400 });
  }
  const origin = request.nextUrl.origin;
  return json({ url: `${origin}/?invite=${encodeURIComponent(token)}` });
  } catch (error) {
    console.error("[evaluation-invitations] Unhandled error:", error);
    return json({ error: "The server could not create the invitation." }, { status: 500 });
  }
}

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const token = payload.invitationToken;
  const idempotencyKey = payload.idempotencyKey;
  if ((token !== undefined && token !== null && (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token))) ||
      typeof idempotencyKey !== "string" || !/^[a-zA-Z0-9-]{16,128}$/.test(idempotencyKey) ||
      !payload.formData || !payload.assessment || !payload.professionalReview) {
    return NextResponse.json({ error: "Invalid invitation or assessment." }, { status: 400 });
  }
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
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        commitResponseCookies = cookies.map(({ name, value, options }) => (response) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  try {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Authentication required." }, { status: 401 });
  }

  let data: unknown;
  let error: { message: string } | null;
  if (typeof token === "string") {
    const result = await supabase.rpc("submit_public_evaluation", {
      p_token: token,
      p_idempotency_key: idempotencyKey,
      p_payload: payload,
    });
    data = result.data;
    error = result.error;
    if (!error && data && typeof data === "object" && typeof (data as { id?: unknown }).id === "string") {
      const linked = await supabase.rpc("link_patient_evaluation", {
        p_evaluation_id: (data as { id: string }).id,
        p_token: token,
      });
      if (linked.error) error = linked.error;
      else data = { ...(data as Record<string, unknown>), patient_code: linked.data };
    }
  } else {
    const result = await supabase.rpc("submit_patient_evaluation", {
      p_idempotency_key: idempotencyKey,
      p_payload: payload,
    });
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error("[public-evaluations] Supabase rejected the save:", error.message);
    return json(
      { error: "Evaluation could not be saved. Verify the patient account migration is applied, then try again." },
      { status: 400 },
    );
  }

  return json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("[public-evaluations] Unhandled save error:", message);
    return json({ error: "The server could not process the evaluation." }, { status: 500 });
  }
}

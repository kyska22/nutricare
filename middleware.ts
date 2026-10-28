import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPatientEvaluationRoute = pathname === "/";

  if (!isAdminRoute && !isPatientEvaluationRoute) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    if (isAdminRoute && !isLoginRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAdminRoute && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user && isPatientEvaluationRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/pacientes/acceso";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAdminRoute) {
    const { data: nutritionist, error: nutritionistError } = await supabase
      .from("nutritionists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const hasProfessionalRole = user.app_metadata?.role === "nutritionist";

    if (nutritionistError || (!nutritionist && !hasProfessionalRole)) {
      const patientUrl = request.nextUrl.clone();
      patientUrl.pathname = "/pacientes/acceso";
      patientUrl.search = "";
      patientUrl.searchParams.set("notice", "professional");
      return NextResponse.redirect(patientUrl);
    }
  }

  if (user && isLoginRoute) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin/evaluaciones";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};

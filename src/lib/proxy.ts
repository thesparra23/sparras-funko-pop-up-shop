import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                request.cookies.set(
                  name,
                  value
                );

                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  console.log(
    "ADMIN AUTH CHECK:",
    claimsData?.claims
      ? "LOGGED IN"
      : "NOT LOGGED IN"
  );

  const isAdminRoute =
    request.nextUrl.pathname.startsWith(
      "/admin"
    );

  if (
    isAdminRoute &&
    !claimsData?.claims
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.searchParams.set(
      "redirectTo",
      request.nextUrl.pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  return supabaseResponse;
}
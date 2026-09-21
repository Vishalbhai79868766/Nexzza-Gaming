import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const db = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (values, headers) => {
          values.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          values.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, {
              ...options,
              ...(req.cookies.get("nexzza-remember")?.value === "no"
                ? { maxAge: undefined, expires: undefined }
                : {}),
            }),
          );
          Object.entries(headers || {}).forEach(([k, v]) =>
            res.headers.set(k, v),
          );
        },
      },
    });
    await db.auth.getUser();
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=()",
  );
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'",
  );
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg|nexzza-world.webp|assets).*)",
  ],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Handle OAuth PKCE code exchange ──────────────────────────
  // When Google redirects back, the URL is /dashboard?code=<pkce_code>.
  // The middleware exchanges the code for a session (server-side), then
  // redirects to the SAME URL without the code param. This prevents the
  // client-side Supabase SDK from trying to re-exchange the (now used,
  // single-use) code — which would fail and clear the session, leaving
  // the page stuck loading forever.
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    // Exchange the PKCE code for a session. The code_verifier is read
    // from a cookie that was set by signInWithOAuth() on the client.
    await supabase.auth.exchangeCodeForSession(request.url);

    // Build the clean URL (same path, same non-OAuth params, no code).
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('code');
    cleanUrl.searchParams.delete('error');
    cleanUrl.searchParams.delete('error_code');
    cleanUrl.searchParams.delete('error_description');
    cleanUrl.searchParams.delete('provider');
    cleanUrl.searchParams.delete('provider_token');
    cleanUrl.searchParams.delete('provider_refresh_token');

    const redirectResponse = NextResponse.redirect(cleanUrl);
    // Carry over the session cookies that exchangeCodeForSession just set.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  // ── Normal request (no code in URL) ──────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/pricing',
    '/privacy-policy',
    '/terms',
  ];

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicApiRoute = pathname.startsWith('/api/webhooks');
  const isStaticFile =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    [".ico", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".webmanifest", ".css", ".js", ".map", ".woff", ".woff2", ".ttf"].some(ext =>
      pathname.endsWith(ext)
    );

  if (isPublicRoute || isPublicApiRoute || isStaticFile) {
    return supabaseResponse;
  }

  // Redirect to homepage with auth modal open if not authenticated
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

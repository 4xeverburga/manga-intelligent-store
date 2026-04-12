import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/app?mal_error=missing_params`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("mal_oauth_state")?.value;
  const codeVerifier = cookieStore.get("mal_pkce_verifier")?.value;

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/app?mal_error=invalid_state`);
  }

  if (!codeVerifier) {
    return NextResponse.redirect(`${appUrl}/app?mal_error=missing_verifier`);
  }

  // Clean up PKCE cookies
  cookieStore.delete("mal_oauth_state");
  cookieStore.delete("mal_pkce_verifier");

  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_API_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/app?mal_error=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/mal/callback`;

  try {
    const tokenRes = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[MAL OAuth] Token exchange failed:", errorBody);
      return NextResponse.redirect(`${appUrl}/app?mal_error=token_exchange`);
    }

    const { access_token, refresh_token } = await tokenRes.json();

    const isSecure = appUrl.startsWith("https");
    const response = NextResponse.redirect(`${appUrl}/app?mal_connected=1`);

    response.cookies.set("mal_access_token", access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 3600, // 1 hour (MAL token lifetime)
      path: "/",
    });
    response.cookies.set("mal_refresh_token", refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 2592000, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[MAL OAuth] Callback error:", error);
    return NextResponse.redirect(`${appUrl}/app?mal_error=server_error`);
  }
}

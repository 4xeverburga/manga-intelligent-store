import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET() {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "MAL OAuth not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/mal/callback`;

  // PKCE: MAL only supports "plain" method (code_challenge = code_verifier)
  const codeVerifier = randomBytes(64).toString("base64url").slice(0, 128);

  // CSRF protection
  const state = randomBytes(16).toString("hex");

  const isSecure = appUrl.startsWith("https");
  const cookieStore = await cookies();

  cookieStore.set("mal_pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("mal_oauth_state", state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = new URL("https://myanimelist.net/v1/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", codeVerifier);
  authUrl.searchParams.set("code_challenge_method", "plain");

  return NextResponse.redirect(authUrl.toString());
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MALAdapter } from "@/infrastructure/social/MALAdapter";
import { ProfileServiceAdapter } from "@/infrastructure/social/ProfileServiceAdapter";

const malAdapter = new MALAdapter();
const profileService = new ProfileServiceAdapter();

/** Try to refresh the MAL access token using the refresh token */
async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_API_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("mal_access_token")?.value;
  const refreshToken = cookieStore.get("mal_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { error: "No MAL session. Conecta tu cuenta primero." },
      { status: 401 }
    );
  }

  // If no access token but have refresh token, try to refresh
  let newTokens: { access_token: string; refresh_token: string } | null = null;
  if (!accessToken && refreshToken) {
    newTokens = await refreshAccessToken(refreshToken);
    if (!newTokens) {
      return NextResponse.json(
        { error: "Sesión MAL expirada. Reconecta tu cuenta." },
        { status: 401 }
      );
    }
    accessToken = newTokens.access_token;
  }

  try {
    const profile = await malAdapter.fetchProfileWithToken(accessToken!);
    const tags = await profileService.extractInterestTags(profile);
    profile.interestTags = tags;

    const response = NextResponse.json(profile);

    // If we refreshed tokens, update the cookies
    if (newTokens) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const isSecure = appUrl.startsWith("https");
      response.cookies.set("mal_access_token", newTokens.access_token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 3600,
        path: "/",
      });
      response.cookies.set("mal_refresh_token", newTokens.refresh_token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 2592000,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    // If 401 from MAL API, attempt token refresh
    if (
      error instanceof Error &&
      error.message.includes("401") &&
      refreshToken &&
      !newTokens
    ) {
      newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        try {
          const profile = await malAdapter.fetchProfileWithToken(
            newTokens.access_token
          );
          const tags = await profileService.extractInterestTags(profile);
          profile.interestTags = tags;

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const isSecure = appUrl.startsWith("https");
          const response = NextResponse.json(profile);
          response.cookies.set("mal_access_token", newTokens.access_token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            maxAge: 3600,
            path: "/",
          });
          response.cookies.set("mal_refresh_token", newTokens.refresh_token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            maxAge: 2592000,
            path: "/",
          });
          return response;
        } catch (retryError) {
          console.error("[MAL OAuth Profile] Retry failed:", retryError);
        }
      }
    }

    console.error("[MAL OAuth Profile]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener perfil de MAL",
      },
      { status: 422 }
    );
  }
}

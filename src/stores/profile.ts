import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInsight, PlatformType } from "@/core/domain/entities/UserInsight";

interface ProfileState {
  profiles: Record<string, UserInsight>;
  loadingPlatform: PlatformType | null;
  error: string | null;
  connectProfile: (username: string, platform: PlatformType) => Promise<void>;
  connectMALOAuth: () => void;
  fetchMALOAuthProfile: () => Promise<void>;
  disconnectProfile: (platform: PlatformType) => void;
  refreshProfile: (platform: PlatformType) => Promise<void>;
  clearAll: () => void;
}

/** Merged view of all connected profiles for AI context */
export function selectMergedContext(state: ProfileState) {
  const all = Object.values(state.profiles);
  if (all.length === 0) return null;
  return {
    platforms: all.map((p) => ({
      username: p.username,
      platform: p.platform,
    })),
    interestTags: [...new Set(all.flatMap((p) => p.interestTags))],
    favoriteGenres: [...new Set(all.flatMap((p) => p.favoriteGenres))],
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      loadingPlatform: null,
      error: null,

      connectProfile: async (username, platform) => {
        set({ loadingPlatform: platform, error: null });
        try {
          const res = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, platform }),
          });
          const data = await res.json();
          if (!res.ok) {
            set({ error: data.error || "Error al obtener perfil", loadingPlatform: null });
            return;
          }
          set((s) => ({
            profiles: { ...s.profiles, [platform]: data },
            loadingPlatform: null,
          }));
        } catch {
          set({ error: "Error de conexión", loadingPlatform: null });
        }
      },

      connectMALOAuth: () => {
        window.location.href = "/api/auth/mal";
      },

      fetchMALOAuthProfile: async () => {
        set({ loadingPlatform: "mal", error: null });
        try {
          const res = await fetch("/api/auth/mal/profile");
          const data = await res.json();
          if (!res.ok) {
            set({
              error: data.error || "Error al obtener perfil MAL",
              loadingPlatform: null,
            });
            return;
          }
          set((s) => ({
            profiles: { ...s.profiles, mal: data },
            loadingPlatform: null,
          }));
        } catch {
          set({ error: "Error de conexión con MAL", loadingPlatform: null });
        }
      },

      disconnectProfile: (platform) =>
        set((s) => {
          const { [platform]: _, ...rest } = s.profiles;
          return { profiles: rest, error: null };
        }),

      refreshProfile: async (platform) => {
        const existing = get().profiles[platform];
        if (!existing) return;
        // OAuth-connected MAL profiles refresh via the OAuth endpoint
        if (platform === "mal" && existing.rawData?.source === "oauth") {
          await get().fetchMALOAuthProfile();
          return;
        }
        await get().connectProfile(existing.username, platform);
      },

      clearAll: () => set({ profiles: {}, error: null }),
    }),
    {
      name: "hablemos-manga-profile",
      partialize: (state) => ({ profiles: state.profiles }),
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInsight } from "@/core/domain/entities/UserInsight";

interface ProfileState {
  profile: UserInsight | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (username: string, platform: "reddit" | "mal") => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      loading: false,
      error: null,

      fetchProfile: async (username, platform) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, platform }),
          });
          const data = await res.json();
          if (!res.ok) {
            set({ error: data.error || "Error al obtener perfil", loading: false });
            return;
          }
          set({ profile: data, loading: false });
        } catch {
          set({ error: "Error de conexión", loading: false });
        }
      },

      clear: () => set({ profile: null, error: null }),
    }),
    {
      name: "hablemos-manga-profile",
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);

"use client";

import { useState } from "react";
import Image from "next/image";
import { User, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useProfileStore } from "@/stores/profile";

export function InsightsSidebar() {
  const { profile, loading, error, fetchProfile, clear } = useProfileStore();
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<"reddit" | "mal">("mal");

  const handleConnect = () => {
    if (!username.trim()) return;
    fetchProfile(username.trim(), platform);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <User className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tu Perfil</h2>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Sincronizando perfil...</p>
            <div className="w-full space-y-2">
              <div className="h-16 w-16 mx-auto animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-3/4 mx-auto animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 mx-auto animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : profile ? (
          <div className="px-4 py-4">
            {/* Avatar + username */}
            <div className="flex flex-col items-center gap-2 text-center">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.username}
                  width={64}
                  height={64}
                  className="size-16 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{profile.username}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.platform === "mal" ? "MyAnimeList" : "Reddit"}
                </p>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground line-clamp-4">
                  {profile.bio}
                </p>
              </>
            )}

            {/* AI Interest Tags */}
            {profile.interestTags.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="mb-2 text-xs font-medium text-foreground">
                  Intereses IA
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interestTags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {/* Favorite genres */}
            {profile.favoriteGenres.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="mb-2 text-xs font-medium text-foreground">
                  Géneros favoritos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.favoriteGenres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-[10px]">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {/* Reconnect */}
            <Separator className="my-3" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fetchProfile(profile.username, profile.platform)}
                disabled={loading}
              >
                <RefreshCw className="mr-1 size-3" />
                Reconectar
              </Button>
              <Button variant="ghost" size="sm" onClick={clear}>
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <User className="h-8 w-8 opacity-30" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Conecta tu perfil
              </p>
              <p className="text-xs text-muted-foreground">
                Vincula Reddit o MyAnimeList para recomendaciones personalizadas.
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="w-full space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu username..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />

              <div className="flex gap-2">
                <Button
                  variant={platform === "mal" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPlatform("mal")}
                >
                  MyAnimeList
                </Button>
                <Button
                  variant={platform === "reddit" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPlatform("reddit")}
                >
                  Reddit
                </Button>
              </div>

              <Button
                onClick={handleConnect}
                disabled={!username.trim() || loading}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Conectar
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useProfileStore } from "@/stores/profile";
import type { UserInsight, PlatformType } from "@/core/domain/entities/UserInsight";

const PLATFORMS: { id: PlatformType; label: string }[] = [
  { id: "mal", label: "MyAnimeList" },
  { id: "reddit", label: "Reddit" },
];

function ProfileCard({ profile }: { profile: UserInsight }) {
  const { disconnectProfile, refreshProfile, loadingPlatform } =
    useProfileStore();
  const isRefreshing = loadingPlatform === profile.platform;

  return (
    <div className="rounded-lg border border-border/40 bg-background/50 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.username}
            width={36}
            height={36}
            className="size-9 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile.username}</p>
          <p className="text-[10px] text-muted-foreground">
            {PLATFORMS.find((p) => p.id === profile.platform)?.label}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => refreshProfile(profile.platform)}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            onClick={() => disconnectProfile(profile.platform)}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
          {profile.bio}
        </p>
      )}

      {/* Tags */}
      {profile.interestTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.interestTags.map((tag) => (
            <Badge key={tag} variant="default" className="text-[9px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Genres */}
      {profile.favoriteGenres.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {profile.favoriteGenres.map((genre) => (
            <Badge key={genre} variant="secondary" className="text-[9px]">
              {genre}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function InsightsSidebar() {
  const { profiles, loadingPlatform, error, connectProfile } =
    useProfileStore();
  const connectedList = Object.values(profiles);
  const unconnected = PLATFORMS.filter((p) => !profiles[p.id]);

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<PlatformType>(
    unconnected[0]?.id ?? "mal"
  );

  const handleConnect = () => {
    if (!username.trim()) return;
    connectProfile(username.trim(), platform);
    setUsername("");
    setShowForm(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <User className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tus Perfiles</h2>
        {connectedList.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {connectedList.length}
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {/* Connected profiles */}
          {connectedList.map((p) => (
            <ProfileCard key={p.platform} profile={p} />
          ))}

          {/* Loading indicator */}
          {loadingPlatform && !profiles[loadingPlatform] && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border/40 bg-background/50 p-4">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Conectando{" "}
                {PLATFORMS.find((p) => p.id === loadingPlatform)?.label}...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-center text-xs text-destructive">{error}</p>
          )}

          {/* Add new connection form */}
          {unconnected.length > 0 && (
            <>
              {showForm ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-3">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu username..."
                    className="text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  />
                  <div className="flex gap-1.5">
                    {unconnected.map((p) => (
                      <Button
                        key={p.id}
                        variant={platform === p.id ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setPlatform(p.id)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleConnect}
                      disabled={!username.trim() || !!loadingPlatform}
                      size="sm"
                      className="flex-1"
                    >
                      <ExternalLink className="mr-1.5 size-3" />
                      Conectar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => {
                    setPlatform(unconnected[0].id);
                    setShowForm(true);
                  }}
                >
                  <Plus className="mr-1.5 size-3" />
                  Conectar{" "}
                  {connectedList.length > 0 ? "otra cuenta" : "perfil"}
                </Button>
              )}
            </>
          )}

          {/* Empty state */}
          {connectedList.length === 0 && !showForm && !loadingPlatform && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <User className="size-7 opacity-30" />
              </div>
              <p className="text-xs text-muted-foreground">
                Vincula tus cuentas para recomendaciones personalizadas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

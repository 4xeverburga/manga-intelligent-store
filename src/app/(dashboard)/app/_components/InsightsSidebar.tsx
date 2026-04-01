"use client";

import { User, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function InsightsSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <User className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Tu Perfil</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center text-muted-foreground">
          {/* Placeholder avatar */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 opacity-30" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Conecta tu perfil
            </p>
            <p className="text-xs">
              Vincula Reddit o MyAnimeList para recomendaciones más precisas.
            </p>
          </div>

          <Separator />

          <div className="w-full space-y-2">
            <Button variant="outline" size="sm" className="w-full" disabled>
              <ExternalLink className="mr-2 h-3 w-3" />
              Reddit
            </Button>
            <Button variant="outline" size="sm" className="w-full" disabled>
              <ExternalLink className="mr-2 h-3 w-3" />
              MyAnimeList
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            Disponible próximamente
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

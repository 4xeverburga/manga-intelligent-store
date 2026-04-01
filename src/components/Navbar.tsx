"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-primary">Hablemos</span>{" "}
          <span className="text-foreground">Manga</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/catalogue"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Catálogo
          </Link>
          <Link
            href="/app"
            className={buttonVariants({ size: "sm" })}
          >
            Iniciar Chat
          </Link>
        </div>
      </nav>
    </header>
  );
}

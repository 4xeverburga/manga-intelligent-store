"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CartSidebar } from "@/app/(dashboard)/app/_components/CartSidebar";
import { useCartStore, selectTotalItems } from "@/stores/cart";

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore(selectTotalItems);

  return (
    <>
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
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cta text-[10px] font-bold text-cta-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetContent side="right" className="w-[320px] bg-surface p-0">
                <CartSidebar />
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* Floating chat button */}
      <Link
        href="/app"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Abrir chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Link>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CartSidebar } from "@/app/(dashboard)/app/_components/CartSidebar";
import { useCartStore, selectTotalItems } from "@/stores/cart";

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = useCartStore(selectTotalItems);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-[#102620]/95 backdrop-blur-md border-b border-[#1e2c31]"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-8 lg:px-16">
          <Link href="/" className="text-lg font-medium tracking-tight text-white">
            Hablemos <span className="font-light">Manga</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/catalogue"
              className="hidden sm:inline-flex text-sm font-medium text-white/80 tracking-wide hover:text-white transition-colors"
            >
              Catálogo
            </Link>
            <Link
              href="/app"
              className="hidden sm:inline-flex text-sm font-medium text-white/80 tracking-wide hover:text-white transition-colors"
            >
              Chat IA
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neon text-[10px] font-bold text-black">
                  {itemCount}
                </span>
              )}
            </Button>
            <Link
              href="/app"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Iniciar Chat
            </Link>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetContent side="right" className="w-[320px] bg-[#02090a] border-[#1e2c31] p-0">
                <CartSidebar />
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* Floating chat button */}
      <Link
        href="/app"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neon text-black shadow-lg shadow-neon/25 transition-transform hover:scale-105 active:scale-95"
        aria-label="Abrir chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Link>
    </>
  );
}

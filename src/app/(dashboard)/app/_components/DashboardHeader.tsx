"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { InsightsSidebar } from "@/app/(dashboard)/app/_components/InsightsSidebar";
import { CartSidebar } from "@/app/(dashboard)/app/_components/CartSidebar";
import { useCartStore, selectTotalItems } from "@/stores/cart";

export function DashboardHeader() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const itemCount = useCartStore(selectTotalItems);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border/40 bg-surface px-4">
      {/* Mobile: left sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setLeftOpen(true)}
      >
        <User className="h-4 w-4" />
      </Button>
      <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
        <SheetContent side="left" className="w-[280px] bg-surface p-0">
          <InsightsSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-tight">
          <span className="text-primary">Hablemos</span>{" "}
          <span className="text-foreground">Manga</span>
        </Link>
        <Link
          href="/catalogue"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Catálogo
        </Link>
      </div>

      {/* Mobile: right sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="relative lg:hidden"
        onClick={() => setRightOpen(true)}
      >
        <ShoppingCart className="h-4 w-4" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cta text-[10px] font-bold text-cta-foreground">
            {itemCount}
          </span>
        )}
      </Button>
      <Sheet open={rightOpen} onOpenChange={setRightOpen}>
        <SheetContent side="right" className="w-[320px] bg-surface p-0">
          <CartSidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />
    </header>
  );
}

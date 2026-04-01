"use client";

import { Chat } from "./_components/Chat";
import { CartSidebar } from "./_components/CartSidebar";
import { InsightsSidebar } from "./_components/InsightsSidebar";
import { DashboardHeader } from "./_components/DashboardHeader";

export default function AppPage() {
  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - insights (hidden on mobile) */}
        <aside className="hidden w-[280px] shrink-0 border-r border-border/40 bg-surface lg:block">
          <InsightsSidebar />
        </aside>

        {/* Center - chat */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <Chat />
        </main>

        {/* Right sidebar - cart (hidden on mobile) */}
        <aside className="hidden w-[320px] shrink-0 border-l border-border/40 bg-surface lg:block">
          <CartSidebar />
        </aside>
      </div>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat — Hablemos Manga",
  description: "Tu asistente de manga con IA",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-screen flex-col">{children}</div>;
}

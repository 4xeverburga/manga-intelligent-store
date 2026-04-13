import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hablemos Manga — Recomendaciones AI Personalizadas",
    template: "%s | Hablemos Manga",
  },
  description:
    "Descubre tu próximo manga favorito con recomendaciones personalizadas por IA. Chat inteligente, búsqueda semántica y carrito asistido.",
  keywords: [
    "manga",
    "recomendaciones",
    "IA",
    "inteligencia artificial",
    "tienda manga",
    "anime",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "Hablemos Manga",
    description: "Recomendaciones de manga potenciadas por IA",
    type: "website",
    siteName: "Hablemos Manga",
  },
  other: {
    "theme-color": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}

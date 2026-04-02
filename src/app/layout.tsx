import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
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
    "theme-color": "#020617",
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
      className={`dark ${jakarta.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}

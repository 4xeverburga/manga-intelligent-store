"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Search, ShoppingCart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  fadeIn,
  slideUp,
  staggerContainer,
  scaleOnHover,
} from "@/components/motion";

const features = [
  {
    icon: MessageSquare,
    title: "Chat con IA",
    description:
      "Conversa con un asistente que entiende tus gustos y recomienda mangas perfectos para ti.",
  },
  {
    icon: Search,
    title: "Búsqueda Semántica",
    description:
      "Describe lo que buscas en lenguaje natural y encuentra mangas similares con RAG + pgvector.",
  },
  {
    icon: ShoppingCart,
    title: "Carrito Inteligente",
    description:
      "La IA agrega sugerencias a tu carrito. Tú siempre tienes el control de los items manuales.",
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4">
          {/* Gradient background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute right-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-cta/10 blur-[100px]" />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={slideUp}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Tu siguiente manga favorito,{" "}
              <span className="text-primary">recomendado por IA</span>
            </motion.h1>

            <motion.p
              variants={slideUp}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
            >
              Describe lo que te gusta, conecta tus perfiles y deja que nuestra
              IA encuentre exactamente lo que buscas entre más de 500 títulos.
            </motion.p>

            <motion.div
              variants={slideUp}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                href="/app"
                className={buttonVariants({ size: "lg", className: "bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/25" })}
              >
                🚀 Iniciar Chat
              </Link>
              <Link
                href="/catalogue"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Explorar Catálogo
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="border-t border-border/40 bg-surface/50 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid gap-6 sm:grid-cols-3"
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={fadeIn}
                  {...scaleOnHover}
                >
                  <Card className="h-full border-border/40 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                      <f.icon className="mb-2 h-8 w-8 text-primary" />
                      <CardTitle className="text-lg">{f.title}</CardTitle>
                      <CardDescription>{f.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

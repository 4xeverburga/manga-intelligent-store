"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Search, ShoppingCart } from "lucide-react";
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
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
          {/* Dark teal atmospheric gradient */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#102620_0%,#02090a_50%,#000000_100%)]" />
            <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon/5 blur-[150px]" />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="relative z-10 mx-auto max-w-4xl text-center"
          >
            <motion.h1
              variants={slideUp}
              className="text-5xl font-light tracking-tight text-white sm:text-7xl lg:text-[96px] lg:leading-[1]"
            >
              Tu siguiente manga favorito,{" "}
              <span className="text-neon">recomendado por IA</span>
            </motion.h1>

            <motion.p
              variants={slideUp}
              className="mx-auto mt-8 max-w-2xl text-lg font-normal text-[#a1a1aa] sm:text-xl"
            >
              Describe lo que te gusta, conecta tus perfiles y deja que nuestra
              IA encuentre exactamente lo que buscas entre más de 500 títulos.
            </motion.p>

            <motion.div
              variants={slideUp}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-medium text-black transition-opacity hover:opacity-90"
              >
                Iniciar Chat
              </Link>
              <Link
                href="/catalogue"
                className="inline-flex items-center justify-center rounded-full border-2 border-white px-7 py-3 text-base font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Explorar Catálogo
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="bg-[#061a1c] py-20">
          <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-16">
            <div className="flex flex-col items-center justify-center gap-16 sm:flex-row">
              {[
                { value: "500+", label: "Títulos disponibles" },
                { value: "3072", label: "Dimensiones vectoriales" },
                { value: "IA", label: "Recomendaciones en tiempo real" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-normal tracking-wide text-[#a1a1aa]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-[#02090a] py-24">
          <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-16">
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
                  <div className="group h-full rounded-xl border border-[#1e2c31] bg-[#02090a] p-6 transition-all hover:border-[#36f4a4]/20"
                    style={{
                      boxShadow: "rgba(0,0,0,0.1) 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 2px 2px, rgba(0,0,0,0.1) 0px 4px 4px, rgba(0,0,0,0.1) 0px 8px 8px, rgba(255,255,255,0.03) 0px 1px 0px inset",
                    }}
                  >
                    <f.icon className="mb-4 h-8 w-8 text-neon" />
                    <h3 className="text-lg font-medium text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">{f.description}</p>
                  </div>
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

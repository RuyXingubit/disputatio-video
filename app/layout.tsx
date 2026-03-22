import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Disputatio ISP — Seja um parceiro de armazenamento",
  description:
    "Programa de parceria para provedores de internet brasileiros que querem contribuir com armazenamento e entrega de vídeos da plataforma Disputatio.",
  openGraph: {
    title: "Disputatio ISP",
    description: "Transforme infraestrutura ociosa em impacto real. Seja um nó da rede Disputatio.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

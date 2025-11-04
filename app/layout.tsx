import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ResizeObserverErrorSuppressor } from "@/components/resize-observer-error-suppressor"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "atelier",
  description: "atelier – node-based AI studio",
  metadataBase: new URL("https://atelier.jetzt"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <Suspense fallback={<div>loading...</div>}>
          <ResizeObserverErrorSuppressor />
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}

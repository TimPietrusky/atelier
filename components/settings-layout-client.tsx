"use client"

import { useRouter, usePathname } from "next/navigation"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsLayoutClient({
  children,
  hasProvider,
}: {
  children: React.ReactNode
  hasProvider: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = () => {
    window.location.href = "/api/auth/sign-out"
  }

  const navItems = [
    { href: "/settings/account", label: "account" },
    { href: "/settings/providers", label: "providers" },
    { href: "/settings/models", label: "models" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-[70] border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-1 py-1 gap-4">
        <div className="flex items-center gap-2">
          <Link href="/?from=app" className="cursor-pointer">
            <AtelierLogo className="h-8 w-auto text-foreground" />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/workflow")}
                className="h-8 gap-1.5 px-3 text-sm border font-normal rounded transition-all bg-transparent border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>back to workflow</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 px-3 text-sm border font-normal rounded transition-all bg-transparent border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
              >
                <span>sign out</span>
              </Button>
            </div>
            <h1 className="text-lg font-semibold mb-2">settings</h1>
          </div>

          <nav className="flex gap-1 mb-6 border-b border-border">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/settings/account" && pathname === "/settings")
              const showIndicator = item.href === "/settings/providers" && !hasProvider
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {showIndicator && (
                    <span className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {children}
        </div>
      </main>
    </div>
  )
}


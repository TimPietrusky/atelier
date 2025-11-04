"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProviderSettings } from "@/components/provider-settings"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (!data.authenticated) {
          router.push("/?redirect=/settings")
          return
        }
        setIsAuthenticated(true)
      } catch (error) {
        router.push("/?redirect=/settings")
      }
    }
    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-[70] border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-0 py-1 gap-4">
        <div className="flex items-center gap-2">
          <AtelierLogo className="h-8 w-auto text-foreground" />
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/workflow")}
              className="h-8 gap-1.5 px-3 text-sm border font-normal rounded transition-all bg-transparent border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Workflow</span>
            </Button>
            <h1 className="text-lg font-semibold mb-2">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure provider credentials and manage your account settings.
            </p>
          </div>
          <ProviderSettings />
        </div>
      </main>
    </div>
  )
}

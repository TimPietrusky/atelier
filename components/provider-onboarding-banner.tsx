"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Key, X } from "lucide-react"

export function ProviderOnboardingBanner() {
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkCredentials()
  }, [])

  const checkCredentials = async () => {
    try {
      const res = await fetch("/api/providers")
      if (res.ok) {
        const data = await res.json()
        const hasRunPod = data.credentials?.some(
          (c: any) => c.providerId === "runpod" && c.status === "active"
        )
        setHasCredentials(hasRunPod)
      }
    } catch (error) {
      console.error("Failed to check credentials:", error)
    }
  }

  if (hasCredentials || dismissed || hasCredentials === null) {
    return null
  }

  return (
    <Card className="m-4 p-4 border border-yellow-500/50 bg-yellow-500/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Key className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1">Configure Provider Credentials</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Add your RunPod API key to start generating images. Your keys are stored securely in
              WorkOS Vault.
            </p>
            <Button
              size="sm"
              className="h-7 px-3 text-xs font-semibold"
              onClick={() => {
                // Scroll to provider settings or open modal
                window.dispatchEvent(new CustomEvent("open-provider-settings"))
              }}
            >
              Add API Key
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}


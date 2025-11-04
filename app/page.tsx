"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if user is already logged in via API
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data.authenticated) {
          router.push("/workflow")
          return
        }
      } catch (error) {
        // Not authenticated, show landing page
      } finally {
        setChecking(false)
      }
    }
    checkAuth()
  }, [router])

  const handleLogin = () => {
    // Get return path from query params or default to /workflow
    const params = new URLSearchParams(window.location.search)
    const returnPath = params.get("redirect") || "/workflow"
    // Redirect to WorkOS login
    window.location.href = `/api/auth/sign-in?return_pathname=${encodeURIComponent(returnPath)}`
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <AtelierLogo className="h-16 w-auto mx-auto text-foreground" />

        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">gen media editor</p>
        </div>

        <div>
          <Button
            onClick={handleLogin}
            className="h-12 px-8 text-base font-semibold bg-white text-black hover:bg-white/90"
          >
            start
          </Button>
        </div>
      </div>
    </div>
  )
}

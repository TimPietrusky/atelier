"use client"

import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"

export default function LandingPageSimpleClient() {
  const handleLogin = () => {
    // Redirect to WorkOS login
    window.location.href = "/api/auth/sign-in"
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <AtelierLogo className="h-16 w-auto mx-auto text-foreground" />

        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">open-source gen media editor</p>
        </div>

        <div className="pt-8">
          <Button
            onClick={handleLogin}
            className="h-12 px-8 text-base font-semibold bg-white text-black hover:bg-white/90"
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}


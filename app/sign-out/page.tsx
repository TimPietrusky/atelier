"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"

export default function SignOutPage() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    // Automatically sign out on page load
    handleSignOut()
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      // Call sign-out API route
      await fetch("/api/auth/sign-out")
      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
      // Still redirect even if API call fails
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <AtelierLogo className="h-12 w-auto text-foreground mx-auto" />
        {signingOut ? (
          <div className="space-y-4">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Signing out...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">You have been signed out</p>
            <Button
              onClick={() => router.push("/")}
              className="bg-white text-black hover:bg-white/90"
            >
              Back to home
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

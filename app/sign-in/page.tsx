"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data.authenticated) {
          const returnPath = searchParams.get("return_pathname") || "/workflow"
          router.push(returnPath)
        }
      } catch (error) {
        // Not authenticated, show sign-in page
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const returnPathname = searchParams.get("return_pathname") || "/workflow"
    // Redirect to API route that initiates Google OAuth directly
    // This bypasses WorkOS hosted UI and goes straight to Google
    window.location.href = `/api/auth/google?return_pathname=${encodeURIComponent(returnPathname)}`
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <AtelierLogo className="h-12 w-auto text-foreground mx-auto" />
          <h1 className="text-2xl font-semibold">Sign in to atelier</h1>
          <p className="text-sm text-muted-foreground">Continue with your Google account</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-white/90 border border-border"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </span>
            )}
          </Button>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}

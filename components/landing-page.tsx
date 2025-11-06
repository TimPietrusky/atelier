"use client"

import { useEffect } from "react"
import { AtelierLogo } from "@/components/atelier-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingPage({
  error,
  redirectPath,
}: {
  error?: string
  redirectPath?: string
}) {
  useEffect(() => {
    // Clean up URL if there was an error
    if (error === "auth_failed") {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("error")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [error])

  const handleLogin = () => {
    // Get return path from query params or default to /workflow
    const returnPath = redirectPath || "/workflow"
    // Redirect to custom sign-in page
    window.location.href = `/sign-in?return_pathname=${encodeURIComponent(returnPath)}`
  }

  const authError =
    error === "auth_failed"
      ? "Authentication failed. This may be a temporary network issue. Please try again."
      : null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full text-center">
          <div className="space-y-6 mb-20">
            <div>
              <AtelierLogo className="h-16 w-auto text-foreground mx-auto" />
            </div>
            <p className="text-lg text-muted-foreground">gen media editor</p>
            {authError && <div className="text-sm text-red-500 mx-auto">{authError}</div>}
            <div>
              <Button
                onClick={handleLogin}
                className="h-12 px-8 text-base font-semibold bg-white text-black hover:bg-white/90"
              >
                start
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="border border-border rounded-lg p-6 text-center space-y-3">
              <h3 className="text-sm font-semibold text-foreground lowercase">
                bring your own api key
              </h3>
              <p className="text-xs text-muted-foreground lowercase">
                use any of the supported providers from the ai sdk with your own api keys
              </p>
            </div>
            <div className="border border-border rounded-lg p-6 text-center space-y-3">
              <h3 className="text-sm font-semibold text-foreground lowercase">local storage</h3>
              <p className="text-xs text-muted-foreground lowercase">
                all assets are stored locally in your browser
              </p>
            </div>
            <div className="border border-border rounded-lg p-6 text-center space-y-3">
              <h3 className="text-sm font-semibold text-foreground lowercase">open source soon</h3>
              <p className="text-xs text-muted-foreground lowercase">coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-6 px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div>
            © 2025 by{" "}
            <Link
              href="https://x.com/NERDDISCO"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Tim Pietrusky
            </Link>
          </div>
          <Link
            href="https://x.com/atelierjetzt"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="Follow atelier on X"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
        </div>
      </footer>
    </div>
  )
}

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
              <h3 className="text-sm font-semibold text-foreground lowercase">byok</h3>
              <p className="text-xs text-muted-foreground lowercase">
                use your own api key(s) for any of the supported providers from the ai sdk
              </p>
            </div>
            <div className="border border-border rounded-lg p-6 text-center space-y-3">
              <h3 className="text-sm font-semibold text-foreground lowercase">storage</h3>
              <p className="text-xs text-muted-foreground lowercase">
                all assets are stored locally in your browser
              </p>
            </div>
            <div className="border border-border rounded-lg p-6 text-center space-y-3">
              <h3 className="text-sm font-semibold text-foreground lowercase">open source</h3>
              <p className="text-xs text-muted-foreground lowercase">
                star or contribute on{" "}
                <Link
                  href="https://github.com/timpietrusky/atelier"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors underline"
                >
                  github
                </Link>
              </p>
              <p className="text-xs text-muted-foreground lowercase">Apache 2.0</p>
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
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/timpietrusky/atelier"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              aria-label="View atelier on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </Link>
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
        </div>
      </footer>
    </div>
  )
}

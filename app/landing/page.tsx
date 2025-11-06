import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import LandingPageSimpleClient from "@/components/landing-page-simple-client"

export default async function LandingPage() {
  const user = await getAuthenticatedUser()

  // If authenticated, redirect to workflow
  if (user) {
    redirect("/workflow")
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">loading...</div></div>}>
      <LandingPageSimpleClient />
    </Suspense>
  )
}

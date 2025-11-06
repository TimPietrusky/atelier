import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import LandingPageClient from "@/components/landing-page-client"

async function LandingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; from?: string }>
}) {
  const params = await searchParams
  const user = await getAuthenticatedUser()

  // If authenticated and not coming from app, redirect to workflow
  if (user && params.from !== "app") {
    redirect("/workflow")
  }

  return <LandingPageClient error={params.error} redirectPath={params.redirect} />
}

export default function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; from?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">loading...</div></div>}>
      <LandingPageContent searchParams={searchParams} />
    </Suspense>
  )
}

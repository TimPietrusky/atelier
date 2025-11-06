import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import LandingPage from "@/components/landing-page"

async function AuthAndParams({
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

  return <LandingPage error={params.error} redirectPath={params.redirect} />
}

export default function LandingPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; from?: string }>
}) {
  return (
    <Suspense fallback={<LandingPage />}>
      <AuthAndParams searchParams={searchParams} />
    </Suspense>
  )
}

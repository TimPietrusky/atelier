import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { hasActiveProvider } from "@/lib/server/providers"
import SettingsLayoutClient from "@/components/settings-layout-client"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/?redirect=/settings")
  }

  const hasRunPod = await hasActiveProvider(user.userId, "runpod")

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">loading...</div></div>}>
      <SettingsLayoutClient hasProvider={hasRunPod}>{children}</SettingsLayoutClient>
    </Suspense>
  )
}

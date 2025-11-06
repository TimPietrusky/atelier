import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { hasActiveProvider } from "@/lib/server/providers"
import SettingsLayoutClient from "@/components/settings-layout-client"

async function SettingsLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/?redirect=/settings")
  }

  const hasRunPod = await hasActiveProvider(user.userId, "runpod")

  return <SettingsLayoutClient hasProvider={hasRunPod}>{children}</SettingsLayoutClient>
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="p-4">loading...</div>}>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </Suspense>
  )
}

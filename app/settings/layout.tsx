import { redirect } from "next/navigation"
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

  return <SettingsLayoutClient hasProvider={hasRunPod}>{children}</SettingsLayoutClient>
}

import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth"
import { getProviderCredentials } from "@/lib/server/providers"
import { ProviderSettings } from "@/components/provider-settings"

export default async function ProvidersPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/?redirect=/settings/providers")
  }

  const initialCredentials = await getProviderCredentials(user.userId)

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">loading...</div>}>
      <ProviderSettings initialCredentials={initialCredentials} />
    </Suspense>
  )
}

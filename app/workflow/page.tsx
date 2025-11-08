import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import StudioDashboardClient from "@/components/studio-dashboard-client"

async function WorkflowContent() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/?redirect=/workflow")
  }

  return <StudioDashboardClient />
}

export default function StudioDashboard() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex items-center justify-center">
          <div className="text-sm text-muted-foreground">loading...</div>
        </div>
      }
    >
      <WorkflowContent />
    </Suspense>
  )
}

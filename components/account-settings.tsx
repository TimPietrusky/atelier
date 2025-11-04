"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { User } from "lucide-react"

interface UserInfo {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  profilePictureUrl?: string | null
}

export function AccountSettings() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return (
      <Card className="p-4 border border-border">
        <div className="text-sm text-muted-foreground">loading...</div>
      </Card>
    )
  }

  if (!user) {
    return null
  }

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email[0].toUpperCase()

  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt={
                user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email
              }
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1">
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
          </div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
      </div>
    </Card>
  )
}

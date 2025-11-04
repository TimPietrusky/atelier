"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Trash2, Key, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RunPodLogo } from "@/components/runpod-logo"

interface ProviderCredential {
  id: string
  providerId: string
  name: string
  lastFour: string
  status: "active" | "revoked" | "error"
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export function ProviderSettings() {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [showRunPodForm, setShowRunPodForm] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const res = await fetch("/api/providers")
      if (res.ok) {
        const data = await res.json()
        setCredentials(data.credentials || [])
      }
    } catch (error) {
      console.error("Failed to load credentials:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/providers/runpod/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), name: name.trim() || undefined }),
      })

      if (res.ok) {
        setApiKey("")
        setName("")
        setShowRunPodForm(false)
        setError(null)
        await loadCredentials()
      } else {
        const errorData = await res.json()
        setError(errorData.error || "Failed to save credential")
      }
    } catch (error) {
      console.error("Failed to save credential:", error)
      setError("Failed to save credential")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (providerId: string) => {
    if (deleteConfirm !== providerId) {
      setDeleteConfirm(providerId)
      return
    }

    setError(null)
    try {
      const res = await fetch(`/api/providers/${providerId}/credentials`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteConfirm(null)
        setError(null)
        await loadCredentials()
      } else {
        const errorData = await res.json()
        setError(errorData.error || "Failed to revoke credential")
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error("Failed to revoke credential:", error)
      setError("Failed to revoke credential")
      setDeleteConfirm(null)
    }
  }

  const runpodCredential = credentials.find((c) => c.providerId === "runpod" && c.status === "active")

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Configure API keys for AI providers. Keys are stored securely in WorkOS Vault.
      </p>

      {/* RunPod Credential */}
      <Card className="p-4 border border-border">
        {error && !showRunPodForm && (
          <div className="mb-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RunPodLogo className="h-5 w-auto text-foreground" />
          </div>
          {runpodCredential ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ••••{runpodCredential.lastFour}
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                    onClick={() => setDeleteConfirm("runpod")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-2">
                    <p className="text-xs">Revoke this API key?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-red-500 hover:bg-red-600"
                        onClick={() => handleDelete("runpod")}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => setShowRunPodForm(!showRunPodForm)}
            >
              Add Key
            </Button>
          )}
        </div>

        {showRunPodForm && (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3 pt-3 border-t border-border">
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="name" className="text-xs">
                Label (optional)
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="My RunPod Key"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="apiKey" className="text-xs">
                API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setError(null)
                }}
                placeholder="Enter your RunPod API key"
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                className="h-7 px-3 text-xs font-semibold"
                disabled={submitting || !apiKey.trim()}
              >
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  setShowRunPodForm(false)
                  setApiKey("")
                  setName("")
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {runpodCredential && (
          <div className="mt-2 text-xs text-muted-foreground">
            {runpodCredential.lastUsedAt
              ? `Last used: ${new Date(runpodCredential.lastUsedAt).toLocaleDateString()}`
              : "Never used"}
          </div>
        )}
      </Card>
    </div>
  )
}


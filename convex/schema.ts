import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_email", ["email"]),

  orgMemberships: defineTable({
    userId: v.id("users"),
    workosOrgId: v.optional(v.string()),
    workosUserId: v.string(),
    role: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_workos_org_id", ["workosOrgId"]),

  providerCredentials: defineTable({
    userId: v.id("users"),
    workosUserId: v.string(),
    orgId: v.optional(v.id("orgMemberships")),
    workosOrgId: v.optional(v.string()),
    providerId: v.string(), // "runpod", "replicate", etc.
    vaultSecretId: v.string(), // Opaque string from WorkOS Vault
    name: v.string(), // User-provided label
    lastFour: v.string(), // Last 4 chars of key for display
    status: v.union(v.literal("active"), v.literal("revoked"), v.literal("error")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_workos_user_id", ["workosUserId"])
    .index("by_provider_id", ["providerId"])
    .index("by_user_and_provider", ["workosUserId", "providerId"]),
})


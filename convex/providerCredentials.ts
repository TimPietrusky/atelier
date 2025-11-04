import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getByUserAndProvider = query({
  args: {
    workosUserId: v.string(),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("workosUserId", args.workosUserId).eq("providerId", args.providerId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()
  },
})

export const listByUser = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providerCredentials")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", args.workosUserId))
      .collect()
  },
})

export const create = mutation({
  args: {
    userId: v.id("users"),
    workosUserId: v.string(),
    orgId: v.optional(v.id("orgMemberships")),
    workosOrgId: v.optional(v.string()),
    providerId: v.string(),
    vaultSecretId: v.string(),
    name: v.string(),
    lastFour: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Revoke any existing active credentials for this user/provider
    const existing = await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("workosUserId", args.workosUserId).eq("providerId", args.providerId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "revoked",
        updatedAt: now,
      })
    }

    return await ctx.db.insert("providerCredentials", {
      userId: args.userId,
      workosUserId: args.workosUserId,
      orgId: args.orgId,
      workosOrgId: args.workosOrgId,
      providerId: args.providerId,
      vaultSecretId: args.vaultSecretId,
      name: args.name,
      lastFour: args.lastFour,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateLastUsed = mutation({
  args: {
    credentialId: v.id("providerCredentials"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.credentialId, {
      lastUsedAt: Date.now(),
    })
  },
})

export const revoke = mutation({
  args: {
    credentialId: v.id("providerCredentials"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.credentialId, {
      status: "revoked",
      updatedAt: Date.now(),
    })
  },
})


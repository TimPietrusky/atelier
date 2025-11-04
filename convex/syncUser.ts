import { mutation } from "./_generated/server"
import { api } from "./_generated/api"

// This mutation syncs WorkOS user data to Convex after authentication
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    // This will be called from the client after login
    // The user info comes from WorkOS session
    // For now, this is a placeholder - the actual sync happens via API routes
    return { synced: true }
  },
})


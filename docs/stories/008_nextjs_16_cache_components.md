# Next.js 16 Migration with Cache Components & React Compiler

## Executive Summary

**Goal**: Upgrade atelier to Next.js 16, enable React Compiler for automatic optimization, and migrate from client-side `useEffect` data fetching to server-side Cache Components to eliminate performance bottlenecks and reduce unnecessary re-renders.

**Strategy**: Incremental migration from Next.js 14 → 16, enable `cacheComponents` and `reactCompiler` in config, refactor high-impact `useEffect` hooks to server components with `'use cache'` directives, and migrate middleware to proxy pattern. Keep client components only where interactivity is required.

**Scope**: Next.js/React upgrades, configuration changes, component refactoring (data fetching → server components), middleware migration, and performance optimization. Excludes workflow engine logic, UI canvas interactions, or storage architecture changes.

**Effort**: ~4-5 weeks including dependency upgrades, compatibility testing, incremental refactoring, performance validation, and documentation updates.

**Impact**:

- ✅ Faster initial page loads (server-side data fetching + caching)
- ✅ Reduced client-side JavaScript bundle (server components)
- ✅ Automatic memoization via React Compiler (eliminates manual `useMemo`/`useCallback`)
- ✅ Better performance with heavy content (fewer unnecessary re-renders)
- ✅ Modern Next.js 16 features available (better caching, improved routing)
- ✅ Foundation for future server-side optimizations

**Compatibility**: Requires Node.js 20.9+, TypeScript 5.1+, React 19. All third-party libraries (WorkOS AuthKit, ReactFlow, Convex, Radix UI) must be compatible with React 19 and Next.js 16.

---

## Problem Statement

Current architecture introduces performance bottlenecks and unnecessary complexity:

- **Excessive client-side data fetching**: 90 `useEffect` hooks across 32 files performing data loading, hydration, and state synchronization that could be server-side cached
- **Hydration delays**: Client-side hydration (`app/studio/page.tsx`) causes loading states and layout shifts on initial render
- **Inefficient re-renders**: Manual memoization required throughout codebase; React Compiler could automate this
- **Large client bundles**: Client components handle data fetching that could be server-side, increasing JavaScript payload
- **Performance issues with heavy content**: Components with many images (50+) experience lag during interactions despite existing optimizations
- **Outdated framework**: Next.js 14 missing latest caching features, React 18 missing compiler optimizations

### Performance Concerns

- Initial page load waits for client-side hydration before showing content
- Asset loading (`lib/hooks/use-asset.ts`) triggers multiple `useEffect` chains on every render
- Media manager loads all asset metadata client-side even when not needed
- Auth checks run client-side causing redirect delays
- SessionStorage reads block initial render in several components
- No automatic component memoization means unnecessary re-renders cascade through component trees

## Goals

### Immediate – **This Story**

- ✅ Upgrade Next.js 14.2.16 → 16.x with React 19
- ✅ Enable React Compiler for automatic memoization and optimization
- ✅ Enable Cache Components (`cacheComponents: true`) for Partial Pre-Rendering
- ✅ Migrate `middleware.ts` → `proxy.ts` (Next.js 16 requirement)
- ✅ Refactor high-impact `useEffect` hooks (data fetching, hydration) to server components with `'use cache'`
- ✅ Convert auth checks to server components (eliminate client-side redirect delays)
- ✅ Migrate asset loading patterns to cached server functions
- ✅ Verify all third-party libraries compatible with React 19 / Next.js 16
- ✅ Achieve measurable performance improvements (faster TTI, reduced bundle size, fewer re-renders)

### Future (Keep in Mind, Not Now)

- ✅ Further server component adoption for static content
- ✅ Advanced streaming patterns with multiple Suspense boundaries
- ✅ Edge runtime optimizations where applicable (note: not compatible with Cache Components)
- ✅ Advanced caching strategies (revalidation, ISR)

## Proposed Architecture

### Next.js 16 Configuration

```javascript
// next.config.mjs
const nextConfig = {
  cacheComponents: true, // Enable Cache Components (PPR)
  reactCompiler: true, // Enable React Compiler
  // ... existing config
}
```

### Server Component Patterns

**Data Fetching with Cache**:

```typescript
import { cacheLife, cacheTag } from "next/cache"

export async function getWorkflowData(workflowId: string) {
  "use cache"
  cacheTag(`workflow-${workflowId}`)
  cacheLife("hours") // Cache for hours, or use 'days', 'weeks', etc.

  const data = await loadWorkflow(workflowId)
  return data
}
```

**Suspense Boundaries (Required for Dynamic Data)**:

All dynamic/runtime data MUST be wrapped in Suspense boundaries:

- Runtime APIs: `cookies()`, `headers()`, `searchParams`, `params` (unless static via `generateStaticParams`)
- Dynamic data: `fetch()` calls, database queries, `connection()` API
- Components using these APIs will error if not wrapped in Suspense

```typescript
import { Suspense } from "react"

export default function Page() {
  return (
    <>
      <h1>Static shell (pre-rendered)</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <DynamicContent /> {/* Uses cookies() or fetch() */}
      </Suspense>
    </>
  )
}
```

**Streaming Data to Client Components**:

Use React's `use` hook to stream data from server to client components:

```typescript
// Server Component (don't await the promise)
import { Suspense } from "react"
import Posts from "@/components/Posts"

export default function Page() {
  const postsPromise = getPosts() // Don't await

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Posts posts={postsPromise} />
    </Suspense>
  )
}

// Client Component
;("use client")
import { use } from "react"

export default function Posts({ posts }: { posts: Promise<Post[]> }) {
  const allPosts = use(posts) // Reads the promise

  return (
    <ul>
      {allPosts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**Data Deduplication**:

- `fetch` requests are automatically deduplicated via request memoization (same URL + options in single render)
- For non-`fetch` data (ORM/database), use React's `cache` function:

```typescript
import { cache } from "react"
import { db } from "@/lib/db"

export const getWorkflow = cache(async (workflowId: string) => {
  return await db.workflows.findUnique({ where: { id: workflowId } })
})
```

**Parallel vs Sequential Fetching**:

- **Parallel**: Start multiple requests, then await with `Promise.all`:
  ```typescript
  const workflowData = getWorkflow(id)
  const assetsData = getAssets(id)
  const [workflow, assets] = await Promise.all([workflowData, assetsData])
  ```
- **Sequential**: When one fetch depends on another, wrap dependent component in Suspense:
  ```typescript
  const workflow = await getWorkflow(id)
  return (
    <Suspense fallback={<Loading />}>
      <Assets workflowId={workflow.id} />
    </Suspense>
  )
  ```

**Server Component Boundaries**:

- **Server Components**: Auth checks, initial data loading, static content, metadata fetching
- **Client Components**: ReactFlow canvas, interactive nodes, forms, Zustand state, browser APIs

**Server Actions for Data Mutations**:

Use Server Actions (`"use server"`) for updating data. They integrate with Next.js caching and can be called from forms, event handlers, or `useEffect`:

```typescript
// app/actions.ts (or inline in Server Component)
"use server"

import { cacheTag, updateTag, revalidatePath } from "next/cache"

export async function updateWorkflow(workflowId: string, data: FormData) {
  // Update data in database/storage
  await saveWorkflow(workflowId, data)

  // Invalidate cache (immediate)
  updateTag(`workflow-${workflowId}`)

  // Or revalidate path (eventual consistency)
  revalidatePath("/studio")

  return { success: true }
}
```

**Invoking Server Actions**:

- **Forms**: Pass to `action` prop (progressive enhancement by default)
- **Event Handlers**: Call directly in `onClick` handlers
- **useEffect**: Use with `startTransition` for automatic mutations
- **Client Components**: Import from file with `"use server"` directive

```typescript
// Client Component
"use client"
import { updateWorkflow } from "@/app/actions"
import { useActionState, startTransition } from "react"

export function WorkflowForm({ workflowId }: { workflowId: string }) {
  const [state, action, pending] = useActionState(updateWorkflow, null)

  return (
    <form action={action}>
      {/* form fields */}
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  )
}
```

**Caching APIs**:

Next.js provides multiple caching options:

- **`use cache`** (Cache Components): For Server Components and functions with `cacheLife()` and `cacheTag()`
- **`fetch` with `cache: 'force-cache'`**: For HTTP requests, supports `next.revalidate` option
- **`unstable_cache`**: For database queries and non-`fetch` async functions, supports tags and revalidate

```typescript
// Option 1: use cache (Cache Components)
import { cacheLife, cacheTag } from "next/cache"

export async function getWorkflowData(workflowId: string) {
  "use cache"
  cacheTag(`workflow-${workflowId}`)
  cacheLife("hours")
  // ... fetch data
}

// Option 2: unstable_cache (for database queries)
import { unstable_cache } from "next/cache"

const getCachedWorkflow = unstable_cache(
  async (workflowId: string) => {
    return await db.workflows.findUnique({ where: { id: workflowId } })
  },
  [workflowId],
  {
    tags: [`workflow-${workflowId}`],
    revalidate: 3600, // seconds
  }
)

// Option 3: fetch with cache
const data = await fetch("https://api.example.com/workflow", {
  cache: "force-cache",
  next: { tags: ["workflow"], revalidate: 3600 },
})
```

**Cache Invalidation**:

Different invalidation strategies for different use cases:

- **`updateTag`**: Server Actions only, immediately expires cache (read-your-own-writes scenarios)
- **`revalidateTag`**: Server Actions and Route Handlers, supports stale-while-revalidate with `profile="max"`
- **`revalidatePath`**: Revalidates entire route paths

```typescript
import { cacheTag, updateTag, revalidateTag, revalidatePath } from "next/cache"

// In cached function (tag it)
export async function getWorkflowData(workflowId: string) {
  "use cache"
  cacheTag(`workflow-${workflowId}`)
  // ... fetch data
}

// In Server Action (after mutation)
export async function updateWorkflow(workflowId: string, data: FormData) {
  "use server"
  // ... update data

  // Option 1: Immediate expiration (read-your-own-writes)
  updateTag(`workflow-${workflowId}`)

  // Option 2: Stale-while-revalidate (serve stale, fetch fresh in background)
  revalidateTag(`workflow-${workflowId}`, "max")

  // Option 3: Revalidate entire path
  revalidatePath("/studio")
}
```

**When to Use Each**:

- **`use cache`**: Preferred for Cache Components (PPR), explicit control with `cacheLife()`
- **`unstable_cache`**: For database queries when not using `fetch`, supports time-based revalidation
- **`fetch` with cache**: For HTTP requests, automatic deduplication
- **`updateTag`**: Server Actions only, immediate invalidation after user's own writes
- **`revalidateTag`**: When you can tolerate stale content temporarily (better UX with `profile="max"`)
- **`revalidatePath`**: When you need to invalidate entire route segments

### Component Migration Strategy

**Phase 1: Low-hanging fruit (Server Components)**

- Auth checks (`app/page.tsx`, `app/landing/page.tsx`)
- Initial workflow hydration (move to server component)
- Static metadata fetching
- Convert form submissions to Server Actions where applicable

**Phase 2: Cache Components**

- Asset loading functions (`lib/hooks/use-asset.ts` → cached server functions with `use cache`)
- Media manager initial load → server component with `use cache` and Suspense boundaries
- Provider credential fetching → server component with cache tags for invalidation
- Wrap all dynamic data (cookies, headers, fetch) in Suspense boundaries
- Consider adding `loading.js` files for route-level streaming where appropriate
- Use React's `cache()` for deduplication of database/ORM queries
- Implement parallel fetching patterns (`Promise.all`) for independent data requests

**Phase 3: Keep Client Where Needed**

- ReactFlow interactions (stay client)
- Canvas drag/drop (stay client)
- Form inputs (stay client)
- Event listeners (stay client)
- Zustand state management (stay client)

### React Compiler Integration

- **Automatic optimizations**: Remove manual `useMemo`/`useCallback` where compiler handles it
- **Keep explicit memoization**: Only for values used as dependencies in other hooks
- **Verify compiler output**: Test builds, monitor warnings, measure improvements

### Middleware → Proxy Migration

- Rename `middleware.ts` → `proxy.ts`
- Update export: `export default authkitMiddleware(...)` → `export function proxy(request: Request) { ... }`
- Verify WorkOS AuthKit compatibility with proxy naming
- Update route matching config if needed

## Implementation Plan

### Phase 1: Foundation & Dependencies

1. **Verify Environment**

   - Check Node.js ≥ 20.9
   - Verify TypeScript ≥ 5.1
   - Review third-party library compatibility (WorkOS AuthKit, ReactFlow, Convex, Radix UI)

2. **Upgrade Dependencies**

   - Run `npx @next/codemod@latest upgrade latest` (or manual `pnpm install`)
   - Update Next.js: 14.2.16 → 16.x
   - Update React: ^18 → ^19
   - Update React DOM: ^18 → ^19
   - Update `@types/react` and `@types/react-dom` for React 19
   - Install `babel-plugin-react-compiler` as dev dependency

3. **Update Configuration**

   - Add `cacheComponents: true` to `next.config.mjs`
   - Add `reactCompiler: true` to `next.config.mjs`
   - Remove route segment configs no longer needed:
     - `dynamic = "force-dynamic"` (not needed, dynamic by default)
     - `revalidate` (replace with `cacheLife` in `use cache` functions)
     - `fetchCache` (not needed, `use cache` handles it)
   - Note: `runtime = 'edge'` not supported with Cache Components
   - Verify existing config (eslint, typescript, images) still works

4. **Test Basic Functionality**
   - Run dev server, verify app starts
   - Test core workflows (create node, run workflow)
   - Check for immediate breaking changes

### Phase 2: Middleware Migration

1. **Migrate Middleware to Proxy**

   - Rename `middleware.ts` → `proxy.ts`
   - Update function export to `proxy(request: Request)`
   - Verify WorkOS AuthKit compatibility
   - Test authentication flow thoroughly

2. **Update Route Protection**
   - Verify protected routes still work
   - Test session handling
   - Check redirect behavior

### Phase 3: High-Impact useEffect Refactoring

1. **Auth Checks → Server Components**

   - `app/page.tsx` (lines 12-29): Move auth check to server component
   - `app/landing/page.tsx` (lines 12-25): Move auth check to server component
   - `app/studio/page.tsx` (lines 63-77): Move auth check to server component
   - Eliminate client-side redirect delays

2. **Workflow Hydration → Server Component**

   - `app/studio/page.tsx` (lines 327-378): Move hydration to server component
   - Use `'use cache'` with `cacheLife` for workflow data fetching
   - Add `cacheTag` for cache invalidation when workflows change
   - Wrap dynamic parts (if any) in Suspense boundaries
   - Eliminate loading states on initial render (static shell shows immediately)

3. **Asset Loading → Cached Server Functions**
   - `lib/hooks/use-asset.ts`: Convert to cached server functions with `'use cache'`
   - Extract to helper functions (cannot use `use cache` directly in Route Handlers)
   - Use React's `cache()` for deduplication if not using `fetch`
   - `components/media-manager.tsx` (lines 85-96): Move initial load to server component
   - Use `'use cache'` directive with `cacheLife` for asset metadata fetching
   - Add Suspense boundaries around dynamic asset loading
   - Consider streaming asset data to client components using `use` hook pattern

### Phase 4: React Compiler Optimization

1. **Enable React Compiler**

   - Verify compiler plugin installed
   - Build and test for compiler warnings
   - Monitor performance improvements

2. **Remove Manual Memoization**

   - Identify `useMemo`/`useCallback` that compiler can handle
   - Remove redundant memoization
   - Keep only where necessary (dependency arrays, etc.)

3. **Measure Improvements**
   - Bundle size reduction
   - Re-render counts
   - Runtime performance

### Phase 5: Medium-Priority Refactoring

1. **SessionStorage Optimizations**

   - `components/media-manager.tsx` (lines 68-82): Consider server-side defaults
   - `components/nodes/image-node.tsx` (lines 54-56): Evaluate if needed client-side

2. **Server Actions for Mutations**

   - Convert workflow/node updates to Server Actions
   - Add cache invalidation (`updateTag`/`revalidatePath`) after mutations
   - Use `useActionState` for pending states in forms
   - Replace API route handlers with Server Actions where appropriate

3. **Additional Server Components**
   - Static content components
   - Metadata fetching components
   - Provider credential lists

### Phase 6: Testing & Validation

1. **Functional Testing**

   - All existing features work
   - Workflow execution
   - Asset management
   - Authentication flows
   - Canvas interactions

2. **Performance Testing**

   - Measure TTI (Time to Interactive) improvements
   - Bundle size reduction
   - Re-render frequency
   - Memory usage with heavy content

3. **Regression Testing**
   - No breaking changes
   - All edge cases handled
   - Error states work correctly

## User Stories

### US1: Faster Initial Page Load

**As a user**, when I visit atelier, the page loads faster and shows content immediately without waiting for client-side hydration.

**Acceptance**:

- [ ] Initial page load shows content without loading spinner (server-side rendering)
- [ ] Auth check happens server-side (no client-side redirect delay)
- [ ] Workflow data loads from server cache (faster than client-side fetch)
- [ ] Measurable improvement in Time to Interactive (TTI)

### US2: Smoother Interactions with Heavy Content

**As a user**, when I work with workflows containing many images (50+), interactions remain smooth without lag or stuttering.

**Acceptance**:

- [ ] Dragging nodes with many images feels smooth (React Compiler optimizations)
- [ ] Scrolling through asset grids is responsive
- [ ] Fewer unnecessary re-renders during interactions
- [ ] Performance metrics show improvement vs. current baseline

### US3: Reduced JavaScript Bundle Size

**As a product**, our client-side JavaScript bundle is smaller, improving load times and runtime performance.

**Acceptance**:

- [ ] Bundle size reduced by moving data fetching to server components
- [ ] Client bundle contains only interactive code (no data fetching logic)
- [ ] Network requests show smaller JavaScript payloads
- [ ] Lighthouse scores improve for performance metrics

### US4: Automatic Component Optimization

**As a developer**, React Compiler automatically optimizes components, reducing the need for manual `useMemo`/`useCallback`.

**Acceptance**:

- [ ] React Compiler enabled and working without errors
- [ ] Manual memoization removed where compiler handles it
- [ ] Performance maintains or improves after removing manual optimizations
- [ ] Build process completes successfully with compiler enabled

### US5: Modern Next.js Features Available

**As a product**, we're on Next.js 16 with access to latest caching and performance features.

**Acceptance**:

- [ ] Next.js 16.x installed and configured
- [ ] Cache Components enabled and working
- [ ] Middleware migrated to proxy pattern
- [ ] All third-party libraries compatible with React 19 / Next.js 16
- [ ] No deprecation warnings in console

## Acceptance Criteria

### Performance & Optimization

- [ ] TTI (Time to Interactive) improved by ≥20% vs. baseline
- [ ] Client-side JavaScript bundle reduced by ≥15% (data fetching moved server-side)
- [ ] Re-render frequency reduced (measured via React DevTools Profiler)
- [ ] No performance regressions in canvas interactions or heavy content scenarios
- [ ] Lighthouse performance score improved

### Code Quality

- [ ] `useEffect` count reduced from 90 to <50 instances (data fetching eliminated)
- [ ] Server components used for all data fetching (no client-side data loading)
- [ ] Cache Components (`'use cache'`) used appropriately for cacheable data with `cacheLife()` set
- [ ] `unstable_cache` used for database queries when not using `fetch`
- [ ] `fetch` requests use `cache: 'force-cache'` and `next.tags`/`next.revalidate` where appropriate
- [ ] All dynamic/runtime data wrapped in Suspense boundaries (no "Uncached data" errors)
- [ ] Cache tags (`cacheTag` or `next.tags`) and invalidation (`updateTag`/`revalidateTag`/`revalidatePath`) implemented for data mutations
- [ ] `updateTag` used in Server Actions for immediate invalidation (read-your-own-writes)
- [ ] `revalidateTag` with `profile="max"` used for stale-while-revalidate patterns where appropriate
- [ ] Data fetching uses parallel patterns where possible (`Promise.all` for independent requests)
- [ ] React's `cache()` used for deduplication of non-`fetch` data (ORM/database queries)
- [ ] Client components use `use` hook for streaming server data, or appropriate client-side libraries
- [ ] Data mutations use Server Actions (`"use server"`) instead of API routes where possible
- [ ] Server Actions include cache invalidation (`updateTag`/`revalidatePath`) after mutations
- [ ] Forms use Server Actions with progressive enhancement support
- [ ] React Compiler enabled and optimizing automatically
- [ ] Manual `useMemo`/`useCallback` removed where compiler handles it

### Functionality

- [ ] All existing features work identically (no breaking changes)
- [ ] Authentication flow works with proxy pattern
- [ ] Workflow execution unchanged
- [ ] Asset management functions correctly
- [ ] Canvas interactions remain smooth
- [ ] All third-party integrations (WorkOS, ReactFlow, Convex) function correctly

### Compatibility

- [ ] Next.js 16.x installed and running
- [ ] React 19 compatible with all dependencies
- [ ] TypeScript compiles without errors
- [ ] All third-party libraries compatible (no version conflicts)
- [ ] Node.js 20.9+ requirement met
- [ ] Route segment configs updated (`dynamic = "force-dynamic"` removed, `revalidate` → `cacheLife`, `fetchCache` removed)
- [ ] No `runtime = 'edge'` configs (Cache Components requires Node.js runtime)

### Documentation

- [ ] `docs/context.md` updated with Next.js 16 architecture patterns
- [ ] Cache Components usage documented
- [ ] Server Actions patterns documented (forms, event handlers, cache invalidation)
- [ ] React Compiler optimizations noted
- [ ] Server/client component boundaries documented
- [ ] Migration notes added for future reference

## Technical Design Notes

- **Cache Components Behavior**: With `cacheComponents: true`, all routes are **dynamic by default**. Use `'use cache'` to mark cacheable parts. The static shell (including Suspense fallbacks) is pre-rendered, while dynamic parts stream in.
- **`use cache` Directive**:
  - Use in Server Components or async functions to cache data/computations
  - Cannot use runtime APIs (`cookies()`, `headers()`) inside cached components
  - Cannot use directly in Route Handler bodies—extract to helper functions
  - Must use `cacheLife()` to set cache duration (`'hours'`, `'days'`, `'weeks'`, etc.)
  - Use `cacheTag()` to tag cached data for targeted invalidation
- **Suspense Boundaries (Required)**:
  - **MUST** wrap all dynamic/runtime data in Suspense boundaries
  - Runtime APIs (`cookies()`, `headers()`, `searchParams`, `params`) require Suspense
  - Dynamic data (`fetch()`, database queries, `connection()`) requires Suspense
  - Missing Suspense will cause errors: "Uncached data was accessed outside of `<Suspense>`"
  - Use `loading.js` files for route-level streaming, or `<Suspense>` for granular boundaries
- **Data Fetching Patterns**:
  - Server Components: Use `fetch` API or ORM/database directly (async/await)
  - Client Components: Use React's `use` hook for streaming promises from server, or community libraries (SWR, React Query)
  - Deduplication: `fetch` auto-deduplicates via request memoization; use React's `cache()` for non-`fetch` data
  - Parallel fetching: Start multiple requests, await with `Promise.all` for better performance
  - Sequential fetching: When dependencies exist, wrap dependent components in Suspense for streaming
- **Server Actions (Data Mutations)**:
  - Use `"use server"` directive to create Server Actions for data updates
  - Server Actions integrate with Next.js caching (call `updateTag`/`revalidatePath` after mutations)
  - Can be invoked from forms (`action` prop), event handlers (`onClick`), or `useEffect` (with `startTransition`)
  - Progressive enhancement: Forms work without JavaScript
  - Use `useActionState` hook for pending states in client components
  - Server Actions are dispatched sequentially (not parallel); parallel work should be inside a single action
  - Can pass Server Actions as props to client components
- **Caching APIs**:
  - `use cache`: Preferred for Cache Components with `cacheLife()` and `cacheTag()`
  - `unstable_cache`: For database queries and non-`fetch` async functions (supports tags and revalidate)
  - `fetch` with `cache: 'force-cache'`: For HTTP requests (supports `next.revalidate` and `next.tags`)
- **Cache Invalidation**:
  - Use `cacheTag()` or `next.tags` to tag cached data
  - Use `updateTag()` in Server Actions for immediate expiration (read-your-own-writes scenarios)
  - Use `revalidateTag()` with `profile="max"` for stale-while-revalidate (better UX, serve stale while fetching fresh)
  - Use `revalidatePath()` to invalidate entire route segments
  - Key difference: `updateTag` immediately expires, `revalidateTag` can serve stale content while revalidating
- **Route Segment Config Changes**:
  - `dynamic = "force-dynamic"` → Not needed (dynamic by default)
  - `dynamic = "force-static"` → Replace with `'use cache'` on Layout/Page
  - `revalidate` → Replace with `cacheLife()` in `'use cache'` functions
  - `fetchCache` → Not needed (`use cache` handles it)
  - `runtime = 'edge'` → Not supported (requires Node.js runtime)
- **Navigation State Preservation**: Cache Components uses React's `<Activity>` component to preserve component state during client-side navigation (routes stay `"hidden"` instead of unmounting).
- **Server Component Boundaries**: Keep `'use client'` only where needed (interactivity, browser APIs, Zustand). Move data fetching to server components.
- **React Compiler**: Automatically memoizes components and values. Remove manual `useMemo`/`useCallback` unless they're used as dependencies in other hooks.
- **Proxy Pattern**: `proxy.ts` replaces `middleware.ts` in Next.js 16. Function signature changes but logic remains similar.
- **Incremental Migration**: Refactor high-impact `useEffect` hooks first (auth, hydration, data fetching). Keep event listeners and interactions client-side.
- **Testing Strategy**:
  - Unit: Test server components and cached functions in isolation
  - Integration: Test data flow from server → client components, verify Suspense boundaries work
  - E2E: Verify full user workflows work end-to-end, test cache invalidation flows
  - Performance: Measure before/after metrics (TTI, bundle size, re-renders)

## Decision Log

1. **Upgrade to Next.js 16 Instead of Staying on 14**

   - _Rationale_: Access to Cache Components, React Compiler integration, better performance features, and future-proofing
   - _Alternatives_: Stay on Next.js 14 (miss performance improvements), upgrade to 15 first (unnecessary intermediate step)

2. **Enable React Compiler**

   - _Rationale_: Automatic optimization reduces manual memoization work and improves performance
   - _Alternatives_: Manual optimization only (more work, error-prone), wait for stable release (already stable enough)

3. **Migrate useEffect Data Fetching to Server Components**

   - _Rationale_: Server-side caching, faster initial loads, smaller client bundles, better SEO
   - _Alternatives_: Keep client-side fetching (miss performance gains), use React Query (adds complexity vs. native caching)

4. **Keep Client Components for Interactivity**

   - _Rationale_: ReactFlow, canvas interactions, forms require client-side code. Server components can't handle browser APIs or state management.
   - _Trade-off_: Some components stay client-side, but data fetching moves server-side for best of both worlds.

5. **Incremental Migration Approach**

   - _Rationale_: Reduces risk, allows testing at each phase, easier to rollback if issues arise
   - _Alternatives_: Big bang migration (higher risk, harder to debug)

## Open Questions

1. **WorkOS AuthKit Proxy Compatibility**: Does `@workos-inc/authkit-nextjs` support the proxy naming pattern, or do we need a workaround?
2. **ReactFlow React 19 Compatibility**: Is `@xyflow/react` fully compatible with React 19, or do we need to wait for updates?
3. **Convex Next.js 16 Compatibility**: Are there any breaking changes or required updates for Convex with Next.js 16?
4. **Cache Invalidation Strategy**: Use `cacheTag()` + `updateTag()` in Server Actions for immediate invalidation, or `revalidateTag()` for eventual consistency. Need to identify all mutation points (workflow updates, asset changes) and add invalidation.
5. **Performance Baseline**: What are current performance metrics (TTI, bundle size) to measure improvements against?

## Related Documents

- `docs/context.md` – Update with Next.js 16 patterns and Cache Components usage after implementation
- `next.config.mjs` – Configuration changes for cacheComponents and reactCompiler
- `middleware.ts` → `proxy.ts` – Migration to proxy pattern
- `app/studio/page.tsx` – Major refactoring target (hydration → server component)
- `lib/hooks/use-asset.ts` – Convert to cached server functions
- `components/media-manager.tsx` – Move initial load to server component
- Next.js 16 docs: Cache Components, React Compiler, Proxy migration guide

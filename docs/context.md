## Project Conventions (Living Document)

This doc orients anyone working in this codebase. It captures the architectural intent, API/provider usage, UI/UX rules, persistence, and gotchas we’ve already solved. Keep it up to date when behavior changes.

### What this project is

- atelier: a Next.js web app for building and running node-based AI workflows using the AI SDK.
- Core user story: connect nodes (Prompt → Image …), run, and see outputs inline.
- Provider-agnostic goal: support any provider available via the AI SDK (RunPod today; open to others). Providers are pluggable.
- Ease-of-use comparable to ComfyUI, without local env/custom-node burdens: pure API usage with user-supplied API keys, no local venv.

## Architecture

- **Next.js 16 App Router**: API routes under `app/api/*`, UI in `app/*`. Cache Components enabled (`cacheComponents: true`) for Partial Pre-Rendering. React Compiler enabled (`reactCompiler: true`) for automatic optimization. ESLint uses flat config (`eslint.config.mjs`) with `eslint-config-next` (Next.js 16 removed `next lint` and ESLint config from `next.config.mjs`). See "Cache Components Best Practices" section below for patterns.
- **Authentication**: WorkOS AuthKit (`@workos-inc/authkit-nextjs`) with session cookies. Proxy (`proxy.ts`) protects routes; callback at `/callback` handles OAuth flow. Auth checks performed server-side in page components to eliminate client-side redirect delays.
- **Canvas**: ReactFlow (`components/node-graph-canvas.tsx`) wrapped with `ReactFlowProvider` at app root to enable Controls/MiniMap in header.
- **State**: Zustand store (`lib/store/workflows-zustand.ts`) for in-memory workflows; compat wrapper (`lib/store/workflows.ts`) maintains old API.
- **Persistence**: Unified storage architecture via `StorageManager` (`lib/store/storage-manager.ts`):
  - Serializes writes per workflow to prevent race conditions
  - Debounces high-frequency updates (viewport, result history deletes)
  - Backend abstraction via `StorageBackend` interface (`lib/store/storage-backend.ts`)
  - Current backend: `IndexedDBBackend` wraps Dexie (`lib/store/backends/indexeddb.ts`)
  - Future backends: R2, UploadThing, LocalFile (pluggable)
  - No cross-tab sync (single-tab app pattern); eliminates 90% of race conditions
- **Server-side data**: Convex database stores user records, org memberships, and provider credential metadata. Credential secrets stored in WorkOS Vault (never in Convex).
- **Workflow engine**: `lib/workflow-engine.ts` handles queueing, topological sort, per-node execution, status updates, and result propagation.
- **Provider credentials**: Stored securely in WorkOS Vault; metadata (vaultSecretId, lastFour, status) in Convex. Credential resolver (`lib/credentials.ts`) fetches secrets server-side with 5min cache. Provider adapters receive API keys at runtime, never from env vars.
- **RunPod provider adapter**: `lib/providers/runpod.ts`—the single place that speaks to `@runpod/ai-sdk-provider`. Accepts `apiKey` parameter (resolved from Vault via credential resolver).

## Persistence conventions

- All user-facing graph state must persist:
  - Nodes (including `resultHistory`), edges, and viewport via `workflowStore.setNodes/setEdges/setViewport`.
  - Node config changes via `workflowStore.updateNodeConfig`.
  - Node results via `workflowStore.updateNodeResult(workflowId, nodeId, result, resultHistory)` — merges incoming history with existing to preserve all generations.
  - **Result history items must have unique IDs** to support race-condition-free deletions while queue is running.
- **Unified storage architecture** (Phase 1 complete):
  - All persistence goes through `StorageManager` which provides:
    - **Write serialization**: Queues writes per workflow to prevent race conditions
    - **Debouncing**: Batches rapid updates (viewport: 300ms, result history deletes: 100ms)
    - **Backend abstraction**: Pluggable storage via `StorageBackend` interface
  - Current backend: `IndexedDBBackend` wraps existing Dexie code
  - Future backends: R2, UploadThing, LocalFile (when needed)
  - **No cross-tab sync**: App is single-tab focused; removes 90% of race conditions
  - Last tab closed wins on reload (acceptable trade-off)
- Zustand `set()` must return new object references (immutable updates) to trigger subscribers; avoid direct mutation.
- Seed default workflows on the client only (avoid SSR hydration mismatch).
- **Media assets (images/videos)**:
  - All images/videos stored in the `assets` table (Dexie) with unique IDs as **single source of truth**
  - Workflows store only `AssetRef` (references by ID), never full image data
  - `AssetManager` (`lib/store/asset-manager.ts`) handles all asset operations
  - Assets table schema: `{ id, kind, type, data (base64), mime, bytes, metadata, createdAt }`
  - Workflow JSON stays tiny (~1KB instead of 500KB+)
  - Enables efficient filtering/sorting via Dexie indexes (createdAt, etc.)
  - **NO legacy support**: `data` field is ONLY for text results; images MUST use `assetRef`
  - **Usage detection**: Assets are "in use" ONLY if in `config.uploadedAssetRef`; NOT if in result/resultHistory (those are just outputs)
  - **Asset deletion**: When deleted, ALL references auto-removed from result histories across all workflows
- **Result history management**:
  - Each result in `resultHistory` has a unique `id` (auto-generated as `${Date.now()}-${random}`).
  - Use `removeFromResultHistory(workflowId, nodeId, resultId)` to delete specific results by ID (race-condition safe).
  - Use `clearResultHistory(workflowId, nodeId)` to clear all results.
  - Never splice by index or replace entire array during concurrent operations.
  - Deletes use debounced persistence (100ms) to batch rapid operations.
- Deletions:
  - When nodes are deleted, persist the updated node list and prune edges referencing removed nodes.
- Statuses:
  - Transient `running` status is never persisted; on write it is coerced to `idle`, and on load any persisted `running` becomes `idle`.
- Viewport:
  - Each workflow has independent viewport state (position, zoom).
  - Persisted with debouncing (300ms) via `storageManager.persistDebounced()` to batch rapid pan/zoom.
  - Restored on workflow switch using `reactFlowInstance.setViewport()`.

## Workflow execution

- Engine performs a topological sort using `workflow.edges` to ensure upstream nodes execute first.
- Maintains a live snapshot (`runtimeNodesByWorkflow`) so resolving inputs uses the latest in-memory state.
- Updates node `status` to `running` → `complete` (or `error`) and persists.
- **Queue is ephemeral (in-memory only)**; the Run button is stateless and only enqueues runs. Queue does NOT persist across page reloads because:
  - API calls are synchronous (no job IDs to poll)
  - In-flight requests are lost on reload anyway
  - User is warned via `beforeunload` event if queue has pending items (standard browser warning)
  - Simpler architecture without persistence complexity
- **Execution snapshots**: Captured at queue time; retained after completion for settings view. Cleaned up when user clears queue.
- **Queue updates**: Event-driven via `workflowEngine.addExecutionChangeListener()` (supports multiple listeners). NO polling (wasteful, removed).
- **Media Manager**: Full-screen page (not panel); toggled via header button. Settings persist to sessionStorage.
  - **Selection mode**: When opened from image node inspector "from library" button, shows large "Use Selected" and "Cancel" buttons; selected asset highlights with accent border and ring.
  - **Lazy loading (virtual scrolling)**:
    - **Metadata-only initial load**: On mount, fetch only asset metadata (1-2KB per image) via `listAllAssets(true)`, NOT full base64 data (10-15MB per 4K image)
    - **Virtual grid**: Uses `react-window` `FixedSizeGrid` to render only visible ~50 items in DOM, not all 500+
    - **On-demand image data**: As grid cells become visible, fetch base64 data asynchronously via `assetManager.getAssetData(assetId)` and cache locally
    - **Memory bounded**: Only ~20-50 images' base64 data in memory at once (instead of 5GB+ for all 500)
    - **Filters work on metadata**: Search/filter/sort work instantly on loaded metadata; no need to fetch data for filtering
  - **Lightbox on-demand fetching**: When lightbox opens or navigates, fetches image data async; caches during session to avoid refetch
  - **Asset deletion**: Shows warning ONLY if asset is actively used in `config.uploadedAssetRef`; NOT for outputs/history.
- **Image metadata persistence**: ALL generation settings (prompt, model, steps, guidance, seed, resolution) are stored in `result.metadata.inputsUsed` and persist forever with the image. `metadata.executionId` stores the workflow execution ID (for matching placeholders); `metadata.apiExecutionId` stores the provider's execution ID. Settings icon in image history loads from this persistent metadata, NOT from ephemeral queue snapshots.

### Node behaviors

- Prompt node: pass-through of `config.prompt` to `result.data` (text).
- Image node (unified):
  - **Tab-based UI** (Model, Source): Each tab represents a distinct workflow intent
    - **Model tab**: Active by default when no input image. Shows model selector + generated image history from runs.
    - **Source tab**: Shows "Upload" and "Library" buttons side-by-side; once images are selected (via upload or library), displays grid of source images with download/delete actions. Defaults to "Source" tab if `mode: "uploaded"` (node has input images).
    - Tab underlines highlight with node color; reduces visual clutter vs. showing all controls at once.
    - **Smart tab selection**: If no input images exist (`mode: "generate"`), default to Model tab. If input images exist (`mode: "uploaded"`), default to Source tab. User's manual tab choice persists in sessionStorage within a session.
  - Mode: `generate` (default, runs API from scratch) or `uploaded` (skips API, uses input images for img2img).
  - Result metadata includes all generation settings (prompt, model, steps, guidance, seed, resolution) stored in `metadata.inputsUsed`.
  - **Queue placeholders**: Live skeletons for ALL pending jobs (queued + running) that will execute this node via `addExecutionChangeListener`; matched by execution ID to prevent layout shifts when results arrive (placeholder is replaced in-place, not appended); disabled in "uploaded" mode; ephemeral (gone on reload).
  - **Historical settings**: Settings icon opens left panel (`ExecutionInspector`) showing persistent metadata stored with the image result; "Copy to Node" applies settings. Does NOT rely on ephemeral queue snapshots.
  - **Image source**: "Upload" (local file), "Library" (asset table), or generated via model. Hidden in view-only mode.
- Text node (render typography to image):
  - **Canvas UI**: Simple text input field + live SVG preview (minimal, uncluttered).
  - **Inspector panel** (left): All typography controls organized into sections:
    - **Text area**: Multi-line text input (syncs with canvas input).
    - **Aspect ratios**: 1:1, 16:9, 9:16, 2:3, 3:2; adjustable max dimension (512-4096px).
    - **Typography**: Font family (Geist Mono, Arial, Times, Courier, Georgia), size (12-1000px), style toggles (bold, italic, strikethrough, underline), alignment (left/center/right), letter-spacing, line-height.
    - **Colors**: Text and background color pickers with hex value display.
    - **Download button**: Rasterizes current SVG preview to PNG and downloads (useful for debugging/previewing).
  - **SVG rendering**: Live canvas preview in both node and hidden SVG in inspector for download.
  - **Render-to-image**: Canvas-based rasterization to PNG; saves as asset via AssetManager with `metadata.source: "text"`.
  - **Asset upsert pattern**: Text node stores `textAssetRef` in config; on re-render, updates the same asset (preserving ID), not creating new versions. Single source of truth per node.
  - **Result history**: Only stores most recent text render (singleton pattern); earlier renders overwrite in place.
  - **Output**: Rendered image can pipe to downstream image nodes for img2img workflows.

## AI SDK integration (provider-agnostic)

- Use official AI SDK provider adapters. For RunPod, use `@runpod/ai-sdk-provider` via `lib/providers/runpod.ts`. Do not implement raw `fetch` calls for model endpoints.
- Providers are isolated to `lib/providers/*`. Add a new provider adapter file and route API calls through it.
- For img2img: send the input image(s) via `providerOptions.runpod.images` (array). Read as data URLs at request time from the referenced `AssetRef`; do not persist base64 long-term. Do not rely on a singular `image` field.
- Model capabilities drive request shape:
  - Do not send `guidance` for Seedream models (they don't support it).
  - Only send `seed` when defined.
  - Send both `size` (e.g., `"1024x1024"`) and `aspectRatio` (e.g., `"1:1"`). Endpoints use whichever they prefer. `resolveModelDimensions` handles correctness.
- Edit-capable models must be user-selectable:
  - Include e.g. `bytedance/seedream-4.0-edit`, `qwen/qwen-image-edit` in the UI.
  - If an input image is connected and a non-edit model is selected, show a hint to switch models (but do not auto-switch).
- Server logs should be comprehensive but sanitized:
  - Log a truncated preview of `providerOptions.runpod.images` (never full base64).
  - Log final request shape (model, prompt, size/aspectRatio, seed if provided).

## UI/UX conventions

- Show execution status by node highlighting (`data.status`).
- Each node header includes a chevron to toggle a metadata panel (schema, config, result, inputs).
- Images render inline in the Image node (no separate output node required).
- The historical "Output" node is removed for now to keep code lean. Reintroduce later if we add sinks (export/webhook/publish).
- Remove visual noise (no animated edges; no round status dot in titles).
- Run button is stateless; queue count updates instantly.
- ReactFlow Controls and MiniMap live in the app header; entire app wrapped with `ReactFlowProvider`.
- **Single handle rule (CRITICAL)**: Each node has exactly ONE input handle and ONE output handle. NEVER add multiple input or output handles to make users choose between them. The backend/engine resolves what data to use based on connected node types. Keep UX simple.
- **Inspector panel** (left panel):
  - **Content-based reactive architecture**: Panel tracks a unique content ID (e.g., `node-${nodeId}` or `metadata-${nodeId}-${resultId}`).
  - **Toggle behavior**: Clicking the same content source twice closes the panel; clicking different content switches without closing.
  - Works uniformly for all content types: nodes, image metadata, future use cases.
  - Panel width: 320px default (280-600px), persisted in sessionStorage.
  - Overlays canvas (no viewport shift).
  - **Modes**: `PromptInspector`, `ImageInspector` (edit node), `ExecutionInspector` (view persistent metadata, read-only).
  - Custom events for cross-component communication (`metadata-selected` → passes metadata + resultId for toggle logic).
  - Panel state managed via `panelContentId` and `panelContent` (type, nodeId, metadata) in page.tsx.
- **Image hover overlays** (unified pattern):
  - Gradient overlay reveals action buttons on hover
  - Buttons use solid backgrounds (NO backdrop-blur for performance)
  - Button order: Maximize (lightbox), Download, Delete
  - Identical appearance in image-node and media-manager for consistency
  - Image node: clicks on image open inspector; media-manager: clicks select for library
  - Performance: avoid expensive filters like backdrop-blur
- Image node:
  - Model selector includes edit models.
  - **Image upload**: available via "Source" tab's "Upload" button OR "Library" button (opens full-screen media manager in selection mode) OR by clicking the empty image skeleton in the node.
  - All uploads/selections stored via `AssetManager`; stores `uploadedAssetRef` in config.
  - All assets use unified `AssetManager` (legacy paths removed).
  - Model selector is hidden only in `mode: "uploaded"` (not just because a result image exists).
  - When an upstream image is connected and a non-edit model is selected, show a subtle hint to switch.
  - **Result history**:
    - Single-click image → opens generation settings in left panel instantly (toggle behavior: click again to close, click different image to switch)
    - Selected image highlighted via node-type colored border
    - Hover overlay with actions: maximize (lightbox), download, delete - unified styling with media manager
    - Clean, responsive UX with no artificial delays
  - **Lightbox modal** (`components/lightbox.tsx`):
    - Unified reusable component for fullscreen image viewing with navigation
    - Used in both image node and media manager for consistent UX
    - Full-screen overlay with navigation controls; rendered via portal to `document.body` for proper event handling
    - **Navigation**: Previous/Next buttons on left/right sides (only shown when available)
    - **Keyboard controls**: Arrow Left (←) for previous, Arrow Right (→) for next, Escape to close
    - **Image counter**: Shows current position (e.g., "3 / 10") at bottom center
    - **Actions**: Download and close buttons in top-right corner
    - `onNavigate` callback updates the selected image in parent component (e.g., border highlight)
- Media Manager:
  - **Image grid hover**: Same overlay styling as image node for consistency
  - **Lightbox**: Uses the same unified `Lightbox` component as image node with full navigation, keyboard controls, and image counter
  - **Actions**: maximize (lightbox), download, delete - identical button styling to image node
  - **Delete confirmation**: Uses inline Popover (NEVER alert/confirm) to show usage and request force-delete confirmation
  - **Asset source filtering**: Filters by `metadata.source` (text, image, user-uploaded, etc.). Sources are extracted dynamically from assets; filter dropdown shows only sources present in library.
- Edges use bezier curves (type `default`) with a solid off-white stroke; the drag preview uses the same bezier curve for consistency. Gradient removed. Existing edges are normalized on load.
  - Canvas connection settings: `ConnectionMode.Loose`, `connectionRadius = 30`, `connectOnClick` enabled.
  - Canvas snapping: `snapToGrid` with `snapGrid = [8, 8]` for stable placement and connecting.
  - Node resizing uses `@xyflow/react` `NodeResizer` and is only visible when the node is selected (`minWidth=220`, `minHeight=120`).
    - Resizer lines have `pointer-events: none`; resize handles have `pointer-events: auto`; handles render above content to avoid blocking connections.
  - Node dimensions mapping on hydration: apply `size.height` only when `> 0` to avoid 0-height nodes breaking hit-testing; otherwise leave `height` undefined.

## Minimal Design System (Studio Aesthetic)

**Philosophy**: atelier is a professional art studio environment where the UI recedes and the user's work shines. Monochrome foundation with intentional color accents only for node-type identity.

### Color Palette

**Monochrome Foundation**: Pure black canvas, dark grey UI surfaces, white/grey text hierarchy

**Node Type Accents** (ONLY colors):

- Blue for prompt nodes
- Purple for image nodes
- Two versions: full brightness (for icons, handles, selected images), muted/dark (for selected node borders)
- Visual hierarchy: selected images use bright color and pop; selected nodes use dark muted color (so content stands out)
- NEVER use node colors for general UI elements

**General UI Interactions**: Monochrome only (grey hover states for menus, buttons, etc.)

**Functional Colors**: Red for errors, orange for running status, green for success (minimal use)

**Typography**: 3 size tiers only (14px, 13px, 11px); semibold ONLY for primary actions

**Border Radius**: Sharp corners (0px) for nodes and images; small radius (4px) for buttons/inputs only

**Color System Tokens**: See `app/globals.css` for exact values - conventions define principles, not specific hex codes

### Visual Hierarchy (5 Tiers)

**Tier 1: User Content** - Maximum prominence (medium weight, primary color)

- Prompt text, generated images, node titles

**Tier 2: Primary Actions** - High prominence (semibold, white bg/black text)

- Run button, "Use Selected", connection handles, selected nodes

**Tier 3: Secondary Actions** - Medium prominence (normal weight, bordered)

- Add node, queue, media buttons
- Active state promotes to Tier 2 styling

**Tier 4: Tertiary Actions** - Low prominence (low opacity, reveal on hover)

- Settings icons, metadata icons, delete buttons

**Tier 5: UI Chrome** - Minimal prominence (receded, monochrome)

- Panel backgrounds, dividers, labels

### Component Principles

**Nodes**:

- Default: dark grey surface, subtle border, sharp corners
- Selected: border color changes to muted node-type color, stays sharp, subtle glow
- Running: orange border, subtle pulse
- Header icons use full-brightness node-type color
- Settings icon is Tier 4 (low prominence until hover)
- Selected nodes use muted color so selected images inside pop with full brightness

**Images** (CRITICAL):

- ALWAYS sharp corners (0px radius) - NEVER crop artwork
- Selected: border color changes to FULL brightness node-type color (not muted)
- Consistent 1px border width (NO layout shift)
- Visual hierarchy: images brighter than node borders (content is the focus)

**Buttons**:

- Primary (Tier 2): white background, semibold
- Secondary (Tier 3): bordered, transparent, normal weight
- Ghost (Tier 4): transparent, no border, low opacity

**Canvas**:

- Pure black background
- Subtle grey edges
- Minimal grid/dots
- Connection handles scale on hover

**Panels**:

- Receded backgrounds (Tier 5)
- Content uses Tier 1 styling
- Icons use node-type colors
- Controls use Tier 4 styling

### Z-Index Strategy

Dropdown/popover components must stack above full-page overlays; lightbox modals on top of everything.

### Design Principles (Do/Don't)

**Do:**

- Use CSS variables for all colors
- Keep nodes and images sharp-cornered always
- Keep border widths consistent (change color, not thickness)
- Remove unnecessary transitions for instant feedback
- Limit semibold to primary actions only
- Use medium opacity (60%) for tertiary actions (discoverable but not distracting)
- Use node-type colors ONLY for node identity
- Use inline Popover for all confirmations
- Avoid expensive effects (backdrop-blur, excessive animations)

**Don't:**

- Round image corners (show full artwork)
- Use node-type colors outside node contexts
- Use native browser dialogs (alert, confirm, prompt)
- Change border thickness on state changes
- Add decorative gradients or visual noise
- Use color on non-essential elements

**Accessibility**: Meet WCAG AA (4.5:1 text, 3:1 UI); focus indicators visible; hover states use multiple cues

## React & performance patterns

- **Server Components**: Auth checks, initial data loading, and provider credential fetching use server components with Cache Components (`'use cache'` directive). Eliminates client-side loading states and reduces bundle size.
- **Cache Components** (`'use cache'` directive):

  - Use for server functions that fetch cacheable data (e.g., provider credentials, user metadata).
  - **CRITICAL**: Cannot access dynamic APIs (`headers()`, `cookies()`, `searchParams`) inside cached functions. Pass dynamic data as parameters instead.
  - **Pattern**: Get auth/user outside cached function, pass userId as parameter.

    ```typescript
    // ✅ Correct: Auth outside, userId as parameter
    const user = await getAuthenticatedUser()
    const credentials = await getProviderCredentials(user.userId)

    // ❌ Wrong: Auth inside cached function
    export async function getProviderCredentials() {
      "use cache"
      const user = await requireAuth() // ERROR: headers() access
    }
    ```

  - Use `cacheLife()` to set cache duration (`'minutes'`, `'hours'`, `'days'`, `'weeks'`).
  - Use `cacheTag()` to tag cached data for targeted invalidation (e.g., `cacheTag('provider-credentials')`).
  - Per-user caching: Tag with user-specific tags (e.g., `cacheTag(\`provider-credentials-${userId}\`)`) for granular invalidation.
  - Cache invalidation: Use `revalidateTag()` in Route Handlers after mutations; use `updateTag()` in Server Actions for immediate expiration.
  - **When to use**: Any server function that fetches data that doesn't change frequently (credentials, user metadata, static content). Improves UX by eliminating loading states and reducing bundle size.

- **Suspense Boundaries**: All dynamic/runtime data (cookies, headers, searchParams, fetch) wrapped in Suspense boundaries for streaming. Pages using `searchParams` must wrap dynamic parts in Suspense.
  - **CRITICAL**: Only use Suspense when there's actual async work happening. Don't wrap client components that have no async data fetching, especially when all async work (auth checks, data fetching) happens server-side before rendering. Unnecessary Suspense boundaries cause "loading..." flashes during React streaming/hydration.
  - **Pattern**: If async work happens in server component before rendering client component, remove Suspense wrapper around client component.
  - **Fallback best practices**: Use content-matched skeletons that mirror the actual page structure instead of generic "loading..." text for better perceived performance.
- **React Compiler**: Enabled for automatic memoization; manual `useMemo`/`useCallback` removed where compiler handles it. Keep explicit memoization only for values used as dependencies in other hooks.
- Hydration:
  - Seed default workflows client-side only.
  - Use deterministic timestamp-rendering and `suppressHydrationWarning` where needed.
- Avoid cross-component state updates during render:
  - Defer persistence in canvas event handlers using `queueMicrotask`.
- Radix `asChild` integration: UI primitives use `React.forwardRef`.
- Component size: Split large components (>300 lines) into smaller, focused components. Extract reusable UI patterns (popovers, menus, forms) into separate files.
- **Performance optimizations for nodes with heavy content**:
  - `NodeContainer` uses `willChange: transform` for GPU layer promotion (ReactFlow uses CSS transforms). NOTE: Cannot use ANY `contain` property - it clips handles positioned outside node bounds.
  - Image grid scrollable containers use `content-visibility: auto` to skip rendering off-screen content during drag/scroll.
  - These optimizations prevent lag when dragging nodes with many images (50+) by reducing browser compositing work without breaking handles.
- **Scrollable containers in ReactFlow nodes (CRITICAL)**:
  - **ALWAYS** use capture phase event listeners for wheel events in scrollable containers inside ReactFlow nodes to prevent canvas zoom.
  - Pattern: Use `useEffect` with `addEventListener("wheel", handler, { capture: true, passive: false })` on the scrollable container ref.
  - Always call `e.stopPropagation()` to prevent ReactFlow zoom, then `e.preventDefault()` and manual scroll if container can scroll.
  - Example: See `ImageHistoryGrid` and `SourceTab` components for the canonical pattern.
  - Regular `onWheel` handlers with `stopPropagation()` are NOT sufficient - ReactFlow captures events earlier, so capture phase is required.
- **Component reuse (CRITICAL)**:
  - **ALWAYS check existing components before creating new ones for the same use case**.
  - If a pattern exists (e.g., workflow action popovers for create/rename/delete), **REUSE IT** with the same structure, props, and styling.
  - For workflow actions: use the inline Popover pattern (see `WorkflowCreatePopover`, `WorkflowRenamePopover`, `WorkflowDeletePopover`) for all dropdown-triggered actions. Do NOT introduce AlertDialog, Modal, or other patterns for the same use case.
  - For confirmation flows: follow the existing inline popover pattern with cancel/confirm buttons.
  - For destructive actions: use inline Popover with red confirm button (see clear images, delete asset confirmations).
  - **NEVER use `alert()` or `confirm()`** - always use Popover for confirmations.
  - Only introduce new UI patterns when the use case is fundamentally different, not just visually similar.
  - Document new patterns here when they become canonical.

### General interaction & persistence rules (agent playbook)

- **Single source of truth**: Keep a single in‑memory store (Zustand) for UI; treat persistence as an async side‑effect through `StorageManager`. Never immediately re‑hydrate over in‑flight UI state.
- **Write serialization** (NEW): `StorageManager` automatically serializes writes per workflow. No more concurrent write conflicts.
- **Debouncing** (NEW): High-frequency updates (viewport, result history deletes) are automatically debounced by `StorageManager`.
- Edge‑triggered commits: For high‑frequency interactions (drag, resize, slider), buffer changes and commit on an end signal (e.g., `dragging === false`, global `pointerup`). Avoid per‑frame writes.
- Interaction guard: During drag/resize, preserve position/size from previous state but allow data (result, status, resultHistory) to flow through for real-time updates.
- Preserve focus/selection: When remapping store entities into view components, copy transient UI flags (e.g., `selected`, focus) to avoid losing handles/carets.
- **No cross-tab sync** (NEW): App is single-tab focused. Each tab operates independently. No more cross-tab hydration conflicts.
- Deterministic hydration: Gate components that depend on hydrated data; render placeholders instantly (skeletons) for layout stability.
- Sync hints before async data: On startup, prefer synchronous hints (e.g., sessionStorage) for initial selection; validate/repair with durable storage after hydration.
- Idempotent updates: Ensure subscribers are idempotent; remaps should not create new identities or reset transient UI on every store tick.
- Bounded persistence: `StorageManager` handles batching; coalesce multiple changes from a single gesture into one write at the app level before passing to storage.

### Canvas interaction and persistence (ReactFlow)

- Drag/move vs persist:
  - Do not persist node position continuously while dragging; commit once on drag end.
  - Use the change object's `dragging === false` (position events) as the commit signal.
  - Use `queueMicrotask()` to defer the commit (not `setTimeout`).
- Resize vs persist:
  - Treat `dimensions` changes as transient; buffer the latest width/height during resize and persist once on pointerup (resize end). Do not write on every `dimensions` event.
  - Keep a simple interaction guard (e.g., `isInteractingRef`) to temporarily pause store→UI position/size remaps while dragging/resizing.
- Selection preservation:
  - When mapping store nodes back to ReactFlow nodes, preserve the previous `selected` state so the `NodeResizer` remains visible during interactions.
- **Real-time data updates during interactions** (CRITICAL):
  - The interaction guard should ONLY block position/size updates, NOT data updates (result, status, resultHistory).
  - During interactions, preserve `position`, `width`, `height` from previous state, but allow `data` to flow through from store.
  - This ensures queue-generated results appear immediately while drag/resize operations remain smooth.
  - Pattern: `if (isInteractingRef.current && prevNode) { return { ...newNode, position: prevNode.position, width: prevNode.width, height: prevNode.height } }`
- **Write safety** (NEW):
  - `StorageManager` serializes all writes per workflow, so multiple rapid commits are safe.
  - No need to manually debounce position/dimension updates at the component level.
  - Debouncing is only needed for high-frequency updates like viewport pan/zoom (handled by `storageManager.persistDebounced()`).

### Startup/UI gating

- Show the header immediately with skeleton placeholders while the store hydrates.
- Prefer `sessionStorage` for the last-active workflow ID on initial paint for instant correctness; persist the same key to Dexie KV for durability/cross-tab and validate post-hydration.

## API routes

- `POST /api/generate-image`: Requires authentication. Validates model, resolves dimensions via `resolveModelDimensions`, loads user's RunPod API key from Vault via credential resolver, calls `generateImageWithRunpod`, and returns `{ success, imageUrl, executionId, applied, used }`. Returns 403 if no RunPod credential configured.
- `GET /api/providers`: Lists user's provider credentials (metadata only, no secrets). Cached server function `getProviderCredentials(workosUserId)` in `lib/server/providers.ts` provides cached access with `'use cache'` directive. Call from server components with user ID from auth check.
- `POST /api/providers/:provider/credentials`: Stores provider API key in WorkOS Vault, creates metadata record in Convex. Invalidates both `provider-credentials-${userId}` and `provider-credentials` cache tags after mutation.
- `DELETE /api/providers/:provider/credentials`: Revokes credential (deletes from Vault, marks revoked in Convex). Invalidates both `provider-credentials-${userId}` and `provider-credentials` cache tags after mutation.
- Server-side sanitization: do not log full base64; log only truncated previews and counts. Never log API keys or Vault secrets.

## Export / Import / Clone

- Export/Import: `.genaiw.zip` with manifest + workflow JSON (no base64 in JSON).
- **Clone**: New workflow/node/edge IDs; asset refs SHARED (not duplicated). Avoids bloating storage.

## Logging & debug

- Client: nodes log grouped `[node:<id>] <title>` with `inputsUsed` and `result`.
- Server: log request payload and sanitized provider options; verify `images.length > 0` for img2img.

## Adding a new model

- Add to `IMAGE_MODELS` in `lib/config.ts` with correct `id`, `kind` (txt2img | img2img), supported aspect ratios, optional `sizesByRatio`, and `supportsGuidance`.
- Expose it in the Image node selector (include both base and edit variants when available).

## Do / Don't

- Do persist node/edge/viewport changes via `workflowStore` methods (they automatically use `StorageManager`).
- Do use immutable updates in Zustand `set()` — return new objects, never mutate `s.workflows[id]` directly.
- Do merge `resultHistory` when updating node results to preserve all generations across queue runs.
- Do use unique IDs for result history items; delete by ID, not by index.
- Do use `providerOptions.runpod.images` for img2img; keep logs sanitized.
- Do reset node statuses before runs and update status during execution.
- Do store ALL images (generated AND uploaded) via `AssetManager`; reference with `AssetRef`.
- Do use `uploadedAssetRef` for user-uploaded images (NOT `localImageRef` - that's deleted legacy).
- Do control DropdownMenu state explicitly; close it before opening dialogs to avoid lingering `pointer-events: none` on body.
- Do use `queueMicrotask` for deferred state updates when needed (never `setTimeout` for timing hacks).
- Do preserve position/size during interactions but allow data (result, status) to flow through for real-time updates.
- Do validate connections by node type and handle compatibility (prevent prompt→image-input, etc).
- Do trust `StorageManager` to handle write serialization and debouncing automatically.
- Do require authentication on all provider execution routes (use `requireAuth` from `lib/auth.ts`).
- Do resolve provider API keys server-side via credential resolver; never pass keys from client.
- Do check for active credentials before executing workflows with provider nodes; prompt user to configure if missing.
- Do use Cache Components (`'use cache'`) for server functions that fetch cacheable data; pass dynamic values (userId, etc.) as parameters.
- Do wrap pages/components using `searchParams` in Suspense boundaries (Next.js 16 requirement).
- Do invalidate cache tags (`revalidateTag()`) in Route Handlers after data mutations to ensure UI updates immediately.
- Don't auto-switch models in the engine—let users pick (but hint in UI).
- Don't send unsupported params (e.g., guidance for Seedream; undefined seed).
- Don't use raw `fetch` to RunPod model endpoints—always go through the provider adapter.
- Don't persist large base64 media in JSON/localStorage.
- Don't filter image inputs by handle alone; always validate node type and result type to avoid accepting text as images.
- Don't block ALL node updates during interactions—only block position/size, not data.
- Don't splice resultHistory by index during concurrent operations—use ID-based removal.
- Don't call Dexie/DB methods directly from components—always go through `workflowStore` (which uses `StorageManager`).
- Don't implement cross-tab sync—app is single-tab focused to avoid race conditions.
- **NEVER use `setTimeout` for timing hacks or event ordering** — these are band-aids that hide real problems. Use proper state management, `queueMicrotask`, or fix the root cause.
- **NEVER use `alert()` or `confirm()`** — use inline Popover pattern for all confirmations and messages. Native dialogs are ugly, don't match the design system, and interrupt the UX flow.
- **NEVER store provider API keys in env vars, localStorage, or client state** — always use WorkOS Vault server-side. Metadata (lastFour, status) can be in Convex.
- **NEVER log API keys or Vault secrets** — log only metadata (providerId, lastFour, status).
- **NEVER access dynamic APIs (`headers()`, `cookies()`, `searchParams`) inside `'use cache'` functions** — pass dynamic data as parameters instead. Example: `getData(userId)` not `getData()` that calls `requireAuth()` inside.
- **NEVER forget to invalidate cache tags after mutations** — use `revalidateTag()` in Route Handlers or `updateTag()` in Server Actions to ensure UI shows fresh data.

## Quick glossary

- `workflowStore`: source of truth for workflows; persists via `StorageManager`.
- `StorageManager`: central coordinator for all persistence; provides write serialization, debouncing, and backend abstraction.
- `StorageBackend`: interface for pluggable storage (current: `IndexedDBBackend`; future: R2, UploadThing, LocalFile).
- `AssetManager`: stores images in `assets` table (single source of truth); returns `AssetRef`; tracks usage (only `uploadedAssetRef` counts); deletion auto-cleans all references from result histories.
- `workflowEngine`: executes nodes, manages queue, saves to `AssetManager`; event listeners (`addExecutionChangeListener`) for UI updates (supports multiple listeners, no polling).
- `AssetRef`: pointer to asset table (`{ kind: "idb", assetId }`); workflows never store full image data.
- `resultHistory`: contains `AssetRef` + `metadata` (including `executionId` linking to queue snapshot).
- `ExecutionInspector`: read-only snapshot viewer; reuses left panel pattern; "Copy to Node" for settings.
- `credentialResolver`: server-side utility (`lib/credentials.ts`) that fetches provider API keys from WorkOS Vault; caches decrypted keys for 5min; invalidates on rotation/revocation.
- `getProviderCredentials(workosUserId)`: cached server function (`lib/server/providers.ts`) that fetches provider credential metadata using Cache Components (`'use cache'`). Takes userId as parameter (auth check happens outside). Tagged with `provider-credentials-${userId}` and `provider-credentials` for granular invalidation.
- `hasActiveProvider(workosUserId, providerId)`: cached helper that checks if user has active provider credential.
- `WorkOS Vault`: stores provider API keys encrypted; secrets never touch client or Convex; accessed via `lib/vault.ts` utilities.
- `Convex`: server-side database storing user records, org memberships, and provider credential metadata (vaultSecretId, lastFour, status, timestamps). Never stores actual secrets.
- `proxy.ts`: Next.js 16 proxy pattern replacing `middleware.ts`; wraps WorkOS AuthKit middleware for route protection. Export `proxy(request: Request)` function.
- **Cache Components pattern**: Server functions with `'use cache'` directive cache their results. Use `cacheLife()` for duration, `cacheTag()` for invalidation. Dynamic APIs (auth, headers) must be accessed outside cached function and passed as parameters.

## Cache Components Best Practices

**When to create cached server functions:**

- Data that doesn't change frequently (provider credentials, user settings, static metadata)
- Data accessed on multiple pages (provider credentials used in header and settings)
- Data that causes loading states when fetched client-side

**Pattern for new cached functions:**

```typescript
// lib/server/example.ts
export async function getCachedData(userId: string, otherParam: string) {
  "use cache"
  cacheLife("hours") // or "minutes", "days", "weeks"
  cacheTag(`data-${userId}`) // user-specific tag
  cacheTag("data") // general tag for bulk invalidation

  // Fetch data using userId and otherParam
  return data
}

// In server component/page
const user = await getAuthenticatedUser()
const data = await getCachedData(user.userId, someParam)

// In Route Handler after mutation
revalidateTag(`data-${user.userId}`)
revalidateTag("data")
```

**Common mistakes to avoid:**

- ❌ Calling `requireAuth()` or accessing `headers()`/`cookies()` inside cached function
- ❌ Forgetting to invalidate cache tags after mutations
- ❌ Using too long cache durations for frequently-changing data
- ❌ Not using user-specific tags when data is user-scoped

**Benefits:**

- Faster initial page loads (no client-side fetch)
- Reduced JavaScript bundle size (data fetching on server)
- Better UX (no loading spinners for cached data)
- Automatic deduplication (same data fetched multiple times = single request)

## Keeping this doc fresh

- When you change: engine behavior, provider parameters, supported models, or persistence shapes—update this doc.
- When you add: new nodes, node inputs/outputs, or major UI affordances—add a brief note and where to look in code.
- When you add: new cached server functions, document the cache tags and invalidation strategy.
- When you refactor: client-side data fetching to server components, update this doc with the new pattern.

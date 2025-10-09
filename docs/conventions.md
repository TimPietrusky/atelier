## Project Conventions (Living Document)

This doc orients anyone working in this codebase. It captures the architectural intent, API/provider usage, UI/UX rules, persistence, and gotchas we’ve already solved. Keep it up to date when behavior changes.

### What this project is

- atelier: a Next.js web app for building and running node-based AI workflows using the AI SDK.
- Core user story: connect nodes (Prompt → Image …), run, and see outputs inline.
- Provider-agnostic goal: support any provider available via the AI SDK (RunPod today; open to others). Providers are pluggable.
- Ease-of-use comparable to ComfyUI, without local env/custom-node burdens: pure API usage with user-supplied API keys, no local venv.

## Architecture

- **Next.js App Router**: API routes under `app/api/*`, UI in `app/*`.
- **Canvas**: ReactFlow (`components/node-graph-canvas.tsx`) wrapped with `ReactFlowProvider` at app root to enable Controls/MiniMap in header.
- **State**: Zustand store (`lib/store/workflows-zustand.ts`) for in-memory workflows; compat wrapper (`lib/store/workflows.ts`) maintains old API.
- **Persistence**: Unified storage architecture via `StorageManager` (`lib/store/storage-manager.ts`):
  - Serializes writes per workflow to prevent race conditions
  - Debounces high-frequency updates (viewport, result history deletes)
  - Backend abstraction via `StorageBackend` interface (`lib/store/storage-backend.ts`)
  - Current backend: `IndexedDBBackend` wraps Dexie (`lib/store/backends/indexeddb.ts`)
  - Future backends: R2, UploadThing, LocalFile (pluggable)
  - No cross-tab sync (single-tab app pattern); eliminates 90% of race conditions
- **Workflow engine**: `lib/workflow-engine.ts` handles queueing, topological sort, per-node execution, status updates, and result propagation.
- **RunPod provider adapter**: `lib/providers/runpod.ts`—the single place that speaks to `@runpod/ai-sdk-provider`.

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
  - **Lazy loading**: All images use native `loading="lazy"` with explicit `width`/`height` attributes to prevent layout shift.
  - **Asset deletion**: Shows warning ONLY if asset is actively used in `config.uploadedAssetRef`; NOT for outputs/history.
- **Image metadata persistence**: ALL generation settings (prompt, model, steps, guidance, seed, resolution) are stored in `result.metadata.inputsUsed` and persist forever with the image. Settings icon in image history loads from this persistent metadata, NOT from ephemeral queue snapshots.

### Node behaviors

- Prompt node: pass-through of `config.prompt` to `result.data` (text).
- Image node (unified):
  - Mode: `generate` (default) or `uploaded` (short-circuits API calls).
  - Result metadata includes all generation settings (prompt, model, steps, guidance, seed, resolution) stored in `metadata.inputsUsed`.
  - **Queue placeholders**: Live skeletons for ALL pending jobs (queued + running) that will execute this node via `addExecutionChangeListener`; filters out executions that already have results; disabled in "uploaded" mode; ephemeral (gone on reload).
  - **Historical settings**: Settings icon opens left panel (`ExecutionInspector`) showing persistent metadata stored with the image result; "Copy to Node" applies settings. Does NOT rely on ephemeral queue snapshots.
  - **Image source**: "From library" (asset table) or "upload" (local file); hidden in view-only mode.

## AI SDK integration (provider-agnostic)

- Use official AI SDK provider adapters. For RunPod, use `@runpod/ai-sdk-provider` via `lib/providers/runpod.ts`. Do not implement raw `fetch` calls for model endpoints.
- Providers are isolated to `lib/providers/*`. Add a new provider adapter file and route API calls through it.
- For img2img: send the input image(s) via `providerOptions.runpod.images` (array). Read as data URLs at request time from the referenced `AssetRef`; do not persist base64 long-term. Do not rely on a singular `image` field.
- Model capabilities drive request shape:
  - Do not send `guidance` for Seedream models (they don’t support it).
  - Only send `seed` when defined.
  - Use either `aspectRatio` or `size`, not both. `resolveModelDimensions` handles correctness.
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
  - **Image upload**: available via inspector panel "upload image" button OR "from library" button (opens full-screen media manager in selection mode) OR by clicking the empty image skeleton in the node.
  - All uploads/selections stored via `AssetManager`; stores `uploadedAssetRef` in config.
  - All assets use unified `AssetManager` (legacy paths removed).
  - Model selector is hidden only in `mode: "uploaded"` (not just because a result image exists).
  - When an upstream image is connected and a non-edit model is selected, show a subtle hint to switch.
  - **Result history**:
    - Single-click image → opens generation settings in left panel instantly (toggle behavior: click again to close, click different image to switch)
    - Selected image highlighted via node-type colored border
    - Hover overlay with actions: maximize (lightbox), download, delete - unified styling with media manager
    - Clean, responsive UX with no artificial delays
  - **Lightbox modal**:
    - Full-screen overlay with navigation controls; rendered via portal to `document.body` for proper event handling
    - **Navigation**: Previous/Next buttons on left/right sides (only shown when available)
    - **Keyboard controls**: Arrow Left (←) for previous, Arrow Right (→) for next, Escape to close
    - **Image counter**: Shows current position (e.g., "3 / 10") at bottom center
    - **Actions**: Download and close buttons in top-right corner
    - Navigating in lightbox updates the selected image border in the node
- Media Manager:
  - **Image grid hover**: Same overlay styling as image node for consistency
  - **Lightbox**: Simple fullscreen view (click image or maximize button to open, click backdrop to close)
  - **Actions**: maximize (lightbox), download, delete - identical button styling to image node
  - **Delete confirmation**: Uses inline Popover (NEVER alert/confirm) to show usage and request force-delete confirmation
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

- `POST /api/generate-image`: Validates model, resolves dimensions via `resolveModelDimensions`, calls `generateImageWithRunpod`, and returns `{ success, imageUrl, executionId, applied, used }`.
- Server-side sanitization: do not log full base64; log only truncated previews and counts.

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

## Quick glossary

- `workflowStore`: source of truth for workflows; persists via `StorageManager`.
- `StorageManager`: central coordinator for all persistence; provides write serialization, debouncing, and backend abstraction.
- `StorageBackend`: interface for pluggable storage (current: `IndexedDBBackend`; future: R2, UploadThing, LocalFile).
- `AssetManager`: stores images in `assets` table (single source of truth); returns `AssetRef`; tracks usage (only `uploadedAssetRef` counts); deletion auto-cleans all references from result histories.
- `workflowEngine`: executes nodes, manages queue, saves to `AssetManager`; event listeners (`addExecutionChangeListener`) for UI updates (supports multiple listeners, no polling).
- `AssetRef`: pointer to asset table (`{ kind: "idb", assetId }`); workflows never store full image data.
- `resultHistory`: contains `AssetRef` + `metadata` (including `executionId` linking to queue snapshot).
- `ExecutionInspector`: read-only snapshot viewer; reuses left panel pattern; "Copy to Node" for settings.

## Keeping this doc fresh

- When you change: engine behavior, provider parameters, supported models, or persistence shapes—update this doc.
- When you add: new nodes, node inputs/outputs, or major UI affordances—add a brief note and where to look in code.

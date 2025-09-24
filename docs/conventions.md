## Project Conventions (Living Document)

This doc orients anyone working in this codebase. It captures the architectural intent, API/provider usage, UI/UX rules, persistence, and gotchas we’ve already solved. Keep it up to date when behavior changes.

### What this project is

- atelier: a Next.js web app for building and running node-based AI workflows using the AI SDK.
- Core user story: connect nodes (Prompt → Image …), run, and see outputs inline.
- Provider-agnostic goal: support any provider available via the AI SDK (RunPod today; open to others). Providers are pluggable.
- Ease-of-use comparable to ComfyUI, without local env/custom-node burdens: pure API usage with user-supplied API keys, no local venv.

## Architecture

- **Next.js App Router**: API routes under `app/api/*`, UI in `app/*`.
- **Canvas**: ReactFlow (`components/node-graph-canvas.tsx`).
- **State**: Simple store class pattern (Zustand-like) in `lib/store/*`.
  - `workflowStore`: workflows (nodes, edges, viewport, chat, history), persisted.
  - `mediaStore`: generated media registry, persisted.
- **Persistence**: Dexie (IndexedDB) for metadata; OPFS/FS Access for large assets; IndexedDB blobs as fallback. Do not store originals in `localStorage`.
- **Workflow engine**: `lib/workflow-engine.ts` handles queueing, topological sort, per-node execution, status updates, and result propagation.
- **RunPod provider adapter**: `lib/providers/runpod.ts`—the single place that speaks to `@runpod/ai-sdk-provider`.

## Persistence conventions

- All user-facing graph state must persist:
  - Nodes, edges, and viewport via `workflowStore.setNodes/setEdges/setViewport`.
  - Node config changes via `workflowStore.updateNodeConfig`.
  - Node results via `workflowStore.updateNodeResult`.
- Metadata is persisted via Dexie; writes are batched and transactional.
- Seed default workflows on the client only (avoid SSR hydration mismatch).
- Media assets (images/videos):
  - Store originals via OPFS (Origin Private File System) under an app-scoped directory, or in a user-selected folder through File System Access; persist only an `AssetRef` in metadata.
  - Fallback to IndexedDB blobs when OPFS/FS Access is unavailable.
  - Only store tiny previews as data URLs when beneficial; never store originals base64 in JSON/localStorage.
- `AssetRef` is the only allowed reference to media in workflow state (see Glossary).
- Deletions:
  - When nodes are deleted, persist the updated node list and prune edges referencing removed nodes.
- Statuses:
  - Transient `running` status is never persisted; on write it is coerced to `idle`, and on load any persisted `running` becomes `idle`.

## Workflow execution

- Engine performs a topological sort using `workflow.edges` to ensure upstream nodes execute first.
- Maintains a live snapshot (`runtimeNodesByWorkflow`) so resolving inputs uses the latest in-memory state.
- Updates node `status` to `running` → `complete` (or `error`) and persists.
- Queue is managed in-memory; the Run button is stateless and only enqueues runs.

### Node behaviors

- Prompt node: pass-through of `config.prompt` to `result.data` (text).
- Image node (unified):
  - Mode sub-type via `config.mode`:
    - `generate` (default): acts as a generator; model selector visible.
    - `uploaded`: user-loaded image; model selector hidden; generation short-circuits.
  - Short-circuit in `uploaded` mode (or when `localImage`/`localImageRef` present): output the image without API calls.
  - Otherwise resolves inputs from edges:
    - Prompt: most recent upstream prompt.
    - Image: most recent upstream image when the `image-input` handle is connected.
  - Emits `inputsUsed` in `result.metadata` for transparency.

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
- Run button is stateless; queue count in footer updates instantly.
- Image node:
  - Model selector includes edit models.
  - “Load image” writes originals to OPFS (or user folder via FS Access). The node stores only an `AssetRef` to the file; small previews may be cached as data URLs.
  - Model selector is hidden only in `mode: "uploaded"` (not just because a result image exists).
  - When an upstream image is connected and a non-edit model is selected, show a subtle hint to switch.
- Edges use bezier curves (type `default`) with a solid off-white stroke; the drag preview uses the same bezier curve for consistency. Gradient removed. Existing edges are normalized on load.
  - Canvas connection settings: `ConnectionMode.Loose`, `connectionRadius = 30`, `connectOnClick` enabled.
  - Canvas snapping: `snapToGrid` with `snapGrid = [8, 8]` for stable placement and connecting.
  - Node resizing uses `@xyflow/react` `NodeResizer` and is only visible when the node is selected (`minWidth=220`, `minHeight=120`).
    - Resizer lines have `pointer-events: none`; resize handles have `pointer-events: auto`; handles render above content to avoid blocking connections.
  - Node dimensions mapping on hydration: apply `size.height` only when `> 0` to avoid 0-height nodes breaking hit-testing; otherwise leave `height` undefined.

## React & performance patterns

- Hydration:
  - Seed default workflows client-side only.
  - Use deterministic timestamp-rendering and `suppressHydrationWarning` where needed.
- Avoid cross-component state updates during render:
  - Defer persistence in canvas event handlers using `queueMicrotask` or `setTimeout(..., 0)`.
- Radix `asChild` integration: UI primitives use `React.forwardRef`.

## API routes

- `POST /api/generate-image`: Validates model, resolves dimensions via `resolveModelDimensions`, calls `generateImageWithRunpod`, and returns `{ success, imageUrl, executionId, applied, used }`.
- Server-side sanitization: do not log full base64; log only truncated previews and counts.

## Export / Import

- Export a single workflow as a `.genaiw.zip` package containing `manifest.json`, `workflow.json` (no base64), and optionally embedded binaries under `assets/` for that workflow only.
- Import a package by restoring the single workflow and materializing any embedded assets into OPFS; keep `url` assets as URLs by default.

## Logging & debug

- Client: nodes log grouped `[node:<id>] <title>` with `inputsUsed` and `result`.
- Server: log request payload and sanitized provider options; verify `images.length > 0` for img2img.

## Adding a new model

- Add to `IMAGE_MODELS` in `lib/config.ts` with correct `id`, `kind` (txt2img | img2img), supported aspect ratios, optional `sizesByRatio`, and `supportsGuidance`.
- Expose it in the Image node selector (include both base and edit variants when available).

## Do / Don’t

- Do persist node/edge/viewport changes via `workflowStore` methods.
- Do use `providerOptions.runpod.images` for img2img; keep logs sanitized.
- Do reset node statuses before runs and update status during execution.
- Do store originals in OPFS or via FS Access and reference them with `AssetRef`.
- Don’t auto-switch models in the engine—let users pick (but hint in UI).
- Don’t send unsupported params (e.g., guidance for Seedream; undefined seed).
- Don’t use raw `fetch` to RunPod model endpoints—always go through the provider adapter.
- Don’t persist large base64 media in JSON/localStorage.

## Quick glossary

- `workflowStore`: source of truth for workflows; persists via `JsonStorage`.
- `workflowEngine`: executes nodes in dependency order; manages queue; updates statuses/results.
- `localImage`: when present on an Image node, short-circuits generation and outputs that image.
- `inputsUsed`: debug metadata attached to node results for traceability.
- `AssetRef`: typed reference to media (`url` | `opfs` | `fs-handle` | `idb`); never stores base64 originals in JSON.

## Keeping this doc fresh

- When you change: engine behavior, provider parameters, supported models, or persistence shapes—update this doc.
- When you add: new nodes, node inputs/outputs, or major UI affordances—add a brief note and where to look in code.

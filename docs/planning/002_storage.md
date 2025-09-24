# 002_storage – Storage and Sync Architecture

## Summary

We need a robust client-side storage model that:

- Works instantly and offline-first (no server roundtrips during normal UI ops)
- Persists reliably across refreshes, page runs, and restarts (no setTimeout hacks)
- Scales to large binary assets (images) without bloating localStorage
- Can later sync seamlessly with a Convex backend (near-realtime, conflict-aware)

This document defines requirements, proposes an industry-standard architecture, and outlines milestones to migrate incrementally from today’s local-only approach to a future Convex-backed sync layer.

## Goals

- Deterministic, reliable persistence for workflows (nodes, edges, viewport, metadata)
- Durable storage for large assets (images/videos) using OPFS/FS Access with IndexedDB fallback
- Clean separation of concerns between UI state, persistence, and future sync
- No SSR hydration issues (client-only hydration of persisted data)
- Multi-tab coherence without race conditions
- Schema versioning and migration capability
- Ready-to-plug sync engine to Convex (optimistic updates + conflict resolution)

## Non-Goals (for this iteration)

- Full multi-user collaborative CRDTs
- End-to-end encryption and key management
- Full Convex integration (we’ll stub the sync layer and implement later)

## Requirements

1. Consistency
   - Atomic per-entity updates (workflows, nodes, edges, viewport) without torn writes
   - Single source of truth in-memory store reflected into persistent storage
2. Performance
   - Instant UI updates (optimistic)
   - No unnecessary JSON stringify loops on every render
3. Reliability
   - Survive refreshes and restarts (localStorage/IndexedDB)
   - Avoid hydration mismatches; client-only seeding
4. Scale
   - Large assets persisted in OPFS or user-selected folder; IndexedDB Blobs as fallback; only thumbnails as data URLs
   - Avoid localStorage bloat
5. Multi-tab
   - Broadcast updates using BroadcastChannel to keep tabs in sync
6. Evolvability

- Schema versioning capability (future migrations)

7. Observability
   - Structured logging for persistence, migration, and sync operations

## Proposed Architecture

### 1) State Model

- Entities

  - Workflow: { id, name, nodes[], edges[], viewport, updatedAt, version }
  - Node: { id, type, title, status, position, size?, config, result?, updatedAt, version }
  - Edge: { id, source, target, sourceHandle?, targetHandle?, updatedAt, version }

- IDs: use time-ordered UUIDs (e.g., UUIDv7) for stable ordering and easier merge/conflict handling.

- Timestamps: `updatedAt` in ms. For future conflict resolution we can compare clocks and/or versions.

### 2) In-Memory Store (UI Source of Truth)

- Use a single Zustand store with:
  - Pure domain operations (create/update/remove workflow, node, edge)
  - Derived selectors for UI components
  - Strictly no cross-component setState during render; updates happen in event handlers/effects only

### 3) Persistence Layer (Adapters)

- Workflows, nodes, edges, viewport (metadata): Dexie.js (IndexedDB)

  - DB: `atelier` with tables: `workflows`, `nodes`, `edges`, `assets`, `kv` (for app settings/version)
  - Versioned schema via `dexie.version(1).stores(...)` (v1 baseline)
  - Use Dexie transactions to persist atomic updates (e.g., node position+size, edges)
  - Zustand remains the in-memory source of truth; persistence writes are driven by a small bridge (subscribe to store changes, batch to Dexie)

- Large assets (images/videos): OPFS-first with File System Access fallback

  - Primary: OPFS (Origin Private File System) via `navigator.storage.getDirectory()`; store under `/atelier/assets/<type>/<assetId>`
  - Optional user library: File System Access API directory handle (user-chosen). Persist the `FileSystemDirectoryHandle` in Dexie (`assets` table or a dedicated `handles` table). Use `browser-fs-access` for ergonomic pickers and fallbacks
  - Fallback: Dexie table `blobs` storing Blob values keyed by `assetId` when OPFS/FS Access are unavailable
  - Never store originals in `localStorage`. Data URLs are allowed only for tiny thumbnails/previews

- Asset referencing model (inside workflow graph state):

  - `AssetRef` union:
    - `{ kind: "url", url: string, mime?: string, bytes?: number, hash?: string }`
    - `{ kind: "opfs", path: string, mime?: string, bytes?: number, hash?: string }` (path relative to OPFS root)
    - `{ kind: "fs-handle", handleId: string, mime?: string, bytes?: number, hash?: string }` (handle persisted in Dexie)
    - `{ kind: "idb", blobKey: string, mime?: string, bytes?: number, hash?: string }`
  - Node `result` for media uses `AssetRef` instead of base64. Text nodes keep plain strings

- Persistence Strategy:
  - Domain mutations update the Zustand store first (optimistic)
  - A single-writer queue batches writes into Dexie transactions
  - Avoid `setTimeout` ordering; prefer microtasks/idle callbacks where safe

### 4) Multi-Tab Coherence

- Use BroadcastChannel(`atelier:workflows`) to publish small change events (entity keys touched + version/timestamp)
- Upon receiving a message, compare versions and only hydrate if the incoming version is newer than local store

### 5) Schema Versioning (v1)

- Root schema version: `schemaVersion: 1`
- Migration runner scaffolded (no-op in v1); actual migrations deferred until v2+

### 6) Sync Layer (Future: Convex)

- Pattern: Optimistic UI + Eventually consistent server sync
- Local Oplog (operation log): append-only record of domain operations (create/update/delete) with operation IDs
- Sync Engine:

  - On network availability, flush Oplog to Convex mutations
  - Convex returns authoritative versions/timestamps
  - Conflict policy (phase 1): last-write-wins by `updatedAt`/`version`
  - Optionally move to CRDT (e.g., Yjs/Automerge) later for collaborative editing

- Connection Considerations:
  - Backoff + retry (exponential)
  - Detect duplicate ops by operation ID (idempotent server mutations)
  - Partial failure handling (retry only failed ops)

### 7) Single-Workflow Export / Import Package (ZIP)

- Package: `.genaiw.zip` (portable, per workflow)
- Contents:
  - `manifest.json` — package metadata (references exactly one workflow)
  - `workflow.json` — the workflow graph (no base64)
  - `assets/<assetId>.<ext>` — embedded binaries required by this workflow (when chosen)
- Manifest schema (v1):

  ```json
  {
    "packageVersion": 1,
    "app": { "name": "atelier", "version": "x.y.z" },
    "createdAt": "<iso>",
    "workflow": { "id": "...", "file": "workflow.json", "name": "My Workflow" },
    "assets": [
      {
        "id": "<assetId>",
        "origin": "embedded" | "url",
        "mime": "image/png",
        "bytes": 12345,
        "hash": "sha256-...",
        "file": "assets/<assetId>.png",
        "url": "https://..."
      }
    ]
  }
  ```

- Export policy (single workflow):
  - Include only assets referenced by this workflow.
  - Remote/generated assets: keep as `url` by default; optional toggle “Include originals” to download and embed in ZIP.
  - Local-only assets (OPFS, fs-handle, idb): embed binaries under `assets/` and rewrite `AssetRef` to `{ kind: "embedded", id }` inside exported `workflow.json`.
- Import policy:
  - For `origin=url`, keep URL references; offer “Download and cache locally” to copy into OPFS.
  - For `origin=embedded`, write binaries to OPFS and convert to `{ kind: "opfs", path }`.
  - Deduplicate by `hash` if present.

### 8) Concrete Libraries (Browser-first, maintained)

- State: Zustand
- Metadata persistence: Dexie.js (IndexedDB)
- File pickers + FS Access fallbacks: `browser-fs-access`
- ZIP streaming: `zip.js` (Web Streams), fallback to `fflate` where needed
- Hashing: Web Crypto `SubtleCrypto.digest('SHA-256', ...)`
- Broadcast: `BroadcastChannel` with `storage` event fallback

## Implementation Plan (Milestones)

1. Normalize and Harden Local Store (Now)

   - Replace custom `workflowStore` with a single Zustand store
   - Add Dexie database v1 and a store→Dexie bridge for persistence
   - Ensure engine reads latest store snapshot before persisting; no override of local state
   - BroadcastChannel-based multi-tab coherence

2. Large Asset Storage (Now)

- OPFS-first: write assets under `/atelier/assets/...`
  - Optional user library via FS Access (persist directory handle in Dexie)
  - Fallback to Dexie `blobs` table when OPFS/FS Access are unavailable
  - Replace base64 in node results with `AssetRef`; store only thumbnails as data URLs when needed

3. Schema Baseline (v1)

   - Define Dexie schema v1: `workflows`, `nodes`, `edges`, `assets`, `kv`
   - Persist `schemaVersion: 1` in `kv`
   - Provide a no-op migration hook for future versions

4. Export / Import (Short-Term)

   - Implement ZIP export with `zip.js` using Web Streams
   - Manifest v1 + asset hashing; option to embed remote assets
   - Implement importer: validate manifest, restore workflows, materialize assets into OPFS, dedupe by hash

5. Sync Stubs (Short-Term)

   - Define a `SyncEngine` skeleton with: start/stop, scheduleFlush, applyServerAck, backoff
   - Local Oplog (Dexie) to queue operations
   - No actual network calls yet

6. Convex Integration (Future)
   - Map entity mutations to Convex functions (create/update/delete workflow, node, edge)
   - Use Convex live queries to subscribe to changes
   - Implement conflict resolution (LWW initially; CRDT if needed later)
   - Replace local Oplog flush with real network sync

## API Sketch

Store (UI):

- `createWorkflow(name)` → Workflow
- `removeWorkflow(id)`
- `setNodes(workflowId, nodes)`
- `setEdges(workflowId, edges)`
- `updateNodeConfig(workflowId, nodeId, config)`
- `updateNodeResult(workflowId, nodeId, result)`
- `updateNodeDimensions(workflowId, nodeId, position?, size?)` (atomic)
- `setViewport(workflowId, viewport)`

Persistence (Adapters):

- Dexie: `db.workflows`, `db.nodes`, `db.edges`, `db.assets`, `db.kv`
- AssetStorage
  - `put(file|blob, hint:{mime, id?}) -> AssetRef`
  - `get(ref: AssetRef) -> Blob | URL`
  - `delete(ref: AssetRef)`
- Broadcast – notify tabs: `publish({ entity, id, version })`

Sync (Future):

- `oplog.append(op)` – append domain operations with monotonic IDs
- `syncEngine.flush()` – push ops to Convex, reconcile versions, prune oplog

## Acceptance Criteria

- Node position/size persist across refresh, runs, and tab restarts
- Media results in workflows use `AssetRef` (no base64 originals in JSON)
- Large assets stored via OPFS or user-selected folder; fallback to IndexedDB blobs when required
- Export produces `.genaiw.zip` with manifest v1; import restores workflows and assets, deduplicating by hash
- No hydration warnings during boot
- Multi-tab updates reflect within 1 second without race conditions
- Schema includes version field to enable future migrations; v1 requires no migrations

## Risks & Mitigations

- OPFS/FS Access permissions or lack of support → fallback to IndexedDB blobs and surface a capability notice
- IDB quota or corruption → prompt to relocate assets to user folder via FS Access; warn and allow selective cleanup
- Multi-tab write contention → single-writer queue (Dexie tx), last-write-wins by version
- Large JSON writes → store media as `AssetRef`; batch/queue metadata writes only

## Notes

- We intentionally avoid setTimeout for ordering; we use a minimal write queue and schedule microtasks/idle callbacks (where safe) to coalesce writes without affecting determinism.
- When Convex lands, we keep the same store API and plug in the sync engine behind it to minimize invasive changes.

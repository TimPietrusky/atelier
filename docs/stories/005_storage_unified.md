# 005_storage_unified – Unified Storage Architecture

## Problem Statement

The current storage implementation has critical race conditions causing:

- **Nodes snap back** to old positions during drag with many images (~30% of the time)
- **Images reappear** after deletion (ghost images ~50% of rapid deletes)
- **Lost updates** when multiple changes happen rapidly (only 1 of 6 results saved)
- **Cross-tab sync fights** with local edits

### Root Causes (from STORAGE_ANALYSIS.md)

1. **Bidirectional Sync Loop**: Zustand ↔ Dexie ↔ BroadcastChannel creates feedback
2. **No Write Coordination**: Multiple async `void persistGraph()` in flight with no serialization
3. **Cross-Tab Hydration During Interaction**: `hydrate()` overwrites in-progress edits
4. **Interaction Guard Bypass**: Guard blocks ReactFlow but not Zustand/cross-tab updates
5. **Async Fire-and-Forget**: No await, no ordering guarantees, errors swallowed
6. **Result History Merge Race**: Concurrent updates can lose images
7. **Viewport Persist Spam**: Every pan/zoom writes to DB and broadcasts

### Architecture Violations

From `docs/conventions.md`:

- ❌ "Never immediately re‑hydrate over in‑flight UI state" - violated by cross-tab listener
- ❌ "Pause store→UI remaps while gesture is active" - violated by guard not covering all paths
- ❌ "No periodic clobbering" - violated by cross-tab broadcasts at any time

## Goals

### Immediate (Fix Current Issues) - **THIS STORY**

- ✅ Eliminate race conditions and data loss
- ✅ Reliable persistence without snap-backs or ghost data
- ✅ Clean single-direction data flow: UI → Storage (no reverse clobbering)
- ✅ Remove cross-tab sync (single-tab app pattern)
- ✅ Serialize writes, debounce high-frequency updates
- ✅ Fix interaction guard

### Future-Ready (Extensible) - **NOT THIS STORY, KEEP IN MIND**

- ✅ Pluggable storage backends: IndexedDB (now) → Cloud provider (later) → Local filesystem (later)
- ✅ Central `StorageManager` abstraction for all persistence
- ✅ Support for cloud storage when ready (no architectural rewrite needed)
- ✅ Cloud: User picks ONE provider (R2 OR UploadThing), used for both JSON and assets
- ✅ Cloud will need: DB to map user→storage-location, WorkOS auth, separate user story
- ✅ Support for local file save when ready

## Proposed Architecture

### Central Storage Manager

Single class that coordinates ALL persistence:

```typescript
interface StorageBackend {
  saveWorkflow(workflow: WorkflowDoc): Promise<void>
  loadWorkflows(): Promise<WorkflowDoc[]>
  deleteWorkflow(id: string): Promise<void>
  // ... etc
}

class StorageManager {
  private backend: StorageBackend
  private writeQueue: Map<string, Promise<void>> = new Map()

  // Serialize writes per workflow ID
  async persist(workflow: WorkflowDoc): Promise<void> {
    const pending = this.writeQueue.get(workflow.id)

    // Wait for previous write to complete first
    if (pending) await pending

    // Start new write
    const promise = this.backend.saveWorkflow(workflow)
    this.writeQueue.set(workflow.id, promise)

    try {
      await promise
    } finally {
      this.writeQueue.delete(workflow.id)
    }
  }
}
```

**Backends**:

- `IndexedDBBackend` (current) - uses Dexie
- `R2Backend` (future) - Cloudflare R2 for JSON + assets
- `UploadThingBackend` (future) - UploadThing for JSON + assets
- `LocalFileBackend` (future) - saves to user's filesystem

**User chooses ONE cloud provider** for all their data (not mixed).

### Data Flow (Fixed)

```
User Action
  ↓
Zustand.set() (sync, optimistic)
  ↓
UI updates immediately
  ↓
storageManager.persist() (async, queued, serialized)
  ↓
Backend writes (awaited, ordered)
  ↓
✅ Done (no reverse sync)
```

**Key changes**:

- ❌ NO cross-tab sync (remove BroadcastChannel listener)
- ✅ Writes are serialized per workflow (no concurrent writes to same workflow)
- ✅ Writes are awaited (error handling, ordering guarantees)
- ✅ Zustand is never overwritten by persistence layer

### Debouncing Strategy

Different update types have different persistence urgency:

| Update Type               | Debounce  | Why                                  |
| ------------------------- | --------- | ------------------------------------ |
| Node position (drag end)  | None      | Already edge-triggered on drag end   |
| Node resize (pointer up)  | None      | Already edge-triggered on pointer up |
| Node config               | None      | User expects immediate save          |
| Node result               | None      | Critical data, save immediately      |
| **Result history delete** | **100ms** | Batch rapid deletes                  |
| **Viewport**              | **300ms** | Spam during pan/zoom                 |
| Node create/delete        | None      | Critical structure change            |

```typescript
class StorageManager {
  private debouncers = new Map<string, any>()

  persistDebounced(key: string, workflow: WorkflowDoc, delay: number) {
    if (this.debouncers.has(key)) {
      clearTimeout(this.debouncers.get(key))
    }
    this.debouncers.set(
      key,
      setTimeout(() => {
        this.persist(workflow)
        this.debouncers.delete(key)
      }, delay)
    )
  }
}
```

### Interaction Guard (Proper)

Current guard only blocks ReactFlow updates. Need to block ALL external updates during interaction:

```typescript
// In node-graph-canvas
const isInteractingRef = useRef(false)

// REMOVE the workflowStore.subscribe() that creates feedback loop
// INSTEAD: Explicitly pull from store only when needed, respecting guard

useEffect(() => {
  const wf = workflowStore.get(activeWorkflow)
  if (!wf || isInteractingRef.current) return

  // Safe to update from store (not interacting)
  setNodes(wf.nodes.map(mapStoreNodeToRF))
  setEdges(wf.edges)
}, [activeWorkflow /* trigger when workflow updates */])
```

**Problem**: This removes reactive updates. Need a different approach...

**Better**: Keep subscription but make it smarter:

```typescript
const unsub = workflowStore.subscribe(() => {
  if (isInteractingRef.current) {
    console.log("Skipping store→UI update during interaction")
    return // Skip ALL updates during interaction
  }
  // ... update ReactFlow
})
```

### Result History Updates (Atomic)

Current merge logic has read-then-write race. Fix with atomic append:

```typescript
updateNodeResult(workflowId, nodeId, result, resultHistory) {
  set((s) => {
    const doc = s.workflows[workflowId]
    if (!doc) return s

    const nodes = doc.nodes.map((n) => {
      if (n.id !== nodeId) return n

      // Simple append, no complex merge logic
      // Dedupe by ID only (if engine sends same ID twice, it's a bug there)
      const existing = n.resultHistory || []
      const incoming = resultHistory || []

      const existingIds = new Set(existing.map((r: any) => r.id))
      const newItems = incoming.filter((r: any) => !existingIds.has(r.id))

      return {
        ...n,
        result,
        resultHistory: [...existing, ...newItems], // Simple append
        status: "complete",
      }
    })

    const next = { ...doc, nodes, updatedAt: Date.now(), version: (doc.version || 0) + 1 }
    storageManager.persist(next) // Queued, awaited, serialized
    return { workflows: { ...s.workflows, [workflowId]: next } }
  })
}
```

## Implementation Plan

### Phase 1: Fix Immediate Issues (Priority)

#### 1.1 Remove Cross-Tab Sync

**File**: `lib/store/workflows-zustand.ts:410-418`

```typescript
// DELETE THIS:
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  const ch = new BroadcastChannel("atelier:workflows")
  ch.addEventListener("message", () => {
    try {
      const { hydrate } = useWorkflowStore.getState()
      void hydrate()
    } catch {}
  })
}
```

**Impact**: Eliminates 90% of race conditions immediately

#### 1.2 Create StorageManager

**File**: `lib/store/storage-manager.ts` (new)

Core features:

- Write queue per workflow ID
- Debounce map for high-frequency updates
- Error handling and logging
- Backend abstraction

#### 1.3 Update Zustand to Use StorageManager

**Files**: `lib/store/workflows-zustand.ts`

Replace all `void persistGraph(next)` with:

```typescript
storageManager.persist(next)
```

Replace `void updateWorkflowViewport(...)` with:

```typescript
storageManager.persistDebounced(`viewport-${id}`, next, 300)
```

#### 1.4 Fix Interaction Guard

**File**: `components/node-graph-canvas.tsx:305-343`

Add guard to subscription:

```typescript
const unsub = workflowStore.subscribe(() => {
  if (isInteractingRef.current) return // Skip during interaction
  // ... rest of update logic
})
```

### Phase 2: Backend Abstraction (Future-Ready)

#### 2.1 Define StorageBackend Interface

**File**: `lib/storage/backend.ts` (new)

```typescript
export interface StorageBackend {
  // Workflows
  saveWorkflow(workflow: WorkflowDoc): Promise<void>
  loadWorkflows(): Promise<WorkflowDoc[]>
  deleteWorkflow(id: string): Promise<void>

  // Assets
  saveAsset(id: string, blob: Blob): Promise<AssetRef>
  loadAsset(ref: AssetRef): Promise<Blob | string>
  deleteAsset(ref: AssetRef): Promise<void>

  // KV store
  setKV(key: string, value: any): Promise<void>
  getKV<T>(key: string): Promise<T | undefined>
}
```

#### 2.2 Implement Backends

- `IndexedDBBackend` - wraps current Dexie code
- `R2Backend` / `UploadThingBackend` (future) - user picks ONE for cloud storage
- `LocalFileBackend` (future) - saves JSON + assets to user folder

#### 2.3 StorageManager Uses Backend

```typescript
export class StorageManager {
  constructor(private backend: StorageBackend) {}

  async persist(workflow: WorkflowDoc) {
    // ... queue logic
    await this.backend.saveWorkflow(workflow)
  }
}

// In app init:
const backend = new IndexedDBBackend()
export const storageManager = new StorageManager(backend)
```

### Phase 3: Future Enhancements

#### 3.1 Cloud Storage (User Picks Provider)

- Implement `R2Backend` and `UploadThingBackend`
- Add WorkOS authentication
- UI: Settings to select provider (R2 OR UploadThing)
- UI: "Save to Cloud" / "Load from Cloud" buttons
- Selected provider handles BOTH workflow JSON and assets
- Simple CRUD, no complex sync

#### 3.2 Local Filesystem

- Implement `LocalFileBackend`
- Use File System Access API
- Save workflows as `workflow.json` + `assets/` folder
- Auto-save on change (with debounce)

#### 3.3 Hybrid Mode (Optional)

- `CompositeBackend` that writes to multiple backends
- Primary: Cloud (if authenticated)
- Fallback: IndexedDB (always available)
- Manual sync: user triggers save/load from cloud

## Migration Strategy

### Step 1: Create StorageManager (No Breaking Changes)

- New `lib/storage/manager.ts`
- New `lib/storage/backends/indexeddb.ts`
- Use existing Dexie code, just wrapped
- Tests to verify no behavior change

### Step 2: Update Zustand Calls (One at a time)

- Replace `void persistGraph()` → `storageManager.persist()`
- Test after each replacement
- Verify no regressions

### Step 3: Remove Cross-Tab Sync

- Comment out BroadcastChannel listener
- Test for 1 week
- If no issues, delete code

### Step 4: Add New Backends

- Implement as needed
- Plug into existing StorageManager
- No Zustand changes required

## User Stories

### US1: Reliable Image Deletion

**As a user**, when I delete an image from history, **it stays deleted** and doesn't reappear.

**Technical**:

- Delete triggers Zustand update (sync)
- StorageManager queues persist
- No cross-tab sync overwrites local state
- Image gone permanently

### US2: Smooth Node Dragging

**As a user**, when I drag nodes with 100 images in history, **they don't snap back** to old positions.

**Technical**:

- Drag end commits position to Zustand
- StorageManager serializes persist
- No cross-tab `hydrate()` during or after drag
- Position persists reliably

### US3: No Lost Results

**As a user**, when queue processes 10 workflows rapidly, **all 10 results appear** in history.

**Technical**:

- Each `updateNodeResult` appends atomically
- StorageManager serializes persists per workflow
- No concurrent writes clobber each other
- All 10 results saved

### US4: Future - Cloud Storage

**As a user**, I can **choose a cloud provider** (R2 or UploadThing) and **save workflows to the cloud**.

**Technical**:

- UI: Settings to pick provider (R2 OR UploadThing)
- UI: "Save to Cloud" / "Load from Cloud" buttons
- StorageManager uses `R2Backend` or `UploadThingBackend` (user's choice)
- ONE provider handles both JSON workflows AND assets
- WorkOS handles authentication
- Simple upload/download, no real-time sync complexity
- Existing local workflows stay in IndexedDB

### US5: Future - Local File Save

**As a user**, I can **save workflows to my computer** as regular files I can backup/version.

**Technical**:

- UI: "Save to folder" button
- StorageManager uses `LocalFileBackend`
- Auto-saves on change (debounced)
- Standard file format (JSON + assets)

## Acceptance Criteria

### Phase 1 (Immediate Fixes)

- [ ] No nodes snap back during drag (tested with 100+ images)
- [ ] Deleted images stay deleted (tested with rapid deletes)
- [ ] All queue results saved (tested with 10 concurrent executions)
- [ ] No cross-tab sync clobbering
- [ ] StorageManager serializes writes per workflow

### Phase 2 (Backend Abstraction)

- [ ] `StorageBackend` interface defined
- [ ] `IndexedDBBackend` wraps existing Dexie code
- [ ] All Zustand methods use `storageManager.persist()`
- [ ] No breaking changes to existing functionality

### Phase 3 (Future Backends)

- [ ] Cloud backend can be swapped in without Zustand changes
- [ ] Local file backend can be swapped in without Zustand changes
- [ ] UI can switch between backends

## Technical Design

### StorageManager API

```typescript
export class StorageManager {
  private backend: StorageBackend
  private writeQueue: Map<string, Promise<void>>
  private debouncers: Map<string, any>

  constructor(backend: StorageBackend) {
    this.backend = backend
    this.writeQueue = new Map()
    this.debouncers = new Map()
  }

  // Immediate persist (serialized per workflow)
  async persist(workflow: WorkflowDoc): Promise<void> {
    const id = workflow.id

    // Wait for any pending write to this workflow
    const pending = this.writeQueue.get(id)
    if (pending) await pending

    // Start new write
    const writePromise = this.backend.saveWorkflow(workflow)
    this.writeQueue.set(id, writePromise)

    try {
      await writePromise
    } catch (err) {
      console.error("[StorageManager] Failed to persist workflow:", id, err)
      throw err
    } finally {
      this.writeQueue.delete(id)
    }
  }

  // Debounced persist (for high-frequency updates)
  persistDebounced(key: string, workflow: WorkflowDoc, delayMs: number): void {
    if (this.debouncers.has(key)) {
      clearTimeout(this.debouncers.get(key))
    }

    this.debouncers.set(
      key,
      setTimeout(() => {
        this.persist(workflow).catch((err) => {
          console.error("[StorageManager] Debounced persist failed:", err)
        })
        this.debouncers.delete(key)
      }, delayMs)
    )
  }

  // Cancel pending writes (e.g., on unmount)
  async flush(): Promise<void> {
    const pending = Array.from(this.writeQueue.values())
    await Promise.all(pending)
  }
}
```

### Backend Interface

```typescript
export interface StorageBackend {
  // Workflows
  saveWorkflow(workflow: WorkflowDoc): Promise<void>
  loadWorkflows(): Promise<WorkflowDoc[]>
  deleteWorkflow(id: string): Promise<void>
  updateViewport(id: string, viewport: Viewport): Promise<void>

  // Assets (for image/video storage)
  saveAsset(blob: Blob, metadata?: AssetMetadata): Promise<AssetRef>
  loadAsset(ref: AssetRef): Promise<Blob | string>
  deleteAsset(ref: AssetRef): Promise<void>

  // Key-Value (app settings)
  setKV(key: string, value: any): Promise<void>
  getKV<T>(key: string): Promise<T | undefined>
}
```

### IndexedDB Backend (Current)

```typescript
export class IndexedDBBackend implements StorageBackend {
  async saveWorkflow(workflow: WorkflowDoc): Promise<void> {
    // Use existing writeWorkflowGraph() from db.ts
    await writeWorkflowGraph({
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes.map(sanitizeNode),
      edges: workflow.edges,
      viewport: workflow.viewport,
      updatedAt: workflow.updatedAt,
      version: workflow.version,
    })
  }

  async loadWorkflows(): Promise<WorkflowDoc[]> {
    // Use existing hydrateWorkflows() from db.ts
    const rows = await hydrateWorkflows()
    return rows.map(rowToWorkflowDoc)
  }

  // ... other methods wrap existing db.ts functions
}
```

### Cloud Backends (Future - User Picks ONE)

**R2 Backend** (Cloudflare R2 - S3-compatible):

```typescript
export class R2Backend implements StorageBackend {
  constructor(private userId: string, private apiUrl: string) {}

  async saveWorkflow(workflow: WorkflowDoc): Promise<void> {
    // Upload workflow JSON to R2
    await fetch(`${this.apiUrl}/workflows/${this.userId}/${workflow.id}.json`, {
      method: "PUT",
      body: JSON.stringify(workflow),
    })
  }

  async saveAsset(blob: Blob, metadata?: AssetMetadata): Promise<AssetRef> {
    // Upload asset blob to R2
    const assetId = metadata?.id || generateId()
    await fetch(`${this.apiUrl}/assets/${this.userId}/${assetId}`, {
      method: "PUT",
      body: blob,
    })
    return { kind: "url", url: `${this.apiUrl}/assets/${this.userId}/${assetId}` }
  }
}
```

**UploadThing Backend**:

```typescript
export class UploadThingBackend implements StorageBackend {
  constructor(private userId: string) {}

  async saveWorkflow(workflow: WorkflowDoc): Promise<void> {
    // Upload workflow as JSON file via UploadThing
    const jsonBlob = new Blob([JSON.stringify(workflow)], { type: "application/json" })
    await uploadFiles([jsonBlob], { metadata: { userId: this.userId, type: "workflow" } })
  }

  async saveAsset(blob: Blob): Promise<AssetRef> {
    // Upload asset via UploadThing
    const upload = await uploadFiles([blob], { metadata: { userId: this.userId } })
    return { kind: "url", url: upload[0].url }
  }
}
```

**Note**: User selects ONE provider in settings. That provider handles ALL their data (JSON + assets). WorkOS handles auth for both.

### Local File Backend (Future)

```typescript
export class LocalFileBackend implements StorageBackend {
  private dirHandle?: FileSystemDirectoryHandle

  async init() {
    // Request directory access
    this.dirHandle = await window.showDirectoryPicker()
  }

  async saveWorkflow(workflow: WorkflowDoc): Promise<void> {
    if (!this.dirHandle) throw new Error("No directory selected")

    // Save as workflow-{id}.json
    const fileHandle = await this.dirHandle.getFileHandle(`workflow-${workflow.id}.json`, {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(workflow, null, 2))
    await writable.close()

    // Save assets to assets/ subfolder
    // ...
  }

  // ... etc
}
```

## Changes to Zustand Store

### Before (Race Conditions)

```typescript
updateNodeConfig(workflowId, nodeId, config) {
  set((s) => {
    // ... update logic
    void persistGraph(next) // ❌ Fire and forget, no coordination
    return { workflows: { ...s.workflows } }
  })
}
```

### After (Serialized, Safe)

```typescript
updateNodeConfig(workflowId, nodeId, config) {
  set((s) => {
    // ... update logic
    storageManager.persist(next) // ✅ Queued, awaited, serialized
    return { workflows: { ...s.workflows } }
  })
}
```

### Viewport (Debounced)

```typescript
setViewport(workflowId, viewport) {
  set((s) => {
    // ... update logic
    storageManager.persistDebounced(`viewport-${workflowId}`, next, 300)
    return { workflows: { ...s.workflows } }
  })
}
```

### Result History Delete (Debounced)

```typescript
removeFromResultHistory(workflowId, nodeId, resultId) {
  set((s) => {
    // ... update logic
    storageManager.persistDebounced(`history-${workflowId}-${nodeId}`, next, 100)
    return { workflows: { ...s.workflows } }
  })
}
```

## File Structure

```
lib/
  storage/
    manager.ts           # Central StorageManager class
    backend.ts           # StorageBackend interface
    backends/
      indexeddb.ts       # IndexedDBBackend (wraps db.ts)
      r2.ts              # R2Backend (future: Cloudflare R2)
      uploadthing.ts     # UploadThingBackend (future)
      local-file.ts      # LocalFileBackend (future)
  store/
    workflows-zustand.ts # Uses storageManager
    db.ts                # Low-level Dexie (used by IndexedDBBackend)
```

## Testing Strategy

### Unit Tests

- StorageManager write queue serialization
- Debounce logic (verify batching)
- Backend interface compliance

### Integration Tests

- Rapid deletes (100 images) → all persist
- Drag with large history → no snap back
- Concurrent result updates → no data loss
- Page reload → state restored correctly

### Stress Tests

- 1000 nodes in workflow
- 500 images in one node's history
- Rapid pan/zoom (viewport spam)
- Delete all 500 images one by one

## Migration Checklist

- [ ] Create `StorageManager` class
- [ ] Create `StorageBackend` interface
- [ ] Implement `IndexedDBBackend` (wrap existing db.ts)
- [ ] Update Zustand: replace `void persistGraph()` with `storageManager.persist()`
- [ ] Add debouncing for viewport and result history
- [ ] Remove cross-tab sync BroadcastChannel
- [ ] Remove `bus.post()` calls from Zustand
- [ ] Update interaction guard to skip ALL store subscription updates
- [ ] Test: drag with 100 images
- [ ] Test: delete 50 images rapidly
- [ ] Test: queue 10 workflows
- [ ] Document in conventions.md

## Success Metrics

### Before (Current Issues)

- ❌ Nodes snap back ~30% of the time with heavy history
- ❌ Images reappear ~50% of the time when deleting rapidly
- ❌ Lost 5/6 results with concurrent executions
- ❌ Viewport jumps during pan with other tab open

### After (Fixed)

- ✅ 0% snap backs (serialized writes, no cross-tab)
- ✅ 0% ghost images (debounced deletes, no hydrate clobber)
- ✅ 100% results saved (atomic appends)
- ✅ Smooth viewport (debounced, no spam)

### Future (With Cloud)

- ✅ User picks ONE cloud provider (R2 OR UploadThing)
- ✅ Save/load workflows + assets from cloud
- ✅ Offline-first (local IndexedDB always works)
- ✅ Simple manual sync (no complex conflict resolution needed)
- ✅ WorkOS handles authentication

## Related Documents

- `docs/conventions.md` - Current persistence rules (to be updated)
- `docs/planning/002_storage.md` - Original storage architecture (implemented partially)
- `STORAGE_ANALYSIS.md` - Detailed race condition analysis (root cause investigation)

## Decision Log

### Decision 1: Remove Cross-Tab Sync

**Rationale**: App is single-tab focused. Cross-tab sync adds complexity and race conditions with no real benefit. Users don't typically open multiple tabs of this app.

**Trade-off**: If user opens two tabs, they're independent. Last tab closed wins on next reload. This is acceptable.

### Decision 2: Serialize Writes Per Workflow

**Rationale**: Prevents out-of-order writes and conflicting updates to same workflow. Small performance cost (writes are fast) for huge reliability gain.

**Trade-off**: If user edits two different workflows simultaneously, writes could theoretically be parallel. We serialize anyway for simplicity.

### Decision 3: Debounce Only High-Frequency Updates

**Rationale**: Viewport/result-delete can spam. Node position/config are already edge-triggered or infrequent. Selective debouncing keeps critical updates immediate.

**Trade-off**: 300ms viewport delay means pan/zoom takes 300ms to persist. This is fine (user is still panning).

### Decision 4: Backend Abstraction Now

**Rationale**: Fixing races requires touching persistence code anyway. Adding abstraction now prevents second refactor later when adding cloud.

**Trade-off**: Slightly more code upfront, but pays off immediately with testability and future flexibility.

## Open Questions

1. **Should we keep `mergeFromDbIfNewer()`?**

   - Currently unused if we remove cross-tab sync
   - Keep as no-op for future cloud sync?
   - **Decision**: Keep stub, implement when cloud backend added

2. **Error handling for persist failures?**

   - Show toast notification?
   - Retry logic?
   - **Decision**: Log to console for now, add UI indicator in Phase 2

3. **Maximum result history size?**

   - Should we limit to 1000 items?
   - Auto-cleanup old items?
   - **Decision**: No limit for now, revisit if performance issues

4. **Debounce timing values?**
   - 300ms for viewport (feels right)
   - 100ms for deletes (could be higher?)
   - **Decision**: Start with these, adjust based on feel

## Notes

- This is NOT a full rewrite - it's a surgical fix with future-proofing
- Existing Dexie code stays (just wrapped in backend)
- Existing Zustand API stays (just calls storageManager)
- Can ship Phase 1 quickly (1-2 days work)
- Phase 2/3 are optional enhancements

# Workflow Management

An AI Studio capability to manage multiple workflows: create, switch, export to JSON, and import from JSON. Each workflow is an isolated graph (nodes, edges, viewport, chat/history), persisted locally. Switching is instant and loads the correct graph state.

---

## 🌐 Feature Map

### Core features

- Create new workflow (empty graph)
- Switch between workflows (loads graph state)
- Export workflow as JSON
- Import workflow from JSON (as new)

### Supporting features

- Rename and delete workflows
- Persist active workflow selection
- Status sanitization on load (no stuck "running")
- Safe import validation and version compatibility

---

## 📖 User Story

### 1) Creating the New Workflow

- User opens the Workflow Switcher and clicks “+ New Workflow”.
- A modal prompts for a name (default “Untitled Workflow <n>”).
- On confirm:
  - A new workflow is created with an empty graph: nodes = [], edges = [], viewport at default.
  - The new workflow becomes active; the canvas shows no nodes.
  - The empty workflow is immediately persisted.

### 2) Switching Between Workflows

- The Workflow Switcher lists all existing workflows by name.
- Clicking a workflow instantly loads its graph state:
  - Nodes, edges, viewport, and per-workflow chat/history appear.
  - Node statuses are normalized so no node appears “running” after a refresh.
- The active workflow ID is stored so returning to the app reloads the same workflow.

### 3) Export Workflow as JSON

- From the Workflow Switcher (overflow menu), user clicks “Export JSON”.
- The app downloads a `.json` file representing ONLY the selected workflow:
  - Includes: id, name, nodes, edges, viewport, chat/history (optional), and minimal metadata.
  - Node statuses are sanitized (no transient running states).
  - Data URLs may be large; keep as-is. Local images use `localImageRef` (IndexedDB) and may export without raw blobs.
- Filename suggestion: `<workflow-name>.<workflow-id>.json`.

### 4) Import Workflow as JSON

- From the Workflow Switcher, user clicks “Import JSON”.
- A file picker opens; user selects a `.json` file.
- The app validates the payload:
  - Required fields: name, nodes (array), edges (array or empty array), optional viewport.
  - If ids collide, a new `id` is generated.
  - All node statuses set to `idle` on import.
- Import mode: “Create as New Workflow” (default). The imported workflow appears in the switcher and becomes active.
- If any validation fails, the user sees a clear error message with reason.

### 5) Loading Content on Switch

- When switching, the app pulls the selected workflow from persistence and renders it:
  - ReactFlow nodes/edges reflect the saved positions and connections.
  - Viewport is restored.
  - Any `localImageRef` images hydrate from IndexedDB when available; absence does not block rendering.

### 6) Empty New Workflows

- New workflows contain zero nodes and edges by default.
- The canvas is empty until the user adds nodes manually or via the chat agent.

---

## 📦 Component List

### Workflow

- `workflow-switcher.tsx` → Create/Rename/Delete/Export/Import; persist active selection
- `node-graph-canvas.tsx` → Render nodes/edges/viewport for the active workflow
- `lib/store/workflows.ts` → create/list/get/upsert/remove; serialize/deserialize; sanitize statuses
- `lib/store/idb.ts` → Hydrate `localImageRef` on demand for imported workflows

---

## ✅ Acceptance Criteria

### Create / Switch

- [ ] “+ New Workflow” creates a new workflow with empty nodes/edges and default viewport
- [ ] Newly created workflow becomes active and persists
- [ ] Switching workflows immediately loads nodes/edges/viewport/chat/history
- [ ] Active workflow persists across page refresh

### Export

- [ ] Export downloads a single JSON file with the selected workflow only
- [ ] JSON includes id, name, nodes, edges, viewport; statuses are not “running”
- [ ] Filename is `<workflow-name>.<workflow-id>.json`

### Import

- [ ] Import accepts a `.json` file and validates schema
- [ ] Imported workflow is added as new with a fresh id if needed
- [ ] Node statuses are set to `idle`; viewport optional
- [ ] On success, the imported workflow becomes active; on failure, show error

### Persistence & Hygiene

- [ ] All changes (create/switch/import/export) are persisted via `JsonStorage`
- [ ] On load and on persist, transient `running` statuses are sanitized to `idle`
- [ ] Deleting a workflow removes it without affecting others

---

# 🎯 Summary

Workflow Management = Create, switch, export, and import isolated graphs reliably. New workflows start empty; switching is instant; JSON import/export is safe and predictable; statuses and local images are handled gracefully.

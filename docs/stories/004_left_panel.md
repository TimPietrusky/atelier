# Node Inspector Panel

A dedicated left panel for configuring selected nodes, keeping the canvas clean and configuration inputs spacious. Selecting a node opens the panel with its settings; clicking the canvas closes/hides the panel. Panel is hidden when no node is selected. Nodes remain minimal (header + content only).

---

## 🌐 Feature Map

### Core features

- Open inspector panel when node is selected
- Show node-specific configuration (model, steps, seed, prompt, etc.)
- Live updates flow from panel to node
- Close panel when canvas clicked or node deleted
- Resizable panel width

### Supporting features

- Session-persisted panel width (not across reloads)
- Selected node visual highlight on canvas
- Smooth slide-in/out animation when opening/closing
- Settings icon in node header as visual indicator

---

## 📖 User Story

### 1) Selecting a Node

- User clicks any node on the canvas.
- The left inspector panel slides in (200ms animation).
- Panel header shows: node type icon, node title, and node ID (muted, for debugging).
- Panel body shows all configuration options for that node type:
  - **Prompt Node**: Multi-line textarea, character count
  - **Image Node**: Model selector, resolution, steps, CFG scale, seed, mode, upload button
- Settings use the full panel width (easier to interact with than cramped in-node inputs).

### 2) Editing Settings

- User changes any setting in the inspector panel (e.g., adjusts steps slider).
- The node updates immediately (live) — no save button needed.
- Changes persist via `workflowStore.updateNodeConfig`.
- **Important**: Edits only affect the workflow in its current state, NOT workflows already in the queue.
- Queued workflows use a snapshot of settings from when they were queued.

### 3) Switching Between Nodes

- User clicks a different node while the panel is open.
- Panel remains open and updates to show the new node's settings.
- Previous node's selection highlight disappears; new node is highlighted.

### 4) Closing the Panel

- User clicks the canvas background (pane click) → panel slides out and is hidden.
- User clicks a different node → panel updates content (doesn't close).
- User deletes the selected node → panel slides out and is hidden.
- User switches workflows → panel slides out and is hidden.
- Panel is completely hidden when no node is selected (not just showing empty state).

### 5) Panel Resize

- User drags the resize handle on the right edge of the panel.
- Panel width adjusts between 320px (min) and 600px (max).
- Resize width is stored in `sessionStorage` for the session.

### 6) Node Appearance Changes

- In-node settings section is removed (no more expandable chevron).
- Nodes show only: header (with settings icon), primary content (images/prompt/output), and connection handles.
- Settings icon in header indicates "select me to configure in panel".
- Selected node has a highlighted border.

---

## 📦 Component List

### Inspector Panel

- `node-inspector-panel.tsx` → Main panel with header, resize handle, and dynamic content renderer
- `node-inspector-sections/prompt-inspector.tsx` → Prompt node configuration
- `node-inspector-sections/image-inspector.tsx` → Image node configuration
- `node-inspector-sections/custom-inspector.tsx` → Generic fallback for other node types

### Node Updates

- `nodes/prompt-node.tsx` → Remove `NodeSettings`, keep header + content
- `nodes/image-node.tsx` → Remove `NodeSettings`, keep header + content
- `node-components.tsx` → Simplify or remove `NodeSettings` component

### State

- `app/page.tsx` → Manage `selectedNodeId`, `inspectorPanelWidth`, wire `onNodeClick`/`onPaneClick`

### Queue Snapshot Fix (REQUIRED)

- `lib/workflow-engine.ts` → **BUG**: Currently re-fetches workflow from store at execution time, not queue time
- **Fix needed**: Store node snapshot in `ExecutionQueue` when queued, use that snapshot during execution
- Add `nodes: WorkflowNode[]` to `ExecutionQueue` interface
- In `executeWorkflow`: capture `nodes` and store in queue item
- In `runWorkflowExecution`: use queue snapshot instead of fetching from store

---

## ✅ Acceptance Criteria

### Panel Visibility

- [ ] Panel is hidden when no node is selected (completely removed from view)
- [ ] Clicking any node opens the panel (or updates if already open)
- [ ] Clicking canvas background closes/hides the panel
- [ ] Deleting selected node closes/hides the panel
- [ ] Switching workflows closes/hides the panel
- [ ] Panel slides in from left when opening, slides out when closing (200ms)

### Layout / Resize

- [ ] Panel is fixed on left side, below header, with backdrop blur effect
- [ ] Panel width is resizable: min 320px, max 600px, default 400px
- [ ] Resize handle on right edge of panel
- [ ] Panel width persists in `sessionStorage` for the session

### Content

- [ ] Panel header shows: node type icon, node title, node ID (muted)
- [ ] Panel body shows all configuration options for the selected node type
- [ ] Prompt node: multi-line textarea, character count
- [ ] Image node: model, resolution, steps, CFG scale, seed, mode, upload
- [ ] Inputs use full panel width (more spacious than in-node inputs)
- [ ] Changes update node immediately via `workflowStore.updateNodeConfig` (no save button)
- [ ] **Queued workflows use snapshot**: edits don't affect workflows already in queue

### Node Appearance

- [ ] Remove `NodeSettings` expandable section from all nodes
- [ ] Nodes show only: header (with settings icon), primary content, handles
- [ ] Selected node has highlighted border
- [ ] Settings icon in header indicates "select to configure"

### Animation / Polish

- [ ] Panel does not re-render on canvas pan/zoom (only on node data changes)
- [ ] Smooth content transition when switching between nodes
- [ ] Slide-in animation when opening (translate-x from -100% to 0)
- [ ] Slide-out animation when closing (translate-x from 0 to -100%)

---

# 🎯 Summary

Node Inspector Panel = Left panel that opens when a node is selected and closes when canvas is clicked. Shows configuration settings for the selected node with spacious inputs. No save button (live updates). Nodes are minimal (header + content only). Panel width is resizable and persists per session. **Queue snapshots ensure edits don't affect already-queued workflows** (requires workflow-engine fix). Cleaner canvas, better UX, easier to extend.

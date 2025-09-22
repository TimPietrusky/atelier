# Agent-Graph Studio

An AI-first media generation studio that combines a **node graph editor** with a **chat agent** (like Cursor) and a **global media manager** (like iOS Photos), built with the AI SDK and RunPod as the provider. Users can manage multiple workflows, generate images/videos/text, and reuse outputs as inputs.

---

## 🌐 Feature Map

### Core features

- **Node Graph Editor**: visual pipelines, simple but customizable.
- **Chat Agent**: natural language to node graph updates.
- **Media Manager**: global history, iOS Photos–style timeline.
- **Workflow Switcher**: multiple independent graphs/projects.
- **Execution Queue**: live feedback on generation tasks.
- **History/Versioning**: graph + chat log synced.

### Supporting features

- Search + filters (media manager).
- Folders + tags (organization).
- Drag-and-drop between media manager ↔ graph.
- Previews inline (chat + graph + media manager).

---

## 📖 User Story

### 1. Starting Out

User logs in and lands in the **Studio Dashboard**.

- If no provider is connected, the user sees a **Connect Provider wizard**.

  - Step 1: Connect a provider (e.g., RunPod, OpenRouter, Fal).
  - App auto-discovers capabilities: LLM (chat agent), image/video generation, etc.
  - If the provider supports both, one connection is enough.
  - At least one provider with **LLM** is required to use the chat agent.

- Once a provider is connected:
  - At the top, there’s a **Workflow Switcher** with “+ New Workflow”.
  - Screen split:
    - **Left:** empty **Node Graph Canvas**.
    - **Right:** **Chat Agent panel**.

### 2. Creating the First Flow

User types: _“make me a cinematic cyberpunk portrait.”_

- Agent (LLM from provider) parses request → creates graph diff.
- **Node Graph** shows: Prompt Node → Image Gen Node → Output Node.
- Agent explains the action in chat.
- Preview thumbnail appears inline.

### 3. Iterating with Chat → Graph

User: _“turn this into a 10-second video with neon lights in the background.”_

- Agent updates graph with Video Gen + Background Replace nodes.
- Execution routed automatically to a provider that supports video generation.
- New preview shown in chat.

### 4. Running Workflows with Queue

- User clicks **Run** to execute the workflow.
- Each click enqueues a **Job** bound to the current graph snapshot.
- Jobs appear in the **Execution Queue**.
- The queue supports multiple concurrent jobs (default max concurrency = 5).
- When a job finishes, outputs are saved to the Media Manager and linked back to chat.

### 5. Using the Media Manager

User clicks **Media Manager**.

- Opens fullscreen overlay like iOS Photos.
- Default: **All Media view** — dense grid of all outputs.
- Zoom slider: switch between all/month/day views.
- Search “mountain” → instantly find older asset.
- Drag old output into Node Graph as new Input Node.

### 6. Organizing Work

- Multi-select outputs → tag them as “Cyberpunk Reel”.
- Grouped into folder inside Media Manager.
- Filter by workflow + tag later to review.

### 7. Switching Workflows

- Click Workflow Switcher → “+ New Workflow”.
- Fresh graph + chat, but Media Manager remains global.

### 8. Transparency + Control

- Nodes can be tweaked manually (sliders, dropdowns).
- Graph rewiring possible.
- Execution queue visible with status, ETA, cost.
- Queue concurrency configurable (default 5).
- Graph History shows all changes.

### 9. Outcome

- Multiple workflows (Cyberpunk Reel + Fantasy Map).
- Media Manager full of reusable, tagged assets.
- Graphs explainable + reproducible, built through chat.
- Providers abstracted away: user can use RunPod, OpenRouter, Fal, OpenAI, etc.

## 📦 Component List

### Layout

- `app-layout.tsx` → Main app shell (graph + chat + media dock).
- `workflow-tabs.tsx` → Switch between workflows.

### Graph

- `node-graph-canvas.tsx` → Main graph surface.
- `graph-node.tsx` → Generic node component.
- `node-params-panel.tsx` → Sliders, dropdowns, inputs for node configuration.
- `graph-history.tsx` → Timeline of changes to the graph.

### Chat

- `agent-chat.tsx` → Chat interface with LLM agent.
- `chat-message.tsx` → Individual chat bubble (supports inline previews).
- `chat-diff-card.tsx` → Shows graph updates caused by chat command.

### Media Manager

- `media-manager.tsx` → Fullscreen overlay with grid/timeline.
- `media-grid.tsx` → Default all-media grid.
- `media-zoom-slider.tsx` → Pinch/slider to zoom views (day/week/month).
- `media-preview-modal.tsx` → Full preview of a single asset.
- `media-filters-panel.tsx` → Filters (tags, workflow, type).
- `media-folder-list.tsx` → Folders + tags management.

### Execution + Feedback

- `execution-queue.tsx` → Shows running/completed jobs with ETA/cost.
- `job-toast.tsx` → Compact status notifications.

---

## ✅ Acceptance Criteria

### Node Graph Editor

- [ ] Empty canvas shown by default.
- [ ] Chat commands generate nodes on the canvas.
- [ ] Nodes auto-connect, but can be manually rewired.
- [ ] Node parameters tweakable via side panel.
- [ ] Graph auto-layout prevents overlap.

### Chat Agent

- [ ] Natural language commands accepted.
- [ ] Agent responses show inline previews.
- [ ] Graph diffs displayed when nodes update.
- [ ] Clicking chat preview highlights related node.

### Media Manager

- [ ] Outputs appear in grid automatically.
- [ ] Zoom between all/month/day views.
- [ ] Search by keyword or tag.
- [ ] Filter by workflow, model, type.
- [ ] Drag outputs into graph as inputs.
- [ ] Tag, favorite, and folder organization supported.

### Workflow Switcher

- [ ] Multiple workflows creatable, renameable, deletable.
- [ ] Each workflow keeps its own graph + chat history.
- [ ] Media Manager is global across workflows.

### Execution Queue

- [ ] Jobs appear in queue with ETA + cost.
- [ ] Jobs update live (pending → running → complete/failed).
- [ ] Clicking a job highlights node + output.

### History/Versioning

- [ ] Graph changes versioned; rollback possible.
- [ ] Chat preserved per workflow.
- [ ] Selecting a chat message scrolls graph to that state.

---

# 🎯 Summary

Agent-Graph Studio = **chat-driven node graphs + global media manager + multi-workflow support.**
Simple to start, customizable when needed, organized for scale.

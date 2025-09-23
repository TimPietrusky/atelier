# Agent-Graph Studio (MVP)

An AI-first media generation studio where a chat agent builds and edits a visual node graph. Backed by RunPod (LLM and image models).

## Setup

1. Install deps

\`\`\`bash
pnpm i
\`\`\`

2. Env vars

Create `.env.local`:

\`\`\`bash
RUNPOD_API_KEY=your_runpod_api_key
\`\`\`

## Models

- LLM: `qwen/qwen3-32b-awq`
- Images:
  - `bytedance/seedream-3.0`, `bytedance/seedream-4.0`, `bytedance/seedream-4.0-edit`
  - `black-forest-labs/flux-1-schnell`, `black-forest-labs/flux-1-dev`, `black-forest-labs/flux-1-kontext-dev`
  - `qwen/qwen-image`, `qwen/qwen-image-edit`

Aspect ratios: 1:1, 4:3, 3:4 (Seedream 4.0 and edit: 1:1 only with sizes 1024/1536/2048/4096).

## Endpoints

- POST `/api/chat` → Qwen3 instruct LLM (RunPod) returns explanation + graph diffs.
- POST `/api/generate-image` → supports all listed image models with ratio/size validation.

## UI

- Graph: add nodes, edit params; auto-layout; manual rewiring.
- Chat: shows agent messages and previews; applies graph diffs.
- Media Manager: grid, basic search/tags (MVP local persistence).
- Execution Queue: queued runs with status/ETA/cost (simulated costs).
- Connect Provider: local key storage for UI; server uses env.

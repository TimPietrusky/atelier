"use client";

import type { WorkflowNode } from "@/lib/workflow-engine";
import { JsonStorage, LocalStorageAdapter } from "@/lib/store/storage";

export interface ChatEntry {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  chat: ChatEntry[];
  history?: WorkflowNode[][];
  edges?: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
  viewport?: { x: number; y: number; zoom: number };
}

type WorkflowUpdate = {
  type: "add-node" | "modify-node";
  nodeType?: WorkflowNode["type"];
  nodeId?: string;
  config?: Record<string, any>;
};

type Listener = () => void;

class WorkflowStore {
  private workflows: Map<string, Workflow> = new Map();
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  private ensureInit() {
    if (this.initialized) return;
    const storage = new JsonStorage<Workflow[]>(
      new LocalStorageAdapter(),
      "workflows"
    );
    try {
      const storedArr = storage.read([]);
      if (Array.isArray(storedArr) && storedArr.length > 0) {
        storedArr.forEach((wf) => {
          // Sanitize any lingering 'running' statuses from previous sessions
          if (Array.isArray(wf.nodes)) {
            wf.nodes = wf.nodes.map((n: any) => ({
              ...n,
              status: n?.status === "running" ? "idle" : n?.status || "idle",
            }));
          }
          this.workflows.set(wf.id, wf);
        });
      } else {
        // Only seed defaults on the client to avoid SSR hydration mismatch
        if (typeof window !== "undefined") {
          const defaultWorkflow: Workflow = {
            id: "workflow-a",
            name: "Workflow A",
            nodes: [
              {
                id: "prompt-1",
                type: "prompt",
                title: "Prompt",
                status: "idle",
                position: { x: 100, y: 200 },
                config: { prompt: "Create a cinematic cyberpunk portrait" },
              },
              {
                id: "image-gen-1",
                type: "image-gen",
                title: "Image",
                status: "idle",
                position: { x: 400, y: 200 },
                config: {
                  model: "black-forest-labs/flux-1-schnell",
                  ratio: "3:4",
                  steps: 30,
                  guidance: 7.5,
                },
              },
            ],
            history: [],
            chat: [],
          };
          this.workflows.set(defaultWorkflow.id, defaultWorkflow);
        }
      }
    } catch {
      // ignore
    }
    this.initialized = true;
  }

  private persist() {
    const arr = Array.from(this.workflows.values());
    const storage = new JsonStorage<Workflow[]>(
      new LocalStorageAdapter(),
      "workflows"
    );
    storage.write(arr);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    // Never persist transient 'running' statuses; coerce to 'idle' before write
    const arr = Array.from(this.workflows.values()).map((wf) => ({
      ...wf,
      nodes: wf.nodes.map((n) => ({
        ...n,
        status: n.status === "running" ? "idle" : n.status,
      })),
    }));
    const storage = new JsonStorage<Workflow[]>(
      new LocalStorageAdapter(),
      "workflows"
    );
    storage.write(arr);
    this.listeners.forEach((l) => l());
  }

  list(): Workflow[] {
    this.ensureInit();
    return Array.from(this.workflows.values());
  }

  get(workflowId: string): Workflow | undefined {
    this.ensureInit();
    return this.workflows.get(workflowId);
  }

  upsert(workflow: Workflow) {
    this.ensureInit();
    this.workflows.set(workflow.id, workflow);
    this.notify();
  }

  create(name: string): Workflow {
    this.ensureInit();
    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const wf: Workflow = { id, name, nodes: [], chat: [] };
    this.workflows.set(id, wf);
    this.notify();
    return wf;
  }

  rename(workflowId: string, name: string) {
    const wf = this.get(workflowId);
    if (!wf) return;
    wf.name = name;
    this.notify();
  }

  remove(workflowId: string) {
    this.workflows.delete(workflowId);
    this.notify();
  }

  setNodes(workflowId: string, nodes: WorkflowNode[]) {
    const wf = this.get(workflowId);
    if (!wf) return;
    wf.nodes = nodes;
    this.notify();
  }

  setEdges(workflowId: string, edges: Workflow["edges"]) {
    const wf = this.get(workflowId);
    if (!wf) return;
    wf.edges = edges || [];
    this.notify();
  }

  setViewport(workflowId: string, viewport: Workflow["viewport"]) {
    const wf = this.get(workflowId);
    if (!wf) return;
    wf.viewport = viewport || { x: 0, y: 0, zoom: 1 };
    this.notify();
  }

  updateNodeConfig(
    workflowId: string,
    nodeId: string,
    config: Record<string, any>
  ) {
    const wf = this.get(workflowId);
    if (!wf) return;
    const n = wf.nodes.find((x) => x.id === nodeId);
    if (!n) return;
    n.config = { ...(n.config || {}), ...config };
    this.notify();
  }

  updateNodeResult(
    workflowId: string,
    nodeId: string,
    result: WorkflowNode["result"]
  ) {
    const wf = this.get(workflowId);
    if (!wf) return;
    const n = wf.nodes.find((x) => x.id === nodeId);
    if (!n) return;
    n.result = result;
    n.status = "complete";
    this.notify();
  }

  updateNodeStatus(
    workflowId: string,
    nodeId: string,
    status: WorkflowNode["status"]
  ) {
    const wf = this.get(workflowId);
    if (!wf) return;
    const n = wf.nodes.find((x) => x.id === nodeId);
    if (!n) return;
    n.status = status;
    this.notify();
  }

  applyUpdates(workflowId: string, updates: WorkflowUpdate[]) {
    const wf = this.get(workflowId);
    if (!wf) return;

    // snapshot before changes
    wf.history = wf.history || [];
    wf.history.push(this.deepCloneNodes(wf.nodes));

    for (const u of updates) {
      if (u.type === "add-node" && u.nodeType) {
        const id = `${u.nodeType}-${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}`;
        const newNode: WorkflowNode = {
          id,
          type: u.nodeType,
          title: this.titleForType(u.nodeType),
          status: "idle",
          position: this.randomPosition(),
          config: u.config || {},
        };
        wf.nodes.push(newNode);
      }
      if (u.type === "modify-node" && u.nodeId) {
        const n = wf.nodes.find((x) => x.id === u.nodeId);
        if (n) {
          n.config = { ...(n.config || {}), ...(u.config || {}) };
        }
      }
    }

    this.notify();
  }

  rollbackLast(workflowId: string) {
    const wf = this.get(workflowId);
    if (!wf || !wf.history || wf.history.length === 0) return;
    const prev = wf.history.pop()!;
    wf.nodes = this.deepCloneNodes(prev);
    this.notify();
  }

  private titleForType(type: WorkflowNode["type"]): string {
    switch (type) {
      case "prompt":
        return "Prompt";
      case "image-gen":
        return "Image";
      case "image-edit":
        return "Image Edit";
      case "video-gen":
        return "Video Generation";
      case "background-replace":
        return "Background Replace";
      // 'output' node removed for now
    }
  }

  private randomPosition() {
    const count = Array.from(this.workflows.values()).reduce(
      (sum, wf) => sum + wf.nodes.length,
      0
    );
    const spacingX = 260;
    const spacingY = 160;
    const col = count % 3;
    const row = Math.floor(count / 3);
    return { x: 120 + col * spacingX, y: 140 + row * spacingY };
  }

  private deepCloneNodes(nodes: WorkflowNode[]): WorkflowNode[] {
    return nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      status: n.status,
      position: { x: n.position.x, y: n.position.y },
      inputs: n.inputs ? [...n.inputs] : undefined,
      outputs: n.outputs ? [...n.outputs] : undefined,
      config: n.config ? JSON.parse(JSON.stringify(n.config)) : undefined,
      result: n.result
        ? {
            type: n.result.type,
            data: n.result.data,
            metadata: n.result.metadata ? { ...n.result.metadata } : undefined,
          }
        : undefined,
    }));
  }
}

export const workflowStore = new WorkflowStore();

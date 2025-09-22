export interface WorkflowNode {
  id: string;
  type: "prompt" | "image-gen" | "video-gen" | "background-replace" | "output";
  title: string;
  status: "idle" | "running" | "complete" | "error";
  position: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
  config?: Record<string, any>;
  result?: {
    type: "text" | "image" | "video";
    data: string;
    metadata?: Record<string, any>;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "queued" | "running" | "completed" | "failed";
  startTime?: Date;
  endTime?: Date;
  currentNodeId?: string;
  progress: number;
  estimatedCost: number;
  actualCost?: number;
  error?: string;
}

export interface ExecutionQueue {
  id: string;
  workflowId: string;
  priority: number;
  estimatedDuration: number;
  estimatedCost: number;
  createdAt: Date;
}

export class WorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map();
  private queue: ExecutionQueue[] = [];
  private isProcessing = false;
  private maxConcurrency = 5;
  private runningCount = 0;

  async executeWorkflow(
    workflowId: string,
    nodes: WorkflowNode[]
  ): Promise<string> {
    const executionId = `exec_${Date.now()}`;

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: "queued",
      progress: 0,
      estimatedCost: this.calculateEstimatedCost(nodes),
    };

    this.executions.set(executionId, execution);

    // Add to queue
    this.queue.push({
      id: executionId,
      workflowId,
      priority: 1,
      estimatedDuration: this.calculateEstimatedDuration(nodes),
      estimatedCost: execution.estimatedCost,
      createdAt: new Date(),
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return executionId;
  }

  private async processQueue() {
    if (this.runningCount >= this.maxConcurrency) return;
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const queueItem = this.queue.shift()!;
    const execution = this.executions.get(queueItem.id)!;

    this.runningCount++;
    (async () => {
      try {
        execution.status = "running";
        execution.startTime = new Date();
        await this.runWorkflowExecution(execution);
        execution.status = "completed";
        execution.endTime = new Date();
        execution.progress = 100;
      } catch (error) {
        execution.status = "failed";
        execution.error =
          error instanceof Error ? error.message : "Unknown error";
        execution.endTime = new Date();
      } finally {
        this.runningCount--;
        setTimeout(() => this.processQueue(), 50);
      }
    })();

    // Try to start more if capacity remains
    if (this.runningCount < this.maxConcurrency) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private async runWorkflowExecution(execution: WorkflowExecution) {
    const workflow = this.getWorkflowById(execution.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const nodes = workflow.nodes;
    const totalSteps = nodes.length;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      execution.progress = ((i + 1) / totalSteps) * 100;
      execution.currentNodeId = node.id;
      (node as any).workflowId = execution.workflowId;

      try {
        await this.executeNode(node);
        node.status = "complete";
      } catch (error) {
        node.status = "error";
        throw error;
      }

      // persist node updates to localStorage so UI reflects changes
      this.persistWorkflowNodes(execution.workflowId, nodes);

      // Small delay between nodes
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  private async executeNode(node: WorkflowNode) {
    switch (node.type) {
      case "prompt":
        await this.executePromptNode(node);
        break;
      case "image-gen":
        await this.executeImageGenNode(node);
        break;
      case "video-gen":
        await this.executeVideoGenNode(node);
        break;
      case "background-replace":
        await this.executeBackgroundReplaceNode(node);
        break;
      default:
        // Output and other nodes don't need execution
        break;
    }
  }

  private async executePromptNode(node: WorkflowNode) {
    // Pass-through: just capture the user's typed prompt as text result
    const text = String(node.config?.prompt || "");
    node.result = {
      type: "text",
      data: text,
      metadata: { timestamp: new Date().toISOString() },
    };
    try {
      const { workflowStore } = await import("@/lib/store/workflows");
      const wfId = (node as any).workflowId as string | undefined;
      if (wfId) {
        workflowStore.updateNodeResult(wfId, node.id, node.result);
      }
    } catch {}
  }

  private async executeImageGenNode(node: WorkflowNode) {
    // Determine prompt: prefer node's own config.prompt; otherwise use first prompt node in workflow
    let prompt: string | undefined = node.config?.prompt;
    if (!prompt) {
      const wfId = (node as any).workflowId as string | undefined;
      if (wfId) {
        const wf = this.getWorkflowById(wfId) as { nodes?: any[] } | undefined;
        const p = wf?.nodes?.find((n: any) => n.type === "prompt");
        prompt = p?.config?.prompt || p?.result?.data;
      }
    }
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt || "A beautiful image",
        model: node.config?.model || "black-forest-labs/flux-1-schnell",
        ratio: node.config?.ratio || "1:1",
        width: node.config?.width,
        height: node.config?.height,
        steps: node.config?.steps,
        guidance: node.config?.guidance,
        seed: node.config?.seed,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error("Image generation failed");
    }

    node.result = {
      type: "image",
      data: result.imageUrl,
      metadata: {
        executionId: result.executionId,
        model: node.config?.model || "black-forest-labs/flux-1-schnell",
        timestamp: new Date().toISOString(),
      },
    };

    // Save to media manager (best effort)
    try {
      const { mediaStore } = await import("@/lib/store/media");
      mediaStore.add({
        id: `asset_${Date.now()}`,
        type: "image",
        url: result.imageUrl,
        title: (node.config?.prompt as string) || "Image Output",
        tags: [],
        createdAt: new Date().toISOString(),
        modelId: node.config?.model || "black-forest-labs/flux-1-schnell",
        width: node.config?.width,
        height: node.config?.height,
        workflowId: "" + (node as any).workflowId,
        nodeId: node.id,
        executionId: result.executionId,
      });
    } catch (_) {
      // ignore store errors
    }

    // Notify workflow store so UI updates
    try {
      const { workflowStore } = await import("@/lib/store/workflows");
      const wfId = (node as any).workflowId as string | undefined;
      if (wfId) {
        workflowStore.updateNodeResult(wfId, node.id, node.result);
      }
    } catch {}
  }

  private async executeVideoGenNode(node: WorkflowNode) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate processing time

    node.result = {
      type: "video",
      data: "/cyberpunk-video-animation.jpg", // Placeholder
      metadata: {
        duration: node.config?.duration || 10,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async executeBackgroundReplaceNode(node: WorkflowNode) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    node.result = {
      type: "image",
      data: "/fantasy-map-watercolor.jpg", // Placeholder
      metadata: {
        operation: "background-replace",
        timestamp: new Date().toISOString(),
      },
    };
  }

  private getWorkflowById(workflowId: string) {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("workflows")
          : null;
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ id: string; nodes: any[] }>;
        const wf = arr.find((w) => w.id === workflowId);
        if (wf) return wf as any;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  private persistWorkflowNodes(workflowId: string, nodes: WorkflowNode[]) {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("workflows");
      if (!raw) return;
      const arr = JSON.parse(raw) as Array<{ id: string; nodes: any[] }>;
      const idx = arr.findIndex((w) => w.id === workflowId);
      if (idx >= 0) {
        const cloned = nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          status: n.status,
          position: { x: n.position.x, y: n.position.y },
          inputs: n.inputs,
          outputs: n.outputs,
          config: n.config ? JSON.parse(JSON.stringify(n.config)) : undefined,
          result: n.result
            ? {
                type: n.result.type,
                data: n.result.data,
                metadata: n.result.metadata
                  ? { ...n.result.metadata }
                  : undefined,
              }
            : undefined,
        }));
        (arr[idx] as any).nodes = cloned;
        window.localStorage.setItem("workflows", JSON.stringify(arr));
      }
    } catch {
      // ignore
    }
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  getQueue(): ExecutionQueue[] {
    return [...this.queue];
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === "running") {
      execution.status = "failed";
      execution.error = "Cancelled by user";
      execution.endTime = new Date();
      return true;
    }
    return false;
  }

  pauseExecution(executionId: string): boolean {
    // Implementation for pausing execution
    const execution = this.executions.get(executionId);
    if (execution && execution.status === "running") {
      // In a real implementation, this would pause the current operation
      return true;
    }
    return false;
  }

  resumeExecution(executionId: string): boolean {
    // Implementation for resuming execution
    const execution = this.executions.get(executionId);
    if (execution) {
      // In a real implementation, this would resume the paused operation
      return true;
    }
    return false;
  }

  private calculateEstimatedCost(nodes: WorkflowNode[]): number {
    let cost = 0;

    nodes.forEach((node) => {
      switch (node.type) {
        case "prompt":
          cost += 0.01; // $0.01 for LLM processing
          break;
        case "image-gen":
          cost += 0.05; // $0.05 for image generation
          break;
        case "video-gen":
          cost += 0.25; // $0.25 for video generation
          break;
        case "background-replace":
          cost += 0.03; // $0.03 for background processing
          break;
        default:
          cost += 0.001; // Minimal cost for other operations
      }
    });

    return Math.round(cost * 100) / 100;
  }

  private calculateEstimatedDuration(nodes: WorkflowNode[]): number {
    let duration = 0;

    nodes.forEach((node) => {
      switch (node.type) {
        case "prompt":
          duration += 5; // 5 seconds for LLM
          break;
        case "image-gen":
          duration += 30; // 30 seconds for image generation
          break;
        case "video-gen":
          duration += 120; // 2 minutes for video generation
          break;
        case "background-replace":
          duration += 15; // 15 seconds for background processing
          break;
        default:
          duration += 1; // 1 second for other operations
      }
    });

    return duration;
  }
}

// Global workflow engine instance
export const workflowEngine = new WorkflowEngine();

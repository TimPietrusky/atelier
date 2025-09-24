"use client";

import { useCallback, useState, useEffect } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { workflowStore } from "@/lib/store/workflows";
import { CanvasToolbar } from "@/components/canvas-toolbar";
import { AddNodeDialog } from "@/components/add-node-dialog";
import { FlowCanvas } from "@/components/flow-canvas";
import { makeSolidEdge } from "@/lib/flow/utils";
import { NODE_TYPES } from "@/lib/nodes/config";
import { PromptNode as PromptNodeExt } from "@/components/nodes/prompt-node";
import { ImageNode as ImageNodeExt } from "@/components/nodes/image-node";
import { CustomNode as CustomNodeExt } from "@/components/nodes/custom-node";

interface NodeGraphCanvasProps {
  activeWorkflow: string;
  onExecute?: () => void;
  executionStatus?: "idle" | "running" | "paused";
  onStatusChange?: (status: "idle" | "running" | "paused") => void;
  queueCount?: number;
}

export function NodeGraphCanvas({
  activeWorkflow,
  onExecute,
  executionStatus = "idle",
  onStatusChange,
  queueCount = 0,
}: NodeGraphCanvasProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = makeSolidEdge(params);
      setEdges((eds) => addEdge(newEdge, eds));
      // Persist in a microtask to avoid cross-component update during render
      queueMicrotask(() => {
        const wf = workflowStore.get(activeWorkflow);
        if (wf) {
          const updated = [...((wf.edges as any) || []), newEdge] as any;
          workflowStore.setEdges(activeWorkflow, updated);
        }
      });
    },
    [setEdges, activeWorkflow]
  );

  const addNewNode = useCallback(
    (nodeType: string) => {
      const nodeTypeMap = {
        prompt: {
          type: "promptNode",
          title: "Prompt",
          config: { prompt: "" },
        },
        "image-gen": {
          type: "imageGenNode",
          title: "Image",
          config: { model: "black-forest-labs/flux-1-schnell", steps: 30 },
        },
        // image-edit node intentionally hidden – single Image node handles both
        "video-gen": {
          type: "customNode",
          title: "Video Gen",
          config: { duration: 10, fps: 24 },
        },
        "background-replace": {
          type: "customNode",
          title: "Background Replace",
          config: { background_prompt: "" },
        },
      };

      const nodeConfig = nodeTypeMap[nodeType as keyof typeof nodeTypeMap];
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeConfig.type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 200 + 150,
        },
        width: 256,
        data: {
          type: nodeType,
          title: nodeConfig.title,
          status: "idle",
          config: nodeConfig.config,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      // Persist to store
      const wf = workflowStore.get(activeWorkflow);
      if (wf) {
        workflowStore.setNodes(activeWorkflow, [
          ...wf.nodes,
          {
            id: newNode.id,
            type: nodeType as any,
            title: String(newNode.data.title),
            status: "idle" as const,
            position: newNode.position as any,
            config: newNode.data.config as Record<string, any>,
            size: { width: 256, height: 0 },
          },
        ]);
      }
      setIsAddNodeModalOpen(false);
    },
    [setNodes, activeWorkflow]
  );

  const handleRun = () => {
    onExecute?.();
  };

  const nodeTypeConfig = NODE_TYPES;

  const nodeTypes = {
    promptNode: PromptNodeExt,
    imageGenNode: ImageNodeExt,
    customNode: CustomNodeExt,
  };

  const proOptions = { hideAttribution: true };

  // Persist node position changes
  const onNodesChangeHandler = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      // Update positions in store
      const positionChanges = changes.filter(
        (c) => c.type === "position" && c.dragging === false
      );
      if (positionChanges.length > 0) {
        // Defer store writes to next tick to avoid setState during render warnings
        setTimeout(() => {
          const wf = workflowStore.get(activeWorkflow);
          if (wf) {
            const updatedNodes = wf.nodes.map((n) => {
              const change = positionChanges.find((c) => c.id === n.id);
              if (change && change.position) {
                return { ...n, position: change.position };
              }
              return n;
            });
            workflowStore.setNodes(activeWorkflow, updatedNodes);
          }
        }, 0);
      }

      // Update sizes in store when resize ends
      const resizeChanges = changes.filter((c) => c.type === "dimensions");
      if (resizeChanges.length > 0) {
        setTimeout(() => {
          const wf = workflowStore.get(activeWorkflow);
          if (!wf) return;
          resizeChanges.forEach((c: any) => {
            const node = nodes.find((n) => n.id === c.id);
            if (
              node &&
              typeof node.width === "number" &&
              typeof node.height === "number"
            ) {
              // update in the source of truth (workflow store) so it's persisted and wins on re-hydration
              workflowStore.updateNodeDimensions(
                activeWorkflow,
                c.id,
                undefined,
                { width: node.width, height: node.height }
              );
            }
          });
        }, 0);
      }

      // Persist removals (nodes deleted via UI)
      const removed = changes
        .filter((c) => c.type === "remove")
        .map((c) => c.id as string);
      if (removed.length > 0) {
        setTimeout(() => {
          const wf = workflowStore.get(activeWorkflow);
          if (!wf) return;
          const remainingNodes = wf.nodes.filter(
            (n) => !removed.includes(n.id)
          );
          const remainingNodeIds = new Set(remainingNodes.map((n) => n.id));
          const remainingEdges = (wf.edges || []).filter(
            (e) =>
              remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
          );
          workflowStore.setNodes(activeWorkflow, remainingNodes as any);
          workflowStore.setEdges(activeWorkflow, remainingEdges as any);
        }, 0);
      }
    },
    [onNodesChange, activeWorkflow]
  );

  useEffect(() => {
    const unsub = workflowStore.subscribe(() => {
      const wf = workflowStore.get(activeWorkflow);
      if (!wf) return;
      const mapped: Node[] = wf.nodes.map((n) => ({
        id: n.id,
        type:
          n.type === "prompt"
            ? "promptNode"
            : n.type === "image-gen" || n.type === "image-edit"
            ? "imageGenNode"
            : "customNode",
        position: n.position,
        width: (n as any).size?.width ?? undefined,
        height:
          (n as any).size?.height && (n as any).size?.height > 0
            ? (n as any).size?.height
            : undefined,
        data: {
          type: n.type,
          title: n.title,
          status: n.status,
          config: n.config,
          onChange: (cfg: Record<string, any>) =>
            workflowStore.updateNodeConfig(activeWorkflow, n.id, cfg),
          result: n.result,
        },
      }));
      setNodes(mapped);
      if (wf.edges)
        setEdges(
          (wf.edges as any).map((e: any) => ({
            ...e,
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        );
    });
    // Hydrate initial state on mount (CSR only) to avoid SSR mismatch
    const wf0 = workflowStore.get(activeWorkflow);
    if (wf0) {
      const mapped0: Node[] = wf0.nodes.map((n) => ({
        id: n.id,
        type:
          n.type === "prompt"
            ? "promptNode"
            : n.type === "image-gen" || n.type === "image-edit"
            ? "imageGenNode"
            : "customNode",
        position: n.position,
        width: (n as any).size?.width ?? undefined,
        height:
          (n as any).size?.height && (n as any).size?.height > 0
            ? (n as any).size?.height
            : undefined,
        data: {
          type: n.type,
          title: n.title,
          status: n.status,
          config: n.config,
          onChange: (cfg: Record<string, any>) =>
            workflowStore.updateNodeConfig(activeWorkflow, n.id, cfg),
          result: n.result,
        },
      }));
      setNodes(mapped0);
      if (wf0.edges)
        setEdges(
          (wf0.edges as any).map((e: any) => ({
            ...e,
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        );
    }
    const handleError = (event: ErrorEvent) => {
      if (
        event.message.includes(
          "ResizeObserver loop completed with undelivered notifications"
        )
      ) {
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes(
          "ResizeObserver loop completed with undelivered notifications"
        )
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      unsub();
    };
  }, []);

  // Handle edge deletion
  const onEdgesChangeHandler = useCallback(
    (changes: any[]) => {
      onEdgesChange(changes);
      // Update edges in store after any change (including deletions)
      setTimeout(() => {
        setEdges((currentEdges) => {
          queueMicrotask(() =>
            workflowStore.setEdges(activeWorkflow, currentEdges as any)
          );
          return currentEdges;
        });
      }, 0);
    },
    [onEdgesChange, activeWorkflow]
  );

  const onMoveEnd = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      workflowStore.setViewport(activeWorkflow, viewport);
    },
    [activeWorkflow]
  );

  return (
    <div className="h-full w-full relative bg-background">
      <CanvasToolbar
        queueCount={queueCount}
        onRun={handleRun}
        onOpenAdd={setIsAddNodeModalOpen}
        addDialog={
          <AddNodeDialog
            open={isAddNodeModalOpen}
            onOpenChange={setIsAddNodeModalOpen}
            nodeTypes={nodeTypeConfig}
            onAdd={addNewNode}
          />
        }
      />

      {/* React Flow Canvas */}
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Grid3X3, Activity } from "lucide-react";
import { WorkflowSwitcher } from "@/components/workflow-switcher";
import { NodeGraphCanvas } from "@/components/node-graph-canvas";
import { MediaManager } from "@/components/media-manager";
import { ExecutionQueue } from "@/components/execution-queue";
import { ConnectProvider } from "@/components/connect-provider";
import { workflowStore } from "@/lib/store/workflows";
import { workflowEngine } from "@/lib/workflow-engine";
import { getKV, putKV } from "@/lib/store/db";

export default function StudioDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
  const [isExecutionQueueOpen, setIsExecutionQueueOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "running" | "paused"
  >("idle");
  const [queueCount, setQueueCount] = useState(0);

  const handleRun = () => {
    if (!activeWorkflow) return;
    const wf = workflowStore.get(activeWorkflow);
    if (wf) {
      workflowEngine.executeWorkflow(wf.id, wf.nodes);
      // update immediately after enqueue so footer shows correct count instantly
      setQueueCount(workflowEngine.getActiveJobsCount());
      // force a small UI tick to refresh node statuses quickly
      try {
        const next = workflowStore.get(activeWorkflow);
        workflowStore.upsert({ ...(next as any) });
      } catch {}
    }
  };

  useEffect(() => {
    // Faster polling for snappy UI; also update on visibilitychange instantly
    const update = () => {
      try {
        setQueueCount(workflowEngine.getActiveJobsCount());
      } catch {}
    };
    const interval = setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!activeWorkflow) return;
    (async () => {
      try {
        await putKV("lastActiveWorkflowId", activeWorkflow);
      } catch {}
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("active-workflow-id", activeWorkflow);
      }
    })();
  }, [activeWorkflow]);

  // On mount, ensure active workflow points to the last active one.
  // Prefer sessionStorage (most recent) then Dexie KV, then first available.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { useWorkflowStore } = require("@/lib/store/workflows-zustand");
        await useWorkflowStore.getState().hydrate();

        if (cancelled) return;

        const ws = useWorkflowStore.getState().workflows;

        // Seed default workflow if none exist - atomic check and set
        const seeded = await getKV<boolean>("seeded");
        if (Object.keys(ws).length === 0 && !seeded) {
          // Set flag FIRST to prevent race condition from Strict Mode double-invoke
          await putKV("seeded", true);

          if (cancelled) return;

          const id = useWorkflowStore.getState().createWorkflow("Workflow A");
          useWorkflowStore.getState().setNodes(id, []);
          useWorkflowStore.getState().setEdges(id, []);
        }

        if (cancelled) return;

        const ids = Object.keys(useWorkflowStore.getState().workflows);
        let savedSession: string | null = null;
        if (typeof window !== "undefined") {
          savedSession = window.sessionStorage.getItem("active-workflow-id");
        }
        let savedKv: string | null = null;
        try {
          const kvSaved = await getKV<string>("lastActiveWorkflowId");
          savedKv = kvSaved || null;
        } catch {}
        const preferred =
          savedSession && ws[savedSession] ? savedSession : savedKv;
        const candidate =
          preferred && ws[preferred] ? preferred : ids[0] || null;
        setActiveWorkflow(candidate);
      } catch {}
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-rainbow">atelier</h1>
          </div>

          {activeWorkflow ? (
            <WorkflowSwitcher
              activeWorkflow={activeWorkflow}
              onWorkflowChange={setActiveWorkflow}
            />
          ) : (
            <div className="w-48 h-9 rounded-md bg-muted/50 animate-pulse" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExecutionQueueOpen(!isExecutionQueueOpen)}
            className="gap-2 border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(64,224,208,0.3)] transition-all duration-300"
          >
            <span>queue</span>
            <Badge
              variant={queueCount > 0 ? "default" : "secondary"}
              className={`min-w-[24px] h-5 flex items-center justify-center px-1.5 font-mono text-xs ${
                queueCount > 0
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {queueCount}
            </Badge>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Empty space where run button used to be */}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Panel - Node Graph Canvas */}
        <div className="flex-1 relative">
          {activeWorkflow && (
            <NodeGraphCanvas
              activeWorkflow={activeWorkflow}
              onExecute={handleRun}
              executionStatus={executionStatus}
              onStatusChange={setExecutionStatus}
              queueCount={queueCount}
            />
          )}
        </div>
      </div>

      {/* Bottom Bar (hidden) */}
      <footer className="hidden border-t border-border bg-card/50 backdrop-blur-sm px-6 py-3" />

      {/* Media Manager Overlay */}
      {isMediaManagerOpen && (
        <MediaManager onClose={() => setIsMediaManagerOpen(false)} />
      )}

      {/* Execution Queue Overlay */}
      <ExecutionQueue
        isOpen={isExecutionQueueOpen}
        onClose={() => setIsExecutionQueueOpen(false)}
      />

      {/* Connect Provider */}
      <ConnectProvider open={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </div>
  );
}

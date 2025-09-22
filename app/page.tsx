"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Database, Grid3X3, Activity } from "lucide-react";
import { WorkflowSwitcher } from "@/components/workflow-switcher";
import { NodeGraphCanvas } from "@/components/node-graph-canvas";
import { ChatAgent } from "@/components/chat-agent";
import { MediaManager } from "@/components/media-manager";
import { ExecutionQueue } from "@/components/execution-queue";
import { ConnectProvider } from "@/components/connect-provider";
import { workflowStore } from "@/lib/store/workflows";
import { workflowEngine } from "@/lib/workflow-engine";

export default function StudioDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState("workflow-a");
  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
  const [isExecutionQueueOpen, setIsExecutionQueueOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "running" | "paused"
  >("idle");
  const [queueCount, setQueueCount] = useState(0);

  const handleRun = () => {
    const wf = workflowStore.get(activeWorkflow);
    if (wf) {
      workflowEngine.executeWorkflow(wf.id, wf.nodes);
      // do not open modal; just increment counter based on engine state
      setQueueCount(workflowEngine.getQueue().length);
    }
    // button is stateless for queueing
  };

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setQueueCount(workflowEngine.getQueue().length);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("active-workflow-id", activeWorkflow);
    }
  }, [activeWorkflow]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rainbow rounded-lg flex items-center justify-center shadow-rainbow">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-rainbow">AI Studio</h1>
          </div>

          <WorkflowSwitcher
            activeWorkflow={activeWorkflow}
            onWorkflowChange={setActiveWorkflow}
          />
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 hover:border-primary bg-transparent"
            onClick={() => setIsConnectOpen(true)}
          >
            <Settings className="w-4 h-4" />
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
          <NodeGraphCanvas
            activeWorkflow={activeWorkflow}
            onExecute={handleRun}
            executionStatus={executionStatus}
            onStatusChange={setExecutionStatus}
            queueCount={queueCount}
          />
        </div>

        {/* Right Panel - Chat Agent */}
        <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm">
          <ChatAgent />
        </div>
      </div>

      {/* Bottom Bar */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMediaManagerOpen(true)}
            className="gap-2 border-primary/30 hover:border-primary hover:shadow-rainbow transition-all duration-300"
          >
            <Database className="w-4 h-4" />
            Media
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExecutionQueueOpen(true)}
            className="gap-2 border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(64,224,208,0.3)] transition-all duration-300"
          >
            <Activity className="w-4 h-4" />
            Queue ({queueCount})
          </Button>

          <div className="text-sm text-muted-foreground" />
        </div>
      </footer>

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

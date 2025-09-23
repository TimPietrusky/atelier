"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  DollarSign,
  Play,
  Pause,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { workflowEngine, type WorkflowExecution } from "@/lib/workflow-engine";

interface ExecutionQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutionQueueComponent({
  isOpen,
  onClose,
}: ExecutionQueueProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    // Populate immediately for instant feedback, then poll
    setExecutions(workflowEngine.getAllExecutions());
    setQueue(workflowEngine.getQueue());
    if (!isOpen) return;
    const interval = setInterval(() => {
      setExecutions(workflowEngine.getAllExecutions());
      setQueue(workflowEngine.getQueue());
    }, 300);
    return () => clearInterval(interval);
  }, [isOpen]);

  const getStatusIcon = (status: WorkflowExecution["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "running":
        return <Play className="w-4 h-4 text-primary animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: WorkflowExecution["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-destructive";
      case "running":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[70vh] bg-card flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-card-foreground">
              Execution Queue
            </h2>
            <Badge variant="outline">
              {queue.length} queued •{" "}
              {executions.filter((e) => e.status === "running").length} running
            </Badge>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Current Executions */}
          <div className="flex-1 p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">
              Active Executions
            </h3>

            <ScrollArea className="h-full">
              <div className="space-y-4">
                {executions.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No executions yet</p>
                  </div>
                ) : (
                  executions.map((execution) => (
                    <Card key={execution.id} className="p-4 bg-background">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <span className="font-medium text-card-foreground">
                            Workflow {execution.workflowId}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {execution.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          {execution.status === "running" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  workflowEngine.pauseExecution(execution.id)
                                }
                              >
                                <Pause className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  workflowEngine.cancelExecution(execution.id)
                                }
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {execution.status === "running" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              Progress
                            </span>
                            <span className="text-card-foreground">
                              {Math.round(execution.progress)}%
                            </span>
                          </div>
                          <Progress
                            value={execution.progress}
                            className="h-2"
                          />
                          {execution.currentNodeId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Processing: {execution.currentNodeId}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {formatCost(
                                execution.actualCost || execution.estimatedCost
                              )}
                            </span>
                          </div>

                          {execution.startTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {execution.endTime
                                  ? formatDuration(
                                      Math.floor(
                                        (execution.endTime.getTime() -
                                          execution.startTime.getTime()) /
                                          1000
                                      )
                                    )
                                  : formatDuration(
                                      Math.floor(
                                        (Date.now() -
                                          execution.startTime.getTime()) /
                                          1000
                                      )
                                    )}
                              </span>
                            </div>
                          )}
                        </div>

                        {execution.error && (
                          <span className="text-destructive text-xs">
                            {execution.error}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Queue */}
          <div className="w-80 border-l border-border p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">
              Queue
            </h3>

            <ScrollArea className="h-full">
              <div className="space-y-3">
                {queue.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Queue is empty
                    </p>
                  </div>
                ) : (
                  queue.map((item, index) => (
                    <Card key={item.id} className="p-3 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-card-foreground">
                          #{index + 1}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Priority {item.priority}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        Workflow {item.workflowId}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(item.estimatedDuration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>{formatCost(item.estimatedCost)}</span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="text-muted-foreground">
                Total Cost:{" "}
                <span className="text-card-foreground font-medium">
                  {formatCost(
                    executions.reduce(
                      (sum, e) => sum + (e.actualCost || e.estimatedCost),
                      0
                    )
                  )}
                </span>
              </span>

              <span className="text-muted-foreground">
                Completed:{" "}
                <span className="text-card-foreground font-medium">
                  {executions.filter((e) => e.status === "completed").length}
                </span>
              </span>

              <span className="text-muted-foreground">
                Failed:{" "}
                <span className="text-card-foreground font-medium">
                  {executions.filter((e) => e.status === "failed").length}
                </span>
              </span>
            </div>

            <Button variant="outline" size="sm">
              Clear Completed
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export { ExecutionQueueComponent as ExecutionQueue };

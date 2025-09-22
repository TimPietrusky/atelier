"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Workflow } from "lucide-react";
import { workflowStore, type Workflow } from "@/lib/store/workflows";

interface WorkflowSwitcherProps {
  activeWorkflow: string;
  onWorkflowChange: (workflow: string) => void;
}

export function WorkflowSwitcher({
  activeWorkflow,
  onWorkflowChange,
}: WorkflowSwitcherProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      const wf = workflowStore.create(newWorkflowName);
      setNewWorkflowName("");
      setIsCreateDialogOpen(false);
      setWorkflows(workflowStore.list());
      onWorkflowChange(wf.id);
    }
  };

  useEffect(() => {
    setWorkflows(workflowStore.list());
    const unsub = workflowStore.subscribe(() =>
      setWorkflows(workflowStore.list())
    );
    return () => unsub();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Select value={activeWorkflow} onValueChange={onWorkflowChange}>
        <SelectTrigger className="w-48 bg-background">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {workflows.map((workflow) => (
            <SelectItem key={workflow.id} value={workflow.id}>
              {workflow.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateWorkflow}>Create Workflow</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

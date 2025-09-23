"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Play } from "lucide-react";
import { ReactNode } from "react";

export interface ToolbarNodeType {
  id: string;
  title: string;
  icon: any;
  description: string;
}

export function CanvasToolbar({
  queueCount = 0,
  onRun,
  onOpenAdd,
  addDialog,
}: {
  queueCount?: number;
  onRun: () => void;
  onOpenAdd: (open: boolean) => void;
  addDialog: ReactNode;
}) {
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-card/95 backdrop-blur-md border border-border/50 rounded-md shadow-lg hover:shadow-rainbow transition-all duration-300 px-2 py-2">
      <div className="flex items-center gap-3">
        <Button
          onClick={onRun}
          className="gap-2 px-6 py-2 rounded-md font-medium transition-all duration-300 bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
        >
          <Play className="w-4 h-4" />
          run
        </Button>
        {queueCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {queueCount} queued
          </Badge>
        )}
        <div className="w-px h-6 bg-border/50" />
        {addDialog}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shapes, Play } from "lucide-react";
import type { CSSProperties } from "react";

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
  style,
}: {
  queueCount?: number;
  onRun: () => void;
  onOpenAdd: (open: boolean) => void;
  style?: CSSProperties;
}) {
  return (
    <div className="rounded-md shadow-lg relative" style={style}>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <Button
            onClick={onRun}
            className="gap-2 flex-1 min-h-0 w-full flex items-center justify-center rounded-md font-medium transition-all duration-300 bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] py-0"
          >
            <Play className="w-4 h-4" />
            run
          </Button>
          <Button
            onClick={() => onOpenAdd(true)}
            className="gap-2 flex-1 min-h-0 w-full flex items-center justify-center bg-black rounded-md border border-border/50 hover:border-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 text-white py-0"
          >
            <Shapes className="w-4 h-4" />
            add
          </Button>
        </div>
      </div>
    </div>
  );
}

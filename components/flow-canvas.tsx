"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ConnectionMode,
  ConnectionLineType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";

export function FlowCanvas({
  children,
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onMoveEnd,
  onAddNode,
}: {
  children?: ReactNode;
  nodes: any[];
  edges: any[];
  nodeTypes: Record<string, any>;
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onMoveEnd: any;
  onAddNode?: () => void;
}) {
  const proOptions = { hideAttribution: true } as const;
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView={false}
      className="bg-background rf-panel-tight"
      connectionMode={ConnectionMode.Loose}
      connectionRadius={30}
      connectOnClick
      nodesConnectable
      elementsSelectable
      deleteKeyCode={["Backspace", "Delete"] as any}
      fitViewOptions={{ padding: 0.2 }}
      snapToGrid
      snapGrid={[8, 8]}
      connectionLineType={ConnectionLineType.Bezier}
      connectionLineStyle={{ stroke: "#e5e7eb", strokeWidth: 2 }}
      defaultEdgeOptions={
        { type: "default", style: { stroke: "#e5e7eb", strokeWidth: 2 } } as any
      }
      proOptions={proOptions as any}
      colorMode="dark"
      onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
      onError={() => {}}
    >
      {children}
      <Panel
        position="top-left"
        className="!p-1.5 bg-card/90 backdrop-blur-sm rounded-md"
      >
        <div className="flex items-stretch gap-1.5">
          <Controls
            className="backdrop-blur-sm border-border/0 [&>button]:text-foreground [&>button]:hover:bg-muted [&>button]:bg-transparent [&>button]:border-0 [&>button>svg]:text-foreground [&>button]:w-2 [&>button]:h-2 [&>button]:p-0 [&>button>svg]:w-3 [&>button>svg]:h-3 grid grid-cols-2 gap-0 p-0.5 bg-transparent px-0 py-0 border-0"
            style={{ position: "static", height: "auto" }}
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          <MiniMap
            className="bg-card/90 backdrop-blur-sm border border-border/50 rounded"
            nodeColor="#ff0080"
            style={{ position: "static", width: 60, height: 42 }}
          />
          {onAddNode && (
            <Button
              onClick={onAddNode}
              className="h-[42px] px-2 gap-1.5 bg-black rounded border border-border/50 hover:border-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 text-white text-xs"
            >
              add
              <Grid3X3 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </Panel>
      <Background
        variant={BackgroundVariant.Dots}
        gap={30}
        size={1}
        color="rgba(255, 0, 128, 0.2)"
      />
    </ReactFlow>
  );
}

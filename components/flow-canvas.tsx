"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode } from "react";

export function FlowCanvas({
  children,
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onMoveEnd,
}: {
  children?: ReactNode;
  nodes: any[];
  edges: any[];
  nodeTypes: Record<string, any>;
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onMoveEnd: any;
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
      className="bg-background"
      connectionLineType={"smoothstep" as any}
      connectionLineStyle={{ stroke: "#e5e7eb", strokeWidth: 2 }}
      proOptions={proOptions as any}
      colorMode="dark"
      onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
      onError={() => {}}
    >
      {children}
      <Controls className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-md [&>button]:text-foreground [&>button]:hover:bg-muted [&>button]:bg-transparent [&>button]:border-border/50 [&>button>svg]:text-foreground" />
      <MiniMap
        className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-md"
        nodeColor="#ff0080"
      />
      <Background
        variant={BackgroundVariant.Dots}
        gap={30}
        size={1}
        color="rgba(255, 0, 128, 0.2)"
      />
    </ReactFlow>
  );
}

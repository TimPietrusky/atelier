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
      <Panel position="bottom-left" className="!p-3">
        <div className="flex items-end gap-3">
          <Controls
            className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-md [&>button]:text-foreground [&>button]:hover:bg-muted [&>button]:bg-transparent [&>button]:border-border/50 [&>button>svg]:text-foreground"
            style={{ position: "static", height: 105 }}
          />
          <MiniMap
            className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-md"
            nodeColor="#ff0080"
            style={{ position: "static", height: 105 }}
          />
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

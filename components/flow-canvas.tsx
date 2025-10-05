"use client"

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ConnectionMode,
  ConnectionLineType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ReactNode } from "react"

export function FlowCanvas({
  children,
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onMoveEnd,
  onPaneDoubleClick,
  defaultViewport,
}: {
  children?: ReactNode
  nodes: any[]
  edges: any[]
  nodeTypes: Record<string, any>
  onNodesChange: any
  onEdgesChange: any
  onConnect: any
  isValidConnection?: any
  onMoveEnd: any
  onPaneDoubleClick?: (position: { x: number; y: number }) => void
  defaultViewport?: { x: number; y: number; zoom: number }
}) {
  const proOptions = { hideAttribution: true } as const
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
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
      defaultEdgeOptions={{ type: "default", style: { stroke: "#e5e7eb", strokeWidth: 2 } } as any}
      proOptions={proOptions as any}
      colorMode="dark"
      defaultViewport={defaultViewport as any}
      onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
      onPaneClick={(e: any) => {
        if (e.detail === 2 && onPaneDoubleClick) {
          onPaneDoubleClick({ x: e.clientX, y: e.clientY })
        }
      }}
      zoomOnDoubleClick={false}
      onError={() => {}}
    >
      {children}
      <Background
        variant={BackgroundVariant.Dots}
        gap={30}
        size={1}
        color="rgba(255, 0, 128, 0.2)"
      />
    </ReactFlow>
  )
}

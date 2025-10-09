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
  onNodeClick,
  onPaneClick,
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
  onNodeClick?: (nodeId: string) => void
  onPaneClick?: () => void
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
      connectionLineStyle={{ stroke: "var(--border-strong)", strokeWidth: 1.5 }}
      defaultEdgeOptions={
        { type: "default", style: { stroke: "var(--border-strong)", strokeWidth: 1.5 } } as any
      }
      proOptions={proOptions as any}
      colorMode="dark"
      defaultViewport={defaultViewport as any}
      onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
      onPaneClick={(e: any) => {
        if (e.detail === 2 && onPaneDoubleClick) {
          onPaneDoubleClick({ x: e.clientX, y: e.clientY })
        } else if (e.detail === 1) {
          onPaneClick?.()
        }
      }}
      zoomOnDoubleClick={false}
      onError={() => {}}
    >
      {children}
      <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="var(--border)" />
    </ReactFlow>
  )
}

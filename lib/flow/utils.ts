import type { Connection } from "@xyflow/react";

export function makeSolidEdge(params: Connection) {
  return {
    ...params,
    id: `edge-${params.source}-${params.target}-${Date.now()}`,
    type: "default",
    style: { stroke: "#e5e7eb", strokeWidth: 2 },
    animated: false,
  } as any;
}

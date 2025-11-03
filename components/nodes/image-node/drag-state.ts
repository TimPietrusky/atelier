/**
 * Global drag state for image nodes
 * Tracks which node an image is being dragged from
 */

let dragSourceNodeId: string | null = null

export const dragState = {
  setDragSource: (nodeId: string | null) => {
    dragSourceNodeId = nodeId
    // Dispatch custom event so all nodes can react
    window.dispatchEvent(
      new CustomEvent("image-drag-state-changed", { detail: { sourceNodeId: nodeId } })
    )
  },
  getDragSource: () => dragSourceNodeId,
  isFromSameNode: (nodeId: string) => dragSourceNodeId === nodeId,
}


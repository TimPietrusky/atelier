"use client"

interface DropZoneProps {
  isVisible: boolean
  activeTab: "model" | "source"
}

export function DropZone({ isVisible, activeTab }: DropZoneProps) {
  if (!isVisible) return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        border: "2px solid var(--node-image)",
        backgroundColor: "var(--node-image)",
        opacity: 0.15,
        zIndex: 10,
        pointerEvents: "none",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <span
        className="text-sm font-medium px-4 py-2 rounded"
        style={{
          color: "var(--node-image)",
          backgroundColor: "var(--background)",
          border: "1px solid var(--node-image)",
        }}
      >
        {activeTab === "model" ? "drop to add to source" : "drop image here"}
      </span>
    </div>
  )
}


import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Handle, Position, NodeResizer } from "@xyflow/react"
import { Settings2, ChevronDown } from "lucide-react"
import { ReactNode, forwardRef } from "react"

interface NodeContainerProps {
  nodeType?: "prompt" | "image-gen"
  isRunning?: boolean
  isSelected?: boolean
  children: ReactNode
  handles?: {
    target?: { id: string; className?: string; style?: Record<string, any> }
    source?: { id: string; className?: string; style?: Record<string, any> }
  }
}

export const NodeContainer = forwardRef<HTMLDivElement, NodeContainerProps>(
  ({ nodeType, isRunning, isSelected, children, handles }, ref) => {
    return (
      <Card
        ref={ref}
        className={`w-full h-full min-w-[16rem] p-3 border rounded-none bg-[var(--surface)] relative flex flex-col ${
          isRunning ? "" : isSelected ? "" : "hover:border-[var(--border-strong)]"
        }`}
        style={{
          borderColor: isRunning
            ? "var(--status-running)"
            : isSelected
            ? nodeType === "prompt"
              ? "var(--node-prompt-muted)"
              : "var(--node-image-muted)"
            : "var(--border)",
          boxShadow: isRunning
            ? "0 0 8px color-mix(in srgb, var(--status-running) 15%, transparent)"
            : isSelected
            ? nodeType === "prompt"
              ? "0 0 0 1px color-mix(in srgb, var(--node-prompt-muted) 20%, transparent)"
              : "0 0 0 1px color-mix(in srgb, var(--node-image-muted) 20%, transparent)"
            : "none",
        }}
      >
        <NodeResizer
          minWidth={220}
          minHeight={120}
          handleClassName="!w-3 !h-3"
          lineClassName="!border-0"
        />
        {handles?.target && (
          <Handle
            type="target"
            position={Position.Left}
            id={handles.target.id}
            className={handles.target.className}
            style={{
              ...(handles.target.style || {}),
              pointerEvents: "auto",
              zIndex: 10000,
            }}
          />
        )}
        {handles?.source && (
          <Handle
            type="source"
            position={Position.Right}
            id={handles.source.id}
            className={handles.source.className}
            style={{
              ...(handles.source.style || {}),
              pointerEvents: "auto",
              zIndex: 10000,
            }}
          />
        )}
        {children}
      </Card>
    )
  }
)
NodeContainer.displayName = "NodeContainer"

interface NodeHeaderProps {
  icon: ReactNode
  title: string
  actions?: ReactNode
  onSettingsClick?: () => void
}

export function NodeHeader({ icon, title, actions, onSettingsClick }: NodeHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
      <div className="flex items-center gap-1 ml-auto">
        {actions}
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
            onClick={onSettingsClick}
            title="Settings"
          >
            <Settings2 className="w-3 h-3 text-[var(--text-secondary)]" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface NodeContentProps {
  children: ReactNode
}

export function NodeContent({ children }: NodeContentProps) {
  return <div className="flex-1 flex flex-col overflow-hidden min-h-0">{children}</div>
}

interface NodeSettingsProps {
  isExpanded: boolean
  onExpandedChange: (expanded: boolean) => void
  showMeta: boolean
  onShowMetaChange: (show: boolean) => void
  metaData?: any
  children?: ReactNode
}

export function NodeSettings({
  isExpanded,
  onExpandedChange,
  showMeta,
  onShowMetaChange,
  metaData,
  children,
}: NodeSettingsProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
      <CollapsibleContent className="space-y-2 mt-2">
        {children}
        <div className="pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-full justify-start text-xs"
            onClick={() => onShowMetaChange(!showMeta)}
          >
            <ChevronDown
              className={`w-3 h-3 mr-2 transition-transform ${showMeta ? "rotate-180" : ""}`}
            />
            Debug Info
          </Button>
          {showMeta && metaData && (
            <pre className="text-[10px] bg-muted/40 p-2 rounded border border-border/50 overflow-auto max-h-40 mt-2">
              {JSON.stringify(metaData, null, 2)}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

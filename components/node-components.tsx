import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import { Settings2, ChevronDown } from "lucide-react";
import { ReactNode } from "react";

interface NodeContainerProps {
  isRunning?: boolean;
  isSelected?: boolean;
  children: ReactNode;
  handles?: {
    target?: { id: string; className?: string; style?: Record<string, any> };
    source?: { id: string; className?: string; style?: Record<string, any> };
  };
}

export function NodeContainer({
  isRunning,
  isSelected,
  children,
  handles,
}: NodeContainerProps) {
  return (
    <Card
      className={`w-full min-w-[16rem] p-3 border ${
        isRunning
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
          : "border-border/50 hover:border-primary"
      } bg-card/90 backdrop-blur-sm transition-all duration-300 relative`}
    >
      <NodeResizer
        isVisible={!!isSelected}
        minWidth={220}
        minHeight={120}
        color="#e5e7eb"
        autoScale
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          pointerEvents: "auto",
        }}
        lineStyle={{ pointerEvents: "none" }}
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
  );
}

interface NodeHeaderProps {
  icon: ReactNode;
  title: string;
  actions?: ReactNode;
  onSettingsClick?: () => void;
}

export function NodeHeader({
  icon,
  title,
  actions,
  onSettingsClick,
}: NodeHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-medium text-card-foreground">{title}</span>
      <div className="flex items-center gap-1 ml-auto">
        {actions}
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onSettingsClick}
            title="Settings"
          >
            <Settings2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface NodeContentProps {
  children: ReactNode;
}

export function NodeContent({ children }: NodeContentProps) {
  return <div className="space-y-2 overflow-hidden">{children}</div>;
}

interface NodeSettingsProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showMeta: boolean;
  onShowMetaChange: (show: boolean) => void;
  metaData?: any;
  children?: ReactNode;
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
              className={`w-3 h-3 mr-2 transition-transform ${
                showMeta ? "rotate-180" : ""
              }`}
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
  );
}

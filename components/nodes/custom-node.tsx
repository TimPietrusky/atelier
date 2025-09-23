"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  NodeContainer,
  NodeHeader,
  NodeContent,
  NodeSettings,
} from "@/components/node-components";
import { Settings2, Video, Wand2 } from "lucide-react";

export function CustomNode({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "video-gen":
        return Video;
      case "background-replace":
        return Wand2;
      default:
        return Settings2;
    }
  };

  const getNodeIconColor = (type: string) => {
    switch (type) {
      case "video-gen":
        return "text-orange-500";
      case "background-replace":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const Icon = getNodeIcon(data.type);
  const isRunning = data.status === "running";

  const metaData = {
    id: data.id,
    type: data.type,
    schema: {
      inputs: [{ name: "input", type: "any", optional: true }],
      outputs: [{ name: "output", type: "any" }],
    },
    inputs: data.result?.metadata?.inputsUsed,
    config: data.config,
    result: data.result,
  };

  return (
    <NodeContainer
      isRunning={isRunning}
      isSelected={selected}
      handles={{
        target: {
          id: `${data.type}-input`,
          className: "w-3 h-3 bg-accent border-2 border-background",
        },
      }}
    >
      <NodeHeader
        icon={<Icon className={`w-3 h-3 ${getNodeIconColor(data.type)}`} />}
        title={data.title}
        onSettingsClick={() => setIsExpanded((v) => !v)}
      />

      <NodeContent>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs border-primary/30">
            {data.status}
          </Badge>
        </div>

        {data.config && (
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {Object.entries(data.config)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="text-accent">{key}:</span> {String(value)}
                </div>
              ))}
          </div>
        )}

        <NodeSettings
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          showMeta={showMeta}
          onShowMetaChange={setShowMeta}
          metaData={metaData}
        />
      </NodeContent>
    </NodeContainer>
  );
}


"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  NodeContainer,
  NodeHeader,
  NodeContent,
  NodeSettings,
} from "@/components/node-components";

export function PromptNode({
  data,
  id,
  selected,
}: {
  data: any;
  id: string;
  selected?: boolean;
}) {
  const [prompt, setPrompt] = useState(data.config?.prompt || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  useEffect(() => {
    setPrompt(data.config?.prompt || "");
  }, [data.config?.prompt]);

  const isRunning = data.status === "running";

  const metaData = {
    id,
    type: data.type,
    schema: {
      inputs: [],
      outputs: [{ name: "text", type: "text" }],
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
          id: "prompt-input",
          className: "w-3 h-3 bg-accent border-2 border-background",
        },
        source: {
          id: "prompt-output",
          className:
            "w-4 h-4 bg-primary border-2 border-background hover:bg-primary/80 transition-colors !right-[-8px]",
          style: { background: "#ff0080" },
        },
      }}
    >
      <NodeHeader
        icon={<MessageSquare className="w-3 h-3 text-blue-500" />}
        title="prompt"
        onSettingsClick={() => setIsExpanded((v) => !v)}
      />

      <NodeContent>
        <Textarea
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => {
            const val = e.target.value;
            setPrompt(val);
            try {
              if (data?.onChange) data.onChange({ prompt: val });
            } catch {}
          }}
          className="min-h[120px] min-h-[120px] text-sm bg-input border-border/50 p-2"
        />

        <NodeSettings
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          showMeta={showMeta}
          onShowMetaChange={setShowMeta}
          metaData={metaData}
        >
          <div>
            <label className="text-xs text-muted-foreground">Temperature</label>
            <Input
              type="number"
              defaultValue="0.7"
              step="0.1"
              min="0"
              max="2"
              className="h-6 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Tokens</label>
            <Input type="number" defaultValue="150" className="h-6 text-xs" />
          </div>
        </NodeSettings>
      </NodeContent>
    </NodeContainer>
  );
}

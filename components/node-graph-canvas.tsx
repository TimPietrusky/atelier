"use client";

import { useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/card";
import { workflowStore } from "@/lib/store/workflows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { getImageModelMeta } from "@/lib/config";
import { idbPutImage, idbGetImage, idbDeleteImage } from "@/lib/store/idb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  ImageIcon,
  ImagePlus,
  X,
  Video,
  Wand2,
  Settings2,
  Plus,
  ChevronDown,
  Play,
} from "lucide-react";

const PromptNode = ({ data, id }: { data: any; id: string }) => {
  const [prompt, setPrompt] = useState(data.config?.prompt || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  // Keep local state in sync with store updates
  useEffect(() => {
    setPrompt(data.config?.prompt || "");
  }, [data.config?.prompt]);

  const isRunning = data.status === "running";
  return (
    <Card
      className={`w-64 p-3 border ${
        isRunning
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
          : "border-border/50 hover:border-primary"
      } bg-card/90 backdrop-blur-sm transition-all duration-300 relative`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        className="w-3 h-3 bg-accent border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-output"
        className="w-4 h-4 bg-primary border-2 border-background hover:bg-primary/80 transition-colors !right-[-8px]"
        style={{ background: "#ff0080" }}
      />

      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-card-foreground">Prompt</span>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded((v) => !v)}
            title="Settings"
          >
            <Settings2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => {
            const val = e.target.value;
            setPrompt(val);
            // Persist immediately to workflow store/localStorage
            try {
              if (data?.onChange) data.onChange({ prompt: val });
            } catch {}
          }}
          className="min-h-[60px] text-xs bg-input border-border/50"
        />

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-2 mt-2">
            <div>
              <label className="text-xs text-muted-foreground">
                Temperature
              </label>
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
              <label className="text-xs text-muted-foreground">
                Max Tokens
              </label>
              <Input type="number" defaultValue="150" className="h-6 text-xs" />
            </div>
            <div className="pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-full justify-start text-xs"
                onClick={() => setShowMeta((v) => !v)}
              >
                <ChevronDown
                  className={`w-3 h-3 mr-2 transition-transform ${
                    showMeta ? "rotate-180" : ""
                  }`}
                />
                Debug Info
              </Button>
              {showMeta && (
                <pre className="text-[10px] bg-muted/40 p-2 rounded border border-border/50 overflow-auto max-h-40 mt-2">
                  {JSON.stringify(
                    {
                      id,
                      type: data.type,
                      schema: {
                        inputs: [],
                        outputs: [{ name: "text", type: "text" }],
                      },
                      inputs: data.result?.metadata?.inputsUsed,
                      config: data.config,
                      result: data.result,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};

const ImageGenNode = ({ data, id }: { data: any; id: string }) => {
  const [model, setModel] = useState(
    data.config?.model || "black-forest-labs/flux-1-schnell"
  );
  const meta = getImageModelMeta(model);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const imageUrl: string | undefined =
    data?.result?.type === "image" ? data?.result?.data : undefined;
  const isRunning = data.status === "running";
  const [localImage, setLocalImage] = useState<string | undefined>(
    data.config?.localImage || undefined
  );
  const mode: string =
    data.config?.mode ||
    (data.config?.localImageRef || data.config?.localImage
      ? "uploaded"
      : "generate");
  const isUploadedImage = mode === "uploaded";

  // Hydrate local image from IndexedDB if we only have a ref
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (
          !localImage &&
          data.config?.localImageRef &&
          typeof indexedDB !== "undefined"
        ) {
          const url = await idbGetImage(data.config.localImageRef);
          if (!cancelled && url) setLocalImage(url);
        } else if (
          data.config?.localImage &&
          !data.config?.localImageRef &&
          typeof indexedDB !== "undefined"
        ) {
          // Migrate existing inline data URL into IDB to avoid localStorage bloat
          const key = `img_${id}`;
          await idbPutImage(key, data.config.localImage);
          if (!cancelled) setLocalImage(data.config.localImage);
          data?.onChange?.({
            localImageRef: key,
            localImage: undefined,
            mode: "uploaded",
          });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [id, data.config?.localImageRef, data.config?.localImage]);

  return (
    <Card
      className={`w-64 p-3 border ${
        isRunning
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
          : "border-border/50 hover:border-primary"
      } bg-card/90 backdrop-blur-sm transition-all duration-300 relative`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="w-4 h-4 bg-accent border-2 border-background hover:bg-accent/80 transition-colors !left-[-8px]"
        style={{ background: "#40e0d0" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="w-4 h-4 bg-primary border-2 border-background hover:bg-primary/80 transition-colors !right-[-8px]"
        style={{ background: "#ff0080" }}
      />

      <div className="space-y-3">
        {/* Title and Buttons Row */}
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-card-foreground">
            Image
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <label className="h-6 w-6 p-0 flex items-center justify-center cursor-pointer hover:bg-accent/20 rounded">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const url = String(reader.result);
                    setLocalImage(url);
                    try {
                      if (typeof indexedDB !== "undefined") {
                        const key = `img_${id}`;
                        await idbPutImage(key, url);
                        data?.onChange?.({
                          localImageRef: key,
                          localImage: undefined,
                          mode: "uploaded",
                        });
                      } else {
                        data?.onChange?.({ localImage: url, mode: "uploaded" });
                      }
                    } catch {
                      data?.onChange?.({ localImage: url, mode: "uploaded" });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <ImagePlus className="w-4 h-4 text-white" title="Add image" />
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded((v) => !v)}
              title="Settings"
            >
              <Settings2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {mode !== "uploaded" && (
          <div className="bg-muted/30 rounded-md px-3 py-2 border border-border/30">
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v);
                if (data?.onChange) data.onChange({ model: v });
              }}
            >
              <SelectTrigger className="w-full h-7 text-xs border-none bg-transparent p-0 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black-forest-labs/flux-1-schnell">
                  FLUX 1 Schnell
                </SelectItem>
                <SelectItem value="black-forest-labs/flux-1-dev">
                  FLUX 1 Dev
                </SelectItem>
                <SelectItem value="black-forest-labs/flux-1-kontext-dev">
                  FLUX 1 Kontext Dev
                </SelectItem>
                <SelectItem value="bytedance/seedream-3.0">
                  Seedream 3.0
                </SelectItem>
                <SelectItem value="bytedance/seedream-4.0">
                  Seedream 4.0
                </SelectItem>
                <SelectItem value="bytedance/seedream-4.0-edit">
                  Seedream 4.0 Edit
                </SelectItem>
                <SelectItem value="qwen/qwen-image">Qwen Image</SelectItem>
                <SelectItem value="qwen/qwen-image-edit">
                  Qwen Image Edit
                </SelectItem>
              </SelectContent>
            </Select>
            {data?.hasImageInput && meta && meta.kind !== "img2img" && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                An input image is connected — consider selecting an edit model.
              </div>
            )}
          </div>
        )}

        {/* Image Display Area */}
        <div className="space-y-2">
          {imageUrl && (
            <div className="relative overflow-hidden rounded border group">
              <img
                src={imageUrl || "/placeholder.svg"}
                alt="Node output"
                className="w-full h-auto object-contain"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  // Clear the generated image result
                  data?.onChange?.({ result: undefined });
                }}
                title="Remove generated image"
              >
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          )}
          {!imageUrl && localImage && (
            <div className="relative overflow-hidden rounded border group">
              <img
                src={localImage || "/placeholder.svg"}
                alt="Local image"
                className="w-full h-auto object-contain"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  (async () => {
                    try {
                      if (
                        data.config?.localImageRef &&
                        typeof indexedDB !== "undefined"
                      ) {
                        await idbDeleteImage(data.config.localImageRef);
                      }
                    } catch {}
                    setLocalImage(undefined);
                    data?.onChange?.({
                      localImage: undefined,
                      localImageRef: undefined,
                      mode: "generate",
                    });
                  })();
                }}
                title="Remove image"
              >
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          )}
          {!imageUrl && !localImage && (
            <div className="h-32 border-2 border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground/50">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <span className="text-xs">Image</span>
              </div>
            </div>
          )}

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-2 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Load local image
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="h-7 text-xs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = String(reader.result);
                      setLocalImage(url);
                      data?.onChange?.({ localImage: url });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Steps</label>
                <Input
                  type="number"
                  defaultValue="30"
                  min="1"
                  max="150"
                  className="h-6 text-xs"
                  onChange={(e) =>
                    data?.onChange?.({ steps: Number(e.target.value) })
                  }
                />
              </div>
              {meta?.supportsGuidance && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    CFG Scale
                  </label>
                  <Input
                    type="number"
                    defaultValue="7.5"
                    step="0.5"
                    min="1"
                    max="20"
                    className="h-6 text-xs"
                    onChange={(e) =>
                      data?.onChange?.({ guidance: Number(e.target.value) })
                    }
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">
                  Resolution
                </label>
                <Select
                  defaultValue="1024x1024"
                  onValueChange={(v) => {
                    const [w, h] = v.split("x").map(Number);
                    data?.onChange?.({ width: w, height: h });
                  }}
                >
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="512x512">512x512</SelectItem>
                    <SelectItem value="768x768">768x768</SelectItem>
                    <SelectItem value="1024x1024">1024x1024</SelectItem>
                    <SelectItem value="1024x768">1024x768</SelectItem>
                    <SelectItem value="768x1024">768x1024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Seed</label>
                <Input
                  type="number"
                  placeholder="Random"
                  className="h-6 text-xs"
                  onChange={(e) =>
                    data?.onChange?.({ seed: Number(e.target.value) })
                  }
                />
              </div>
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-full justify-start text-xs"
                  onClick={() => setShowMeta((v) => !v)}
                >
                  <ChevronDown
                    className={`w-3 h-3 mr-2 transition-transform ${
                      showMeta ? "rotate-180" : ""
                    }`}
                  />
                  Debug Info
                </Button>
                {showMeta && (
                  <pre className="text-[10px] bg-muted/40 p-2 rounded border border-border/50 overflow-auto max-h-40 mt-2">
                    {JSON.stringify(
                      {
                        id,
                        type: data.type,
                        schema: {
                          inputs: [
                            { name: "prompt", type: "text", optional: true },
                            { name: "image", type: "image", optional: true },
                          ],
                          outputs: [{ name: "image", type: "image" }],
                        },
                        inputs: data.result?.metadata?.inputsUsed,
                        config: data.config,
                        result: data.result,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
};

const CustomNode = ({ data }: { data: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "video-gen":
        return Video;
      case "background-replace":
        return Wand2;
      // 'output' node type removed for now
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
      case "running":
        return "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]";
      case "error":
        return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      default:
        return "bg-muted";
    }
  };

  const Icon = getNodeIcon(data.type);

  const isRunning = data.status === "running";
  return (
    <Card
      className={`w-52 p-3 border ${
        isRunning
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
          : "border-border/50 hover:border-primary"
      } bg-card/90 backdrop-blur-sm transition-all duration-300`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={`${data.type}-input`}
        className="w-3 h-3 bg-accent border-2 border-background"
      />
      {/* generic output handle kept for custom types; removed 'output' type */}

      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-3 h-3 rounded-full ${getStatusColor(data.status)}`}
        />
        <Icon className={`w-4 h-4 ${getNodeIconColor(data.type)}`} />
        <span className="text-sm font-medium text-card-foreground">
          {data.title}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-primary/20 ml-auto"
          onClick={() => setIsExpanded((v) => !v)}
          title="Settings"
        >
          <Settings2 className="w-3 h-3" />
        </Button>
      </div>

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

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-2 mt-2">
          <div className="pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-full justify-start text-xs"
              onClick={() => setShowMeta((v) => !v)}
            >
              <ChevronDown
                className={`w-3 h-3 mr-2 transition-transform ${
                  showMeta ? "rotate-180" : ""
                }`}
              />
              Debug Info
            </Button>
            {showMeta && (
              <pre className="text-[10px] bg-muted/40 p-2 rounded border border-border/50 overflow-auto max-h-40 mt-2">
                {JSON.stringify(
                  {
                    id: data.id,
                    type: data.type,
                    schema: {
                      inputs: [{ name: "input", type: "any", optional: true }],
                      outputs: [{ name: "output", type: "any" }],
                    },
                    inputs: data.result?.metadata?.inputsUsed,
                    config: data.config,
                    result: data.result,
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

interface NodeGraphCanvasProps {
  activeWorkflow: string;
  onExecute?: () => void;
  executionStatus?: "idle" | "running" | "paused";
  onStatusChange?: (status: "idle" | "running" | "paused") => void;
  queueCount?: number;
}

export function NodeGraphCanvas({
  activeWorkflow,
  onExecute,
  executionStatus = "idle",
  onStatusChange,
  queueCount = 0,
}: NodeGraphCanvasProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: params.id || `edge-${params.source}-${params.target}-${Date.now()}`,
        style: { stroke: "#e5e7eb", strokeWidth: 2 },
        animated: false,
      } as any;
      setEdges((eds) => addEdge(newEdge, eds));
      // Persist in a microtask to avoid cross-component update during render
      queueMicrotask(() => {
        const wf = workflowStore.get(activeWorkflow);
        if (wf) {
          const updated = [...((wf.edges as any) || []), newEdge] as any;
          workflowStore.setEdges(activeWorkflow, updated);
        }
      });
    },
    [setEdges, activeWorkflow]
  );

  const addNewNode = useCallback(
    (nodeType: string) => {
      const nodeTypeMap = {
        prompt: {
          type: "promptNode",
          title: "Prompt",
          config: { prompt: "" },
        },
        "image-gen": {
          type: "imageGenNode",
          title: "Image",
          config: { model: "black-forest-labs/flux-1-schnell", steps: 30 },
        },
        // image-edit node intentionally hidden – single Image node handles both
        "video-gen": {
          type: "customNode",
          title: "Video Gen",
          config: { duration: 10, fps: 24 },
        },
        "background-replace": {
          type: "customNode",
          title: "Background Replace",
          config: { background_prompt: "" },
        },
      };

      const nodeConfig = nodeTypeMap[nodeType as keyof typeof nodeTypeMap];
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeConfig.type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 200 + 150,
        },
        data: {
          type: nodeType,
          title: nodeConfig.title,
          status: "idle",
          config: nodeConfig.config,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      // Persist to store
      const wf = workflowStore.get(activeWorkflow);
      if (wf) {
        workflowStore.setNodes(activeWorkflow, [
          ...wf.nodes,
          {
            id: newNode.id,
            type: nodeType as any,
            title: newNode.data.title,
            status: "idle",
            position: newNode.position as any,
            config: newNode.data.config,
          },
        ]);
      }
      setIsAddNodeModalOpen(false);
    },
    [setNodes, activeWorkflow]
  );

  const handleRun = () => {
    onExecute?.();
  };

  const nodeTypeConfig = [
    {
      id: "prompt",
      title: "Prompt",
      icon: MessageSquare,
      description: "Text input for AI generation",
    },
    {
      id: "image-gen",
      title: "Image",
      icon: ImageIcon,
      description: "Generate images from text prompts",
    },
    // Hidden: Image Edit – Image node covers both txt2img and img2img
    {
      id: "video-gen",
      title: "Video Generation",
      icon: Video,
      description: "Create videos from prompts or images",
    },
    {
      id: "background-replace",
      title: "Background Replace",
      icon: Wand2,
      description: "Replace image backgrounds",
    },
  ];

  const nodeTypes = {
    promptNode: PromptNode,
    imageGenNode: ImageGenNode,
    customNode: CustomNode,
  };

  const proOptions = { hideAttribution: true };

  // Persist node position changes
  const onNodesChangeHandler = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      // Update positions in store
      const positionChanges = changes.filter(
        (c) => c.type === "position" && c.dragging === false
      );
      if (positionChanges.length > 0) {
        // Defer store writes to next tick to avoid setState during render warnings
        setTimeout(() => {
          const wf = workflowStore.get(activeWorkflow);
          if (wf) {
            const updatedNodes = wf.nodes.map((n) => {
              const change = positionChanges.find((c) => c.id === n.id);
              if (change && change.position) {
                return { ...n, position: change.position };
              }
              return n;
            });
            workflowStore.setNodes(activeWorkflow, updatedNodes);
          }
        }, 0);
      }

      // Persist removals (nodes deleted via UI)
      const removed = changes
        .filter((c) => c.type === "remove")
        .map((c) => c.id as string);
      if (removed.length > 0) {
        setTimeout(() => {
          const wf = workflowStore.get(activeWorkflow);
          if (!wf) return;
          const remainingNodes = wf.nodes.filter(
            (n) => !removed.includes(n.id)
          );
          const remainingNodeIds = new Set(remainingNodes.map((n) => n.id));
          const remainingEdges = (wf.edges || []).filter(
            (e) =>
              remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
          );
          workflowStore.setNodes(activeWorkflow, remainingNodes as any);
          workflowStore.setEdges(activeWorkflow, remainingEdges as any);
        }, 0);
      }
    },
    [onNodesChange, activeWorkflow]
  );

  useEffect(() => {
    const unsub = workflowStore.subscribe(() => {
      const wf = workflowStore.get(activeWorkflow);
      if (!wf) return;
      const mapped: Node[] = wf.nodes.map((n) => ({
        id: n.id,
        type:
          n.type === "prompt"
            ? "promptNode"
            : n.type === "image-gen" || n.type === "image-edit"
            ? "imageGenNode"
            : "customNode",
        position: n.position,
        data: {
          type: n.type,
          title: n.title,
          status: n.status,
          config: n.config,
          onChange: (cfg: Record<string, any>) =>
            workflowStore.updateNodeConfig(activeWorkflow, n.id, cfg),
          result: n.result,
        },
      }));
      setNodes(mapped);
      if (wf.edges)
        setEdges(
          (wf.edges as any).map((e: any) => ({
            ...e,
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        );
    });
    // Hydrate initial state on mount (CSR only) to avoid SSR mismatch
    const wf0 = workflowStore.get(activeWorkflow);
    if (wf0) {
      const mapped0: Node[] = wf0.nodes.map((n) => ({
        id: n.id,
        type:
          n.type === "prompt"
            ? "promptNode"
            : n.type === "image-gen" || n.type === "image-edit"
            ? "imageGenNode"
            : "customNode",
        position: n.position,
        data: {
          type: n.type,
          title: n.title,
          status: n.status,
          config: n.config,
          onChange: (cfg: Record<string, any>) =>
            workflowStore.updateNodeConfig(activeWorkflow, n.id, cfg),
          result: n.result,
        },
      }));
      setNodes(mapped0);
      if (wf0.edges)
        setEdges(
          (wf0.edges as any).map((e: any) => ({
            ...e,
            style: { stroke: "#e5e7eb", strokeWidth: 2 },
            animated: false,
          }))
        );
    }
    const handleError = (event: ErrorEvent) => {
      if (
        event.message.includes(
          "ResizeObserver loop completed with undelivered notifications"
        )
      ) {
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes(
          "ResizeObserver loop completed with undelivered notifications"
        )
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      unsub();
    };
  }, []);

  // Handle edge deletion
  const onEdgesChangeHandler = useCallback(
    (changes: any[]) => {
      onEdgesChange(changes);
      // Update edges in store after any change (including deletions)
      setTimeout(() => {
        setEdges((currentEdges) => {
          queueMicrotask(() =>
            workflowStore.setEdges(activeWorkflow, currentEdges as any)
          );
          return currentEdges;
        });
      }, 0);
    },
    [onEdgesChange, activeWorkflow]
  );

  const onMoveEnd = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      workflowStore.setViewport(activeWorkflow, viewport);
    },
    [activeWorkflow]
  );

  return (
    <div className="h-full w-full relative bg-background">
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-card/95 backdrop-blur-md border border-border/50 rounded-md shadow-lg hover:shadow-rainbow transition-all duration-300 px-2 py-2">
        <div className="flex items-center gap-3">
          {/* Run Button */}
          <Button
            onClick={handleRun}
            className="gap-2 px-6 py-2 rounded-md font-medium transition-all duration-300 bg-white text-black hover:bg-gray-100 border-2 border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          >
            <Play className="w-4 h-4" />
            Run
          </Button>

          {queueCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {queueCount} queued
            </Badge>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-border/50" />

          {/* Add Node Button */}
          <Dialog
            open={isAddNodeModalOpen}
            onOpenChange={setIsAddNodeModalOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 px-4 py-2 rounded-md border border-border/50 hover:border-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 bg-transparent text-white"
              >
                <Plus className="w-4 h-4" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-border/50">
              <DialogHeader>
                <DialogTitle className="text-rainbow">Add New Node</DialogTitle>
                <DialogDescription>
                  Choose a node type to add to your workflow
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {nodeTypeConfig.map((nodeType) => {
                  const Icon = nodeType.icon;
                  const getIconColor = (id: string) => {
                    switch (id) {
                      case "prompt":
                        return "text-blue-500";
                      case "image-gen":
                        return "text-purple-500";
                      case "video-gen":
                        return "text-orange-500";
                      case "background-replace":
                        return "text-green-500";
                      default:
                        return "text-primary";
                    }
                  };

                  return (
                    <Button
                      key={nodeType.id}
                      variant="ghost"
                      onClick={() => addNewNode(nodeType.id)}
                      className="flex items-start gap-3 p-4 h-auto text-left hover:bg-primary/10 hover:border-primary/50 border border-transparent rounded-md transition-all duration-200"
                    >
                      <Icon
                        className={`w-5 h-5 ${getIconColor(
                          nodeType.id
                        )} mt-0.5 flex-shrink-0`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-card-foreground">
                          {nodeType.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {nodeType.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView={false}
        className="bg-background"
        connectionLineType="smoothstep"
        connectionLineStyle={{ stroke: "#e5e7eb", strokeWidth: 2 }}
        proOptions={proOptions}
        colorMode="dark"
        onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
        onError={() => {}}
      >
        {/* Solid edges; gradient removed */}

        <Controls className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-md [&>button]:text-foreground [&>button]:hover:bg-muted [&>button]:bg-transparent [&>button]:border-border/50 [&>button>svg]:text-foreground" />
        <MiniMap
          className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-md"
          nodeColor="#ff0080"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1}
          color="rgba(255, 0, 128, 0.2)"
        />
      </ReactFlow>
    </div>
  );
}

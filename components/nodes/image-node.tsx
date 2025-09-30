"use client";

import { useEffect, useState } from "react";
import { ImageIcon, ImagePlus, X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  NodeContainer,
  NodeHeader,
  NodeContent,
  NodeSettings,
} from "@/components/node-components";
import { getImageModelMeta } from "@/lib/config";
import { idbDeleteImage, idbGetImage, idbPutImage } from "@/lib/store/idb";

export function ImageNode({
  data,
  id,
  selected,
}: {
  data: any;
  id: string;
  selected?: boolean;
}) {
  const [model, setModel] = useState(
    data.config?.model || "black-forest-labs/flux-1-schnell"
  );
  const meta = getImageModelMeta(model);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const imageHistory: string[] = (data?.resultHistory || [])
    .filter((r: any) => r.type === "image")
    .map((r: any) => r.data)
    .reverse(); // Most recent first
  const isRunning = data.status === "running";
  const [localImage, setLocalImage] = useState<string | undefined>(
    data.config?.localImage || undefined
  );
  const mode: string =
    data.config?.mode ||
    (data.config?.localImageRef || data.config?.localImage
      ? "uploaded"
      : "generate");

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

  const metaData = {
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
  };

  const imageUploadAction = (
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
      <ImagePlus className="w-4 h-4 text-white" />
    </label>
  );

  return (
    <NodeContainer
      isRunning={isRunning}
      isSelected={selected}
      handles={{
        target: {
          id: "image-input",
          className:
            "w-4 h-4 bg-accent border-2 border-background hover:bg-accent/80 transition-colors !left-[-8px]",
          style: { background: "#40e0d0" },
        },
        source: {
          id: "image-output",
          className:
            "w-4 h-4 bg-primary border-2 border-background hover:bg-primary/80 transition-colors !right-[-8px]",
          style: { background: "#ff0080" },
        },
      }}
    >
      <NodeHeader
        icon={<ImageIcon className="w-3 h-3 text-purple-500" />}
        title="image"
        actions={imageUploadAction}
        onSettingsClick={() => setIsExpanded((v) => !v)}
      />

      <NodeContent>
        {mode !== "uploaded" && (
          <div className="bg-muted/30 rounded-md px-2 border border-border/30">
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v);
                if (data?.onChange) data.onChange({ model: v });
              }}
            >
              <SelectTrigger className="w-full h-7 text-sm border-none bg-transparent p-0 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
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

        {imageHistory.length > 0 && (
          <div className="space-y-2">
            {/* Clear All Button */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {imageHistory.length} image
                {imageHistory.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  data?.onChange?.({ result: undefined, resultHistory: [] });
                }}
                title="Clear all images"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 gap-2">
              {imageHistory.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative overflow-hidden rounded border group aspect-square"
                >
                  <img
                    src={url || "/placeholder.svg"}
                    alt={`Generation ${imageHistory.length - idx}`}
                    className="block w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newHistory = [...(data.resultHistory || [])];
                      newHistory.splice(imageHistory.length - 1 - idx, 1);
                      const newResult =
                        newHistory.length > 0
                          ? newHistory[newHistory.length - 1]
                          : undefined;
                      data?.onChange?.({
                        result: newResult,
                        resultHistory: newHistory,
                      });
                    }}
                    title="Remove this image"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </Button>
                  {idx === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      Latest
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {imageHistory.length === 0 && localImage && (
          <div className="relative overflow-hidden rounded border group">
            <img
              src={localImage || "/placeholder.svg"}
              alt="Local image"
              className="block w-full h-auto max-h-[320px] object-contain"
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
        {imageHistory.length === 0 && !localImage && (
          <div className="h-32 border-2 border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground/50">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span className="text-xs">Image</span>
            </div>
          </div>
        )}

        <NodeSettings
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          showMeta={showMeta}
          onShowMetaChange={setShowMeta}
          metaData={metaData}
        >
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
              <label className="text-xs text-muted-foreground">CFG Scale</label>
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
            <label className="text-xs text-muted-foreground">Resolution</label>
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
        </NodeSettings>
      </NodeContent>
    </NodeContainer>
  );
}

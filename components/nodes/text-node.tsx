"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Type, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"
import { TextAspectRatio, textRatioToDimensions } from "@/lib/config"
import { workflowStore } from "@/lib/store/workflows"
import { assetManager } from "@/lib/store/asset-manager"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const Bold = () => <span className="font-bold text-xs">B</span>
const Italic = () => <span className="italic text-xs">I</span>
const Strikethrough = () => <span className="line-through text-xs">S</span>
const Underline = () => <span className="underline text-xs">U</span>

export function TextNode({ data, id, selected }: { data: any; id: string; selected?: boolean }) {
  const workflowId = data.workflowId
  const [text, setText] = useState(data.config?.text || "Hello, world")
  const [aspectRatio, setAspectRatio] = useState<TextAspectRatio>(
    data.config?.aspectRatio || "16:9"
  )
  const [maxDimension, setMaxDimension] = useState(data.config?.maxDimension || 2048)
  const [fontFamily, setFontFamily] = useState(data.config?.fontFamily || '"Geist Mono", monospace')
  const [fontSize, setFontSize] = useState(data.config?.fontSize || 96)
  const [color, setColor] = useState(data.config?.color || "#ffffff")
  const [bgColor, setBgColor] = useState(data.config?.bgColor || "#000000")
  const [alignment, setAlignment] = useState(data.config?.alignment || "center")
  const [letterSpacing, setLetterSpacing] = useState(data.config?.letterSpacing || "0")
  const [lineHeight, setLineHeight] = useState(data.config?.lineHeight || "1.2")
  const [isBold, setIsBold] = useState(data.config?.isBold ?? false)
  const [isItalic, setIsItalic] = useState(data.config?.isItalic ?? false)
  const [isStrikethrough, setIsStrikethrough] = useState(data.config?.isStrikethrough ?? false)
  const [isUnderline, setIsUnderline] = useState(data.config?.isUnderline ?? false)

  const dimensions = useMemo(
    () => textRatioToDimensions(aspectRatio, maxDimension),
    [aspectRatio, maxDimension]
  )

  // Save config to node
  useEffect(() => {
    if (data?.onChange) {
      data.onChange({
        text,
        aspectRatio,
        maxDimension,
        fontFamily,
        fontSize,
        color,
        bgColor,
        alignment,
        letterSpacing,
        lineHeight,
        isBold,
        isItalic,
        isStrikethrough,
        isUnderline,
        textAssetRef: data.config?.textAssetRef || null,
      })
    }
  }, [
    text,
    aspectRatio,
    maxDimension,
    fontFamily,
    fontSize,
    color,
    bgColor,
    alignment,
    letterSpacing,
    lineHeight,
    isBold,
    isItalic,
    isStrikethrough,
    isUnderline,
  ])

  // Build text decoration string
  const textDecoration =
    [isUnderline ? "underline" : "", isStrikethrough ? "line-through" : ""]
      .filter(Boolean)
      .join(" ") || "none"

  const fontStyle = isItalic ? "italic" : "normal"
  const fontWeight = isBold ? "700" : "400"

  return (
    <NodeContainer
      nodeType="prompt"
      isSelected={selected}
      handles={{
        source: {
          id: "text-output",
          className:
            "w-4 h-4 border-2 border-background hover:scale-110 transition-all !right-[-8px]",
          style: { background: "var(--node-prompt)" },
        },
      }}
    >
      <NodeHeader
        icon={<Type className="w-3 h-3" style={{ color: "var(--node-prompt)" }} />}
        title="text"
        onSettingsClick={data?.onOpenInspector}
      />

      <NodeContent>
        <div className="flex flex-col gap-3 h-full">
          {/* Text input - single line */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text..."
            className="w-full px-2 py-1.5 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {/* Compact control bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Aspect ratio */}
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as TextAspectRatio)}>
              <SelectTrigger className="h-6 w-16 px-1.5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="2:3">2:3</SelectItem>
                <SelectItem value="3:2">3:2</SelectItem>
              </SelectContent>
            </Select>

            {/* Font family */}
            <Select value={fontFamily} onValueChange={(v) => setFontFamily(v)}>
              <SelectTrigger className="h-6 w-24 px-1.5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='"Geist Mono", monospace'>Geist Mono</SelectItem>
                <SelectItem value='"Arial", sans-serif'>Arial</SelectItem>
                <SelectItem value='"Times New Roman", serif'>Times</SelectItem>
                <SelectItem value='"Courier New", monospace'>Courier</SelectItem>
                <SelectItem value='"Georgia", serif'>Georgia</SelectItem>
              </SelectContent>
            </Select>

            {/* Font size slider */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground w-6">Size</label>
              <input
                type="range"
                min="12"
                max="1000"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 h-1 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">{fontSize}</span>
            </div>

            {/* Style buttons */}
            <div className="flex gap-1 border border-border rounded p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 flex items-center justify-center ${
                  isBold ? "bg-blue-600 text-white" : ""
                }`}
                onClick={() => setIsBold(!isBold)}
                title="Bold"
              >
                <Bold />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 flex items-center justify-center ${
                  isItalic ? "bg-blue-600 text-white" : ""
                }`}
                onClick={() => setIsItalic(!isItalic)}
                title="Italic"
              >
                <Italic />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 flex items-center justify-center ${
                  isStrikethrough ? "bg-blue-600 text-white" : ""
                }`}
                onClick={() => setIsStrikethrough(!isStrikethrough)}
                title="Strikethrough"
              >
                <Strikethrough />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 flex items-center justify-center ${
                  isUnderline ? "bg-blue-600 text-white" : ""
                }`}
                onClick={() => setIsUnderline(!isUnderline)}
                title="Underline"
              >
                <Underline />
              </Button>
            </div>

            {/* Alignment icons */}
            <div className="flex gap-1 border border-border rounded p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 ${alignment === "left" ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setAlignment("left")}
                title="Align left"
              >
                <AlignLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 ${alignment === "center" ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setAlignment("center")}
                title="Align center"
              >
                <AlignCenter className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-5 w-5 p-0 ${alignment === "right" ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setAlignment("right")}
                title="Align right"
              >
                <AlignRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Letter spacing slider */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">Spacing</label>
              <input
                type="range"
                min="-5"
                max="20"
                step="0.5"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(e.target.value)}
                className="w-16 h-1 cursor-pointer"
              />
            </div>

            {/* Line height slider */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">Line</label>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(e.target.value)}
                className="w-16 h-1 cursor-pointer"
              />
            </div>

            {/* Colors */}
            <div className="flex gap-1 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 cursor-pointer border border-border rounded"
                title="Text color"
              />
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-6 h-6 cursor-pointer border border-border rounded"
                title="Background color"
              />
            </div>
          </div>

          {/* SVG Preview - fill remaining space */}
          <div className="flex-1 border border-border rounded bg-muted/30 overflow-hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              className="w-full h-full"
            >
              <defs>
                <style>{`text { font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; font-style: ${fontStyle}; fill: ${color}; letter-spacing: ${letterSpacing}px; line-height: ${lineHeight}; text-decoration: ${textDecoration}; }`}</style>
              </defs>
              <rect width="100%" height="100%" fill={bgColor} />
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor={
                  alignment === "left" ? "start" : alignment === "right" ? "end" : "middle"
                }
              >
                {text.split("\n").map((line, i) => (
                  <tspan
                    key={i}
                    x={alignment === "left" ? "5%" : alignment === "right" ? "95%" : "50%"}
                    dy={i === 0 ? "0" : `${fontSize * parseFloat(lineHeight) * 0.8}px`}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </svg>
          </div>
        </div>
      </NodeContent>
    </NodeContainer>
  )
}

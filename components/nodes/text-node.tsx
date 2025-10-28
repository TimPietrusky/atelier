"use client"

import { useState, useMemo, useEffect } from "react"
import { Type } from "lucide-react"
import { NodeContainer, NodeHeader, NodeContent } from "@/components/node-components"
import { TextAspectRatio, textRatioToDimensions } from "@/lib/config"

export function TextNode({ data, id, selected }: { data: any; id: string; selected?: boolean }) {
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

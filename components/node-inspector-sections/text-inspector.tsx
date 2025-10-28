"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Download, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TextAspectRatio, textRatioToDimensions } from "@/lib/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WorkflowNode } from "@/lib/workflow-engine"

const Bold = () => <span className="font-bold text-xs">B</span>
const Italic = () => <span className="italic text-xs">I</span>
const Strikethrough = () => <span className="line-through text-xs">S</span>
const Underline = () => <span className="underline text-xs">U</span>

interface TextInspectorProps {
  node: WorkflowNode
  onChange: (config: Record<string, any>) => void
}

export function TextInspector({ node, onChange }: TextInspectorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [text, setText] = useState(node.config?.text || "Hello, world")
  const [aspectRatio, setAspectRatio] = useState<TextAspectRatio>(
    node.config?.aspectRatio || "16:9"
  )
  const [maxDimension, setMaxDimension] = useState(node.config?.maxDimension || 2048)
  const [fontFamily, setFontFamily] = useState(node.config?.fontFamily || '"Geist Mono", monospace')
  const [fontSize, setFontSize] = useState(node.config?.fontSize || 96)
  const [color, setColor] = useState(node.config?.color || "#ffffff")
  const [bgColor, setBgColor] = useState(node.config?.bgColor || "#000000")
  const [alignment, setAlignment] = useState(node.config?.alignment || "center")
  const [letterSpacing, setLetterSpacing] = useState(node.config?.letterSpacing || "0")
  const [lineHeight, setLineHeight] = useState(node.config?.lineHeight || "1.2")
  const [isBold, setIsBold] = useState(node.config?.isBold ?? false)
  const [isItalic, setIsItalic] = useState(node.config?.isItalic ?? false)
  const [isStrikethrough, setIsStrikethrough] = useState(node.config?.isStrikethrough ?? false)
  const [isUnderline, setIsUnderline] = useState(node.config?.isUnderline ?? false)

  const dimensions = useMemo(
    () => textRatioToDimensions(aspectRatio, maxDimension),
    [aspectRatio, maxDimension]
  )

  // Sync from node.config when it changes
  useEffect(() => {
    setText(node.config?.text || "Hello, world")
    setAspectRatio(node.config?.aspectRatio || "16:9")
    setMaxDimension(node.config?.maxDimension || 2048)
    setFontFamily(node.config?.fontFamily || '"Geist Mono", monospace')
    setFontSize(node.config?.fontSize || 96)
    setColor(node.config?.color || "#ffffff")
    setBgColor(node.config?.bgColor || "#000000")
    setAlignment(node.config?.alignment || "center")
    setLetterSpacing(node.config?.letterSpacing || "0")
    setLineHeight(node.config?.lineHeight || "1.2")
    setIsBold(node.config?.isBold ?? false)
    setIsItalic(node.config?.isItalic ?? false)
    setIsStrikethrough(node.config?.isStrikethrough ?? false)
    setIsUnderline(node.config?.isUnderline ?? false)
  }, [node.id])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const updateConfig = (updates: Record<string, any>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(updates)
    }, 200)
  }

  const handleAnyChange = () => {
    updateConfig({
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
    })
  }

  // Build text decoration string
  const textDecoration =
    [isUnderline ? "underline" : "", isStrikethrough ? "line-through" : ""]
      .filter(Boolean)
      .join(" ") || "none"

  const fontStyle = isItalic ? "italic" : "normal"
  const fontWeight = isBold ? "700" : "400"

  const handleDownload = () => {
    if (!svgRef.current) return

    const svg = svgRef.current
    const canvas = document.createElement("canvas")
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    const svgString = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `text-${Date.now()}.png`
      link.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(svgString)
  }

  return (
    <div className="space-y-4">
      {/* Text area */}
      <div className="space-y-2">
        <Label htmlFor="text-input" className="text-sm text-muted-foreground">
          text
        </Label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            handleAnyChange()
          }}
          placeholder="Enter text..."
          className="w-full px-2 py-1.5 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-24"
        />
      </div>

      {/* Aspect ratio */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">aspect ratio</Label>
        <Select
          value={aspectRatio}
          onValueChange={(v) => {
            setAspectRatio(v as TextAspectRatio)
            updateConfig({ aspectRatio: v })
          }}
        >
          <SelectTrigger className="h-8 text-xs">
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
      </div>

      {/* Max dimension */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">max dimension</Label>
          <span className="text-xs text-muted-foreground">{maxDimension}px</span>
        </div>
        <input
          type="range"
          min="512"
          max="4096"
          step="256"
          value={maxDimension}
          onChange={(e) => {
            setMaxDimension(Number(e.target.value))
            updateConfig({ maxDimension: Number(e.target.value) })
          }}
          className="w-full h-1 cursor-pointer"
        />
      </div>

      {/* Font family */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">font</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) => {
            setFontFamily(v)
            updateConfig({ fontFamily: v })
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='"Geist Mono", monospace'>Geist Mono</SelectItem>
            <SelectItem value='"Arial", sans-serif'>Arial</SelectItem>
            <SelectItem value='"Times New Roman", serif'>Times New Roman</SelectItem>
            <SelectItem value='"Courier New", monospace'>Courier New</SelectItem>
            <SelectItem value='"Georgia", serif'>Georgia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">font size</Label>
          <span className="text-xs text-muted-foreground">{fontSize}px</span>
        </div>
        <input
          type="range"
          min="12"
          max="1000"
          value={fontSize}
          onChange={(e) => {
            setFontSize(Number(e.target.value))
            updateConfig({ fontSize: Number(e.target.value) })
          }}
          className="w-full h-1 cursor-pointer"
        />
      </div>

      {/* Style toggles */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">style</Label>
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={isBold ? "default" : "secondary"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setIsBold(!isBold)
              updateConfig({ isBold: !isBold })
            }}
            title="Bold"
          >
            <Bold />
          </Button>
          <Button
            variant={isItalic ? "default" : "secondary"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setIsItalic(!isItalic)
              updateConfig({ isItalic: !isItalic })
            }}
            title="Italic"
          >
            <Italic />
          </Button>
          <Button
            variant={isStrikethrough ? "default" : "secondary"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setIsStrikethrough(!isStrikethrough)
              updateConfig({ isStrikethrough: !isStrikethrough })
            }}
            title="Strikethrough"
          >
            <Strikethrough />
          </Button>
          <Button
            variant={isUnderline ? "default" : "secondary"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setIsUnderline(!isUnderline)
              updateConfig({ isUnderline: !isUnderline })
            }}
            title="Underline"
          >
            <Underline />
          </Button>
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">alignment</Label>
        <div className="flex gap-1">
          <Button
            variant={alignment === "left" ? "default" : "secondary"}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              setAlignment("left")
              updateConfig({ alignment: "left" })
            }}
            title="Align left"
          >
            <AlignLeft className="w-3 h-3" />
          </Button>
          <Button
            variant={alignment === "center" ? "default" : "secondary"}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              setAlignment("center")
              updateConfig({ alignment: "center" })
            }}
            title="Align center"
          >
            <AlignCenter className="w-3 h-3" />
          </Button>
          <Button
            variant={alignment === "right" ? "default" : "secondary"}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              setAlignment("right")
              updateConfig({ alignment: "right" })
            }}
            title="Align right"
          >
            <AlignRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Letter spacing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">letter spacing</Label>
          <span className="text-xs text-muted-foreground">{letterSpacing}px</span>
        </div>
        <input
          type="range"
          min="-5"
          max="20"
          step="0.5"
          value={letterSpacing}
          onChange={(e) => {
            setLetterSpacing(e.target.value)
            updateConfig({ letterSpacing: e.target.value })
          }}
          className="w-full h-1 cursor-pointer"
        />
      </div>

      {/* Line height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">line height</Label>
          <span className="text-xs text-muted-foreground">{lineHeight}</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="2.5"
          step="0.1"
          value={lineHeight}
          onChange={(e) => {
            setLineHeight(e.target.value)
            updateConfig({ lineHeight: e.target.value })
          }}
          className="w-full h-1 cursor-pointer"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">text color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                updateConfig({ color: e.target.value })
              }}
              className="w-12 h-8 cursor-pointer border border-border rounded"
            />
            <span className="text-xs text-muted-foreground font-mono">{color}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">background color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value)
                updateConfig({ bgColor: e.target.value })
              }}
              className="w-12 h-8 cursor-pointer border border-border rounded"
            />
            <span className="text-xs text-muted-foreground font-mono">{bgColor}</span>
          </div>
        </div>
      </div>

      {/* Preview SVG (hidden) */}
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ display: "none" }}
      >
        <defs>
          <style>{`text { font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; font-style: ${fontStyle}; fill: ${color}; letter-spacing: ${letterSpacing}px; line-height: ${lineHeight}; text-decoration: ${textDecoration}; }`}</style>
        </defs>
        <rect width="100%" height="100%" fill={bgColor} />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor={alignment === "left" ? "start" : alignment === "right" ? "end" : "middle"}
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

      {/* Download button */}
      <Button onClick={handleDownload} size="sm" className="w-full h-8 text-xs" variant="secondary">
        <Download className="w-3 h-3 mr-1.5" />
        download image
      </Button>
    </div>
  )
}

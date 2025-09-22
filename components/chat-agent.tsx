"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, ImageIcon, Video, Sparkles } from "lucide-react"

interface Message {
  id: string
  type: "user" | "agent"
  content: string
  timestamp: Date
  preview?: {
    type: "image" | "video"
    url: string
    description: string
  }
}

export function ChatAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "agent",
      content:
        "Hi! I'm your AI workflow assistant. Describe what you want to create and I'll build the node graph for you.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          workflowContext: { currentWorkflow: "workflow-a" },
        }),
      })

      const result = await response.json()

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: result.message,
        timestamp: new Date(),
        preview: generatePreviewFromUpdates(result.workflowUpdates),
      }

      setMessages((prev) => [...prev, agentMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const generatePreviewFromUpdates = (updates: any[]) => {
    const imageUpdate = updates.find((u) => u.nodeType === "image-gen")
    const videoUpdate = updates.find((u) => u.nodeType === "video-gen")

    if (videoUpdate) {
      return {
        type: "video" as const,
        url: "/cyberpunk-video-animation.jpg",
        description: "Video generation preview",
      }
    } else if (imageUpdate) {
      return {
        type: "image" as const,
        url: "/cyberpunk-portrait-neon.png",
        description: "Image generation preview",
      }
    }

    return undefined
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-card-foreground">AI Agent</h3>
            <p className="text-xs text-muted-foreground">Ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              {message.type === "agent" && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.type === "user" ? "order-first" : ""}`}>
                <Card
                  className={`p-3 ${
                    message.type === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {message.preview && (
                    <div className="mt-3 p-2 bg-background rounded border">
                      <div className="flex items-center gap-2 mb-2">
                        {message.preview.type === "image" ? (
                          <ImageIcon className="w-4 h-4 text-primary" />
                        ) : (
                          <Video className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">{message.preview.description}</span>
                      </div>
                      <img
                        src={message.preview.url || "/placeholder.svg"}
                        alt={message.preview.description}
                        className="w-full h-20 object-cover rounded"
                      />
                    </div>
                  )}
                </Card>

                <p className="text-xs text-muted-foreground mt-1 px-1">{message.timestamp.toLocaleTimeString()}</p>
              </div>

              {message.type === "user" && (
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3 h-3 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3 h-3 text-primary-foreground" />
              </div>
              <Card className="p-3 bg-muted">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe what you want to create..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="sm" className="gap-2">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
            <Sparkles className="w-3 h-3 mr-1" />
            Generate image
          </Badge>
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
            <Video className="w-3 h-3 mr-1" />
            Create video
          </Badge>
        </div>
      </div>
    </div>
  )
}

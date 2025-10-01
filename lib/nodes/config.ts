import { MessageSquare, ImageIcon, Video, Wand2, TestTube } from "lucide-react"

export const NODE_TYPES = [
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
  {
    id: "test",
    title: "Test Resize",
    icon: TestTube,
    description: "Empty node for testing resize",
  },
  // Hidden: Image Edit – Image node covers both txt2img and img2img
  // Hidden: Video Gen – not implemented yet
  // {
  //   id: "video-gen",
  //   title: "Video Generation",
  //   icon: Video,
  //   description: "Create videos from prompts or images",
  // },
  // Hidden: Background Replace – not implemented yet
  // {
  //   id: "background-replace",
  //   title: "Background Replace",
  //   icon: Wand2,
  //   description: "Replace image backgrounds",
  // },
]

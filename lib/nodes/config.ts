import { MessageSquare, ImageIcon, Video, Wand2 } from "lucide-react";

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

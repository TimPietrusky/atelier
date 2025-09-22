"use client";

export interface MediaAsset {
  id: string;
  type: "image" | "video";
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
  modelId?: string;
  width?: number;
  height?: number;
  workflowId?: string;
  nodeId?: string;
  executionId?: string;
}

type Listener = () => void;

class MediaStore {
  private assets: MediaAsset[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  private ensureInit() {
    if (this.initialized) return;
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("media-assets")
        : null;
    if (raw) {
      try {
        this.assets = JSON.parse(raw);
      } catch {
        this.assets = [];
      }
    }
    this.initialized = true;
  }

  private persist() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("media-assets", JSON.stringify(this.assets));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.persist();
    this.listeners.forEach((l) => l());
  }

  list(): MediaAsset[] {
    this.ensureInit();
    return [...this.assets];
  }

  add(asset: MediaAsset) {
    this.ensureInit();
    this.assets.unshift(asset);
    this.notify();
  }
}

export const mediaStore = new MediaStore();

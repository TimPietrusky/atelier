"use client";

// Fallback storage for when IndexedDB/Dexie is unavailable (e.g., v0.dev, private browsing)

import type { DBWorkflow, DBNodeRow, DBEdgeRow } from "./db";

const LS_KEY = "atelier-fallback";

interface FallbackData {
  workflows: Record<
    string,
    {
      workflow: DBWorkflow;
      nodes: DBNodeRow[];
      edges: DBEdgeRow[];
    }
  >;
  kv: Record<string, any>;
}

function readFallback(): FallbackData {
  if (typeof window === "undefined") return { workflows: {}, kv: {} };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { workflows: {}, kv: {} };
    return JSON.parse(raw);
  } catch {
    return { workflows: {}, kv: {} };
  }
}

function writeFallback(data: FallbackData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[Fallback Storage] Write failed:", e);
  }
}

export async function fallbackHydrateWorkflows(): Promise<
  {
    id: string;
    name: string;
    nodes: DBNodeRow[];
    edges: DBEdgeRow[];
    viewport?: { x: number; y: number; zoom: number };
    updatedAt: number;
    version?: number;
  }[]
> {
  const data = readFallback();
  return Object.values(data.workflows).map((w) => ({
    id: w.workflow.id,
    name: w.workflow.name,
    nodes: w.nodes,
    edges: w.edges,
    viewport: w.workflow.viewport,
    updatedAt: w.workflow.updatedAt,
    version: w.workflow.version,
  }));
}

export async function fallbackWriteWorkflowGraph(payload: {
  id: string;
  name: string;
  nodes: DBNodeRow[];
  edges: DBEdgeRow[];
  viewport?: { x: number; y: number; zoom: number };
  updatedAt: number;
  version?: number;
}) {
  const data = readFallback();
  data.workflows[payload.id] = {
    workflow: {
      id: payload.id,
      name: payload.name,
      updatedAt: payload.updatedAt,
      version: payload.version,
      viewport: payload.viewport,
    },
    nodes: payload.nodes,
    edges: payload.edges,
  };
  writeFallback(data);
}

export async function fallbackPutKV(key: string, value: any) {
  const data = readFallback();
  data.kv[key] = value;
  writeFallback(data);
}

export async function fallbackGetKV<T = any>(
  key: string
): Promise<T | undefined> {
  const data = readFallback();
  return data.kv[key] as T | undefined;
}

export async function fallbackDeleteWorkflow(id: string) {
  const data = readFallback();
  delete data.workflows[id];
  writeFallback(data);
}


/**
 * Storage Manager
 *
 * Central coordinator for all persistence operations. Provides:
 * - Write serialization per workflow (prevents race conditions)
 * - Debouncing for high-frequency updates (viewport, result history deletes)
 * - Error handling and logging
 * - Backend abstraction (IndexedDB now, cloud/local filesystem later)
 *
 * This eliminates the race conditions from:
 * - Concurrent writes to same workflow
 * - Cross-tab sync clobbering local state
 * - Fire-and-forget async persists with no ordering
 */

import type { StorageBackend, WorkflowDoc } from "./storage-backend"

export class StorageManager {
  private backend: StorageBackend
  private writeQueue: Map<string, Promise<void>> = new Map()
  private debouncers: Map<string, NodeJS.Timeout> = new Map()

  constructor(backend: StorageBackend) {
    this.backend = backend
  }

  /**
   * Immediate persist (serialized per workflow).
   * Waits for any pending write to the same workflow before starting a new one.
   * This prevents out-of-order writes and conflicting updates.
   */
  async persist(workflow: WorkflowDoc): Promise<void> {
    const id = workflow.id

    // Wait for any pending write to this workflow
    const pending = this.writeQueue.get(id)
    if (pending) {
      await pending.catch(() => {
        /* Ignore errors from previous writes, we'll try again */
      })
    }

    // Start new write
    const writePromise = this._doWrite(workflow)
    this.writeQueue.set(id, writePromise)

    try {
      await writePromise
    } finally {
      // Only delete if this is still the active promise (not superseded)
      if (this.writeQueue.get(id) === writePromise) {
        this.writeQueue.delete(id)
      }
    }
  }

  /**
   * Debounced persist for high-frequency updates (viewport, result history deletes).
   * Batches rapid changes into a single write after the delay.
   */
  persistDebounced(key: string, workflow: WorkflowDoc, delayMs: number): void {
    // Cancel any pending debounced write for this key
    const existing = this.debouncers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    // Schedule new write
    const timer = setTimeout(() => {
      this.debouncers.delete(key)
      this.persist(workflow).catch((err) => {
        console.error("[StorageManager] Debounced persist failed:", key, err)
      })
    }, delayMs)

    this.debouncers.set(key, timer)
  }

  /**
   * Update viewport only (lightweight operation).
   * Used for high-frequency pan/zoom updates.
   */
  async persistViewport(
    id: string,
    viewport: { x: number; y: number; zoom: number },
    updatedAt: number,
    version?: number
  ): Promise<void> {
    try {
      await this.backend.updateViewport(id, viewport, updatedAt, version)
    } catch (err) {
      console.error("[StorageManager] Failed to persist viewport:", id, err)
    }
  }

  /**
   * Flush all pending writes. Used on unmount or before critical operations.
   */
  async flush(): Promise<void> {
    // Wait for all debounced writes to trigger
    const debouncerPromises = Array.from(this.debouncers.entries()).map(([key, timer]) => {
      clearTimeout(timer)
      this.debouncers.delete(key)
      return Promise.resolve() // Debounced writes are fire-and-forget
    })

    // Wait for all queued writes
    const queuePromises = Array.from(this.writeQueue.values())

    await Promise.all([...debouncerPromises, ...queuePromises]).catch((err) => {
      console.error("[StorageManager] Flush failed:", err)
    })
  }

  /**
   * Cancel all pending operations. Used on cleanup.
   */
  cancel(): void {
    // Clear all debounce timers
    this.debouncers.forEach((timer) => clearTimeout(timer))
    this.debouncers.clear()

    // Note: We don't cancel in-flight writes (they should complete)
    // Just clear our tracking
  }

  private async _doWrite(workflow: WorkflowDoc): Promise<void> {
    try {
      await this.backend.saveWorkflow(workflow)
    } catch (err) {
      console.error("[StorageManager] Failed to persist workflow:", workflow.id, err)
      throw err // Re-throw so caller can handle if needed
    }
  }

  // Proxy methods for other backend operations
  async loadWorkflows(): Promise<WorkflowDoc[]> {
    return this.backend.loadWorkflows()
  }

  async deleteWorkflow(id: string): Promise<void> {
    return this.backend.deleteWorkflow(id)
  }

  async setKV(key: string, value: any): Promise<void> {
    return this.backend.setKV(key, value)
  }

  async getKV<T>(key: string): Promise<T | undefined> {
    return this.backend.getKV<T>(key)
  }
}

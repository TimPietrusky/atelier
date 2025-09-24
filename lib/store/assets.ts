export type AssetRef =
  | { kind: "url"; url: string; mime?: string; bytes?: number; hash?: string }
  | { kind: "opfs"; path: string; mime?: string; bytes?: number; hash?: string }
  | {
      kind: "fs-handle";
      handleId: string;
      mime?: string;
      bytes?: number;
      hash?: string;
    }
  | {
      kind: "idb";
      blobKey: string;
      mime?: string;
      bytes?: number;
      hash?: string;
    }
  | {
      kind: "embedded";
      id: string;
      mime?: string;
      bytes?: number;
      hash?: string;
    };

export interface PutParams {
  mime?: string;
  id?: string;
}

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    // @ts-ignore
    const root: FileSystemDirectoryHandle = await (
      navigator as any
    ).storage?.getDirectory?.();
    if (!root) return undefined;
    // Create app-scoped dir
    const appDir = await root.getDirectoryHandle("atelier", { create: true });
    const assetsDir = await appDir.getDirectoryHandle("assets", {
      create: true,
    });
    return assetsDir;
  } catch {
    return undefined;
  }
}

export const AssetStorage = {
  async put(source: Blob | File, hint: PutParams = {}): Promise<AssetRef> {
    const id = hint.id || `asset_${Date.now()}`;
    const mime = hint.mime || source.type || "application/octet-stream";
    const bytes = source.size;
    // Try OPFS
    const root = await getOPFSRoot();
    if (root) {
      try {
        const typeDir = await root.getDirectoryHandle("images", {
          create: true,
        });
        const fileHandle = await typeDir.getFileHandle(id, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(source);
        await writable.close();
        return { kind: "opfs", path: `images/${id}`, mime, bytes };
      } catch {}
    }
    // Fallback to IDB data-url for small files
    try {
      const arrayBuf = await source.arrayBuffer();
      const b64 = Buffer.from(arrayBuf).toString("base64");
      const dataUrl = `data:${mime};base64,${b64}`;
      const { idbPutImage } = await import("@/lib/store/idb");
      await idbPutImage(id, dataUrl);
      return { kind: "idb", blobKey: id, mime, bytes };
    } catch {}
    // Last resort: object URL – not persisted across sessions
    return { kind: "url", url: URL.createObjectURL(source), mime, bytes };
  },

  async get(ref: AssetRef): Promise<Blob | string> {
    switch (ref.kind) {
      case "url":
        return ref.url;
      case "opfs": {
        try {
          const root = await getOPFSRoot();
          if (!root) break;
          const [folder, filename] = ref.path.split("/");
          const typeDir = await root.getDirectoryHandle(folder);
          const fh = await typeDir.getFileHandle(filename);
          const file = await fh.getFile();
          return file;
        } catch {}
        break;
      }
      case "idb": {
        try {
          const { idbGetImage } = await import("@/lib/store/idb");
          const dataUrl = await idbGetImage(ref.blobKey);
          if (dataUrl) return dataUrl;
        } catch {}
        break;
      }
      case "fs-handle":
      case "embedded":
        // Not implemented in v1
        break;
    }
    throw new Error("Asset not available");
  },

  async delete(ref: AssetRef): Promise<void> {
    switch (ref.kind) {
      case "opfs": {
        try {
          const root = await getOPFSRoot();
          if (!root) return;
          const [folder, filename] = ref.path.split("/");
          const typeDir = await root.getDirectoryHandle(folder);
          await typeDir.removeEntry(filename);
        } catch {}
        return;
      }
      case "idb": {
        try {
          const { idbDeleteImage } = await import("@/lib/store/idb");
          await idbDeleteImage(ref.blobKey);
        } catch {}
        return;
      }
      default:
        return;
    }
  },
};

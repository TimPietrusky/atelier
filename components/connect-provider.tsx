"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConnectProviderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectProvider({ open, onOpenChange }: ConnectProviderProps) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connected">(
    "disconnected"
  );

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rp_api_key")
        : null;
    if (saved) {
      setApiKey(saved);
      setStatus("connected");
    }
  }, []);

  const save = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rp_api_key", apiKey);
      setStatus(apiKey ? "connected" : "disconnected");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Provider</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">RunPod</div>
            <Badge variant={status === "connected" ? "secondary" : "outline"}>
              {status}
            </Badge>
          </div>
          <Input
            placeholder="Enter RUNPOD_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This stores your API key locally for the UI. Server routes use
            environment variables.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

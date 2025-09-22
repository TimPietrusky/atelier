"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  Search,
  Grid3X3,
  List,
  Tag,
  ImageIcon,
  Video,
  Folder,
  Download,
  Share,
  Copy,
  Trash2,
  Archive,
  Star,
  Clock,
  MoreHorizontal,
  Edit,
  Eye,
  History,
} from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  title: string;
  workflow: string;
  tags: string[];
  createdAt: Date;
  model: string;
  size: string;
  dimensions: string;
  starred: boolean;
  version: number;
  versions: Array<{
    version: number;
    url: string;
    createdAt: Date;
    changes: string;
  }>;
}

interface MediaManagerProps {
  onClose: () => void;
}

export function MediaManager({ onClose }: MediaManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("date");
  const [filterType, setFilterType] = useState("all");
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(
    null
  );

  const [mediaItems] = useState<MediaItem[]>([
    {
      id: "1",
      type: "image",
      url: "/cyberpunk-portrait-neon.jpg",
      title: "Cyberpunk Portrait",
      workflow: "Workflow A",
      tags: ["cyberpunk", "portrait", "neon"],
      createdAt: new Date("2024-01-15"),
      model: "SDXL",
      size: "2.4 MB",
      dimensions: "1024x1024",
      starred: true,
      version: 3,
      versions: [
        {
          version: 1,
          url: "/cyberpunk-portrait-v1.jpg",
          createdAt: new Date("2024-01-15T10:00:00"),
          changes: "Initial generation",
        },
        {
          version: 2,
          url: "/cyberpunk-portrait-v2.jpg",
          createdAt: new Date("2024-01-15T10:30:00"),
          changes: "Enhanced lighting",
        },
        {
          version: 3,
          url: "/cyberpunk-portrait-neon.jpg",
          createdAt: new Date("2024-01-15T11:00:00"),
          changes: "Added neon effects",
        },
      ],
    },
    {
      id: "2",
      type: "video",
      url: "/cyberpunk-video-animation.jpg",
      title: "Cyberpunk Animation",
      workflow: "Workflow A",
      tags: ["cyberpunk", "animation", "video"],
      createdAt: new Date("2024-01-14"),
      model: "Video Gen",
      size: "15.2 MB",
      dimensions: "1920x1080",
      starred: false,
      version: 1,
      versions: [
        {
          version: 1,
          url: "/cyberpunk-video-animation.jpg",
          createdAt: new Date("2024-01-14T14:00:00"),
          changes: "Initial generation",
        },
      ],
    },
    {
      id: "3",
      type: "image",
      url: "/fantasy-map-watercolor.jpg",
      title: "Fantasy Map",
      workflow: "Fantasy Map Generator",
      tags: ["fantasy", "map", "watercolor"],
      createdAt: new Date("2024-01-10"),
      model: "SDXL",
      size: "3.1 MB",
      dimensions: "1024x768",
      starred: false,
      version: 2,
      versions: [
        {
          version: 1,
          url: "/fantasy-map-v1.jpg",
          createdAt: new Date("2024-01-10T09:00:00"),
          changes: "Initial generation",
        },
        {
          version: 2,
          url: "/fantasy-map-watercolor.jpg",
          createdAt: new Date("2024-01-10T09:45:00"),
          changes: "Applied watercolor style",
        },
      ],
    },
  ]);

  const filteredItems = mediaItems
    .filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesType =
        filterType === "all" ||
        (filterType === "images" && item.type === "image") ||
        (filterType === "videos" && item.type === "video") ||
        (filterType === "starred" && item.starred);

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "name":
          return a.title.localeCompare(b.title);
        case "size":
          return Number.parseFloat(b.size) - Number.parseFloat(a.size);
        default:
          return 0;
      }
    });

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    setSelectedItems(filteredItems.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleBatchOperation = async (operation: string) => {
    const selectedMediaItems = mediaItems.filter((item) =>
      selectedItems.includes(item.id)
    );

    switch (operation) {
      case "download":
        console.log(
          "Downloading items:",
          selectedMediaItems.map((item) => item.title)
        );
        break;
      case "archive":
        console.log(
          "Archiving items:",
          selectedMediaItems.map((item) => item.title)
        );
        break;
      case "delete":
        console.log(
          "Deleting items:",
          selectedMediaItems.map((item) => item.title)
        );
        break;
      case "star":
        console.log(
          "Starring items:",
          selectedMediaItems.map((item) => item.title)
        );
        break;
    }

    clearSelection();
  };

  const toggleStar = (itemId: string) => {
    console.log("Toggling star for item:", itemId);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[80vh] bg-card flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-card-foreground">
              Media Manager
            </h2>
            <Badge variant="outline">{filteredItems.length} items</Badge>
            {selectedItems.length > 0 && (
              <Badge variant="secondary">{selectedItems.length} selected</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-border">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search media..."
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Media</SelectItem>
                <SelectItem value="images">Images Only</SelectItem>
                <SelectItem value="videos">Videos Only</SelectItem>
                <SelectItem value="starred">Starred</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">File Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk selection controls */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                selectedItems.length === filteredItems.length &&
                filteredItems.length > 0
              }
              onCheckedChange={(checked) =>
                checked ? selectAll() : clearSelection()
              }
            />
            <span className="text-sm text-muted-foreground">Select all</span>
            {selectedItems.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-border p-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Media</TabsTrigger>
                <TabsTrigger value="folders">Folders</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Images (
                    {mediaItems.filter((i) => i.type === "image").length})
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Videos (
                    {mediaItems.filter((i) => i.type === "video").length})
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Starred ({mediaItems.filter((i) => i.starred).length})
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="folders" className="mt-4">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    Cyberpunk Reel
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    Fantasy Collection
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Media Grid */}
          <div className="flex-1">
            <ScrollArea className="h-full">
              <div className="p-6">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedItems.includes(item.id)
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="aspect-square relative overflow-hidden rounded-t-lg">
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />

                          {/* Overlay controls */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => console.log("Preview", item.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => console.log("Download", item.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Asset Actions</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    className="gap-2 bg-transparent"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="gap-2 bg-transparent"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="gap-2 bg-transparent"
                                  >
                                    <Share className="w-4 h-4" />
                                    Share
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="gap-2 bg-transparent"
                                    onClick={() =>
                                      setShowVersionHistory(item.id)
                                    }
                                  >
                                    <History className="w-4 h-4" />
                                    Versions
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>

                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() =>
                                toggleItemSelection(item.id)
                              }
                              className="bg-white/80"
                            />
                          </div>

                          <div className="absolute top-2 right-2 flex gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.type === "image" ? (
                                <ImageIcon className="w-3 h-3" />
                              ) : (
                                <Video className="w-3 h-3" />
                              )}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                              onClick={() => toggleStar(item.id)}
                            >
                              <Star
                                className={`w-3 h-3 ${
                                  item.starred
                                    ? "fill-yellow-400 text-yellow-400"
                                    : ""
                                }`}
                              />
                            </Button>
                          </div>

                          {/* Version indicator */}
                          {item.version > 1 && (
                            <div className="absolute bottom-2 left-2">
                              <Badge
                                variant="outline"
                                className="text-xs bg-white/80"
                              >
                                v{item.version}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <h4 className="font-medium text-sm text-card-foreground mb-1">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {item.workflow}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 2}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.model}</span>
                            <span>{item.size}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>{item.dimensions}</span>
                            {(() => {
                              const d = item.createdAt;
                              const label =
                                typeof d === "string"
                                  ? d
                                  : d.toISOString().slice(0, 10);
                              return (
                                <span suppressHydrationWarning>{label}</span>
                              );
                            })()}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                          selectedItems.includes(item.id)
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />

                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded"
                          />

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-card-foreground">
                                {item.title}
                              </h4>
                              {item.starred && (
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              )}
                              {item.version > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  v{item.version}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.workflow}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.model}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {item.size} • {item.dimensions}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        {selectedItems.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedItems.length} item(s) selected
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => handleBatchOperation("download")}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => handleBatchOperation("star")}
                >
                  <Star className="w-4 h-4" />
                  Star
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                >
                  <Tag className="w-4 h-4" />
                  Add Tags
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                >
                  <Folder className="w-4 h-4" />
                  Move to Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => handleBatchOperation("archive")}
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleBatchOperation("delete")}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <Button size="sm">Add to Canvas</Button>
              </div>
            </div>
          </div>
        )}

        {/* Version history dialog */}
        {showVersionHistory && (
          <Dialog
            open={!!showVersionHistory}
            onOpenChange={() => setShowVersionHistory(null)}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Version History</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {mediaItems
                  .find((item) => item.id === showVersionHistory)
                  ?.versions.map((version) => (
                    <Card key={version.version} className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={version.url || "/placeholder.svg"}
                          alt={`Version ${version.version}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              Version {version.version}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              suppressHydrationWarning
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {(() => {
                                const d = version.createdAt;
                                return typeof d === "string"
                                  ? d
                                  : d.toISOString();
                              })()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.changes}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm">Restore</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Card>
    </div>
  );
}

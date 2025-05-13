"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { formatDuration, getMuxThumbnailUrl } from "@/lib/mux";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { VideoUploadForm } from "./VideoUploadForm";
import { VideoEditForm } from "./video-edit-form";
import { deleteVideo } from "@/actions/video";

type VideoItem = {
  _id: string;
  title: string;
  description?: string;
  status: "processing" | "ready" | "error";
  muxPlaybackId?: string;
  muxAssetId?: string;
  duration?: number;
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
  };
};

type VideoListProps = {
  videos: VideoItem[];
  workspaceId: string;
  canUpload: boolean;
};

export function VideoList({ videos, workspaceId, canUpload }: VideoListProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteAlert, setShowDeleteAlert] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  // Handle video deletion
  const handleDelete = async (videoId: string) => {
    setIsDeleting(true);
    try {
      const response = await deleteVideo(videoId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Video deleted", {
        description: "The video has been deleted successfully.",
      });
      
      // Refresh the list
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video", {
        description: error.message || "Failed to delete video",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(null);
    }
  };

  // Handle successful upload
  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle successful edit
  const handleEditSuccess = () => {
    setEditingVideo(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Render status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Videos</h2>
        {canUpload && (
          <VideoUploadForm 
            workspaceId={workspaceId} 
            onSuccess={handleUploadSuccess}
          />
        )}
      </div>
      
      {videos.length === 0 ? (
        <div className="text-center py-12 bg-muted/40 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload a video to get started.
          </p>
          {canUpload && (
            <VideoUploadForm 
              workspaceId={workspaceId} 
              onSuccess={handleUploadSuccess}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video._id.toString()} className="overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-muted group">
                {video.status === "ready" && video.muxPlaybackId ? (
                  <Link href={`/videos/${video._id}`}>
                    <Image
                      src={getMuxThumbnailUrl(video.muxPlaybackId)}
                      alt={video.title}
                      fill
                      className="object-cover transition-opacity group-hover:opacity-90"
                    />
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {video.status === "processing" ? (
                      <div className="text-center p-4">
                        <Skeleton className="h-6 w-6 rounded-full mx-auto mb-2" />
                        <p className="text-sm">Processing video...</p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-sm text-destructive">Processing failed</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <CardContent className="pt-4 flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold line-clamp-1">
                    {video.status === "ready" ? (
                      <Link href={`/videos/${video._id}`} className="hover:underline">
                        {video.title}
                      </Link>
                    ) : (
                      video.title
                    )}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {video.status === "ready" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/videos/${video._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Video
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEditingVideo(video)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteAlert(video._id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="border-t p-3 bg-muted/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={video.uploader.profileImage} alt={video.uploader.name} />
                    <AvatarFallback>{getInitials(video.uploader.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{formatRelativeTime(video.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(video.status)}
                  {video.status === "ready" && (
                    <span className="text-xs flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {video.viewCount}
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Video Dialog */}
      {editingVideo && (
        <VideoEditForm
          video={editingVideo}
          open={!!editingVideo}
          onOpenChange={() => setEditingVideo(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteAlert} onOpenChange={(open) => !open && setShowDeleteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteAlert && handleDelete(showDeleteAlert)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
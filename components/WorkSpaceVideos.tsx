// src/app/(dashboard)/workspaces/[slug]/workspace-videos.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, MoreVertical, Pencil, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
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
import { S3MultipartUploadForm } from "@/components/S3MultipartUploadForm";
import { VideoEditForm } from "@/components/video-edit-form";
import { getWorkspaceVideos, deleteVideo } from "@/actions/video";

type VideoItem = {
  _id: string;
  title: string;
  description?: string;
  status: "uploading" | "processing" | "ready" | "error";
  hlsKey?: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
  };
};

type WorkspaceVideosProps = {
  workspaceId: string;
  slug: string;
  isOwner: boolean;
};

export function WorkspaceVideos({ workspaceId, slug, isOwner }: WorkspaceVideosProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  // Fetch videos
  useEffect(() => {
    async function fetchVideos() {
      setLoading(true);
      try {
        const response = await getWorkspaceVideos(workspaceId);
        
        if (response.success) {
          setVideos(response.videos);
          setError(null);
        } else {
          setError(response.error || "Failed to load videos");
          setVideos([]);
        }
      } catch (error: any) {
        setError(error.message || "An error occurred");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVideos();
  }, [workspaceId, refreshTrigger]);

  // Handle video deletion
  const handleDelete = async () => {
    if (!videoToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteVideo(videoToDelete);
      
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
      setVideoToDelete(null);
    }
  };

  // Handle refresh after upload
  const handleUploadSuccess = () => {
    // Wait a bit for the database to update
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1000);
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

  // Get thumbnail URL
  const getThumbnailUrl = (video: VideoItem) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    
    // Generate a default thumbnail based on status
    return `/api/videos/${video._id}/thumbnail`;
  };

  // Render status badge and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case "uploading":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Uploading
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Processing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-destructive/20 rounded-md bg-destructive/10 text-destructive">
        <h3 className="font-medium mb-2">Error loading videos</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Videos</h2>
        <S3MultipartUploadForm 
          workspaceId={workspaceId} 
          onSuccess={handleUploadSuccess}
        />
      </div>
      
      {videos.length === 0 ? (
        <div className="text-center py-12 bg-muted/40 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload a video to get started.
          </p>
          <S3MultipartUploadForm 
            workspaceId={workspaceId} 
            onSuccess={handleUploadSuccess}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video._id.toString()} className="overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-muted group">
                {video.status === "ready" ? (
                  <Link href={`/videos/${video._id}`}>
                    <div className="w-full h-full bg-muted">
                      <Image
                        src={getThumbnailUrl(video)}
                        alt={video.title}
                        fill
                        className="object-cover transition-opacity group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          variant="secondary"
                          size="sm"
                          className="scale-90 group-hover:scale-100 transition-transform"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Watch Now
                        </Button>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/60">
                    {video.status === "uploading" ? (
                      <div className="text-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-2" />
                        <p className="text-sm font-medium">Uploading...</p>
                      </div>
                    ) : video.status === "processing" ? (
                      <div className="text-center p-4">
                        <div className="animate-pulse rounded-full h-8 w-8 bg-yellow-500/20 mx-auto mb-2 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="text-sm font-medium">Processing...</p>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-destructive">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm font-medium">Processing failed</p>
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
                        onClick={() => setVideoToDelete(video._id)}
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
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!videoToDelete} 
        onOpenChange={(open) => !open && setVideoToDelete(null)}
      >
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
              onClick={handleDelete}
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
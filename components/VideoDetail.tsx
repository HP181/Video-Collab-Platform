"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, User, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { S3VideoPlayer } from "@/components/S3VideoPlayer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type VideoDetailProps = {
  video: {
    _id: string;
    title: string;
    description?: string;
    status: string;
    hlsKey?: string;
    videoKey?: string; // Added videoKey field
    viewCount: number;
    createdAt: string;
    uploader: {
      id: string;
      name: string;
      profileImage: string;
    };
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

export function VideoDetail({ video }: VideoDetailProps) {
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHls, setIsHls] = useState(true); // Add state for tracking if it's HLS or direct video
  // Get the HLS streaming URL
  useEffect(() => {
    async function getStreamUrl() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/videos/${video._id}/stream`);
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to get streaming URL');
        }
        
        const data = await response.json();
        setHlsUrl(data.url);
        setIsHls(data.isHLS !== false); // Default to true if not specified
        setError(null);
        
        console.log(`Got streaming URL, isHLS: ${data.isHLS !== false}`);
      } catch (error: any) {
        console.error('Error getting streaming URL:', error);
        setError(error.message || 'Failed to load video');
        setHlsUrl(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (video.status === 'ready' && (video.hlsKey || video.videoKey)) {
      getStreamUrl();
    } else {
      setError('Video is not ready for playback');
      setIsLoading(false);
    }
  }, [video._id, video.status, video.hlsKey, video.videoKey]);

  // Get initials from name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/workspaces/${video.workspace.slug}`}>
            <ChevronLeft className="h-4 w-4" />
            Back to {video.workspace.name}
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="aspect-video w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      ) : error ? (
        <div className="aspect-video w-full bg-muted/60 rounded-lg flex items-center justify-center border">
          <div className="text-center p-6">
            <p className="text-destructive font-medium mb-2">Error loading video</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
       ) : hlsUrl ? (
        <S3VideoPlayer 
          hlsUrl={hlsUrl} 
          title={video.title}
          isHls={isHls}
        />
      ) : (
        <div className="aspect-video w-full bg-muted/60 rounded-lg flex items-center justify-center border">
          <p className="text-muted-foreground">Video not available</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(video.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{video.viewCount} views</span>
            </div>
          </div>
          
          {video.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p>{video.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided</p>
          )}
        </div>
        
        <div className="md:w-72">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3">Uploader</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={video.uploader.profileImage} alt={video.uploader.name} />
                  <AvatarFallback>{getInitials(video.uploader.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{video.uploader.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded on {formatDate(video.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
// src/app/(dashboard)/videos/[id]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getVideo } from "@//actions/video";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { VideoDetail } from "@/components/VideoDetail";

interface VideoPageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VideoPage({ params }: VideoPageProps) {
  // Access params safely
  const id = params.id;
  
  // Get the video data
  const { video, success } = await getVideo(id);
  
  if (!success || !video) {
    notFound();
  }
  
  return (
    <div className="container max-w-7xl py-6">
      <Suspense fallback={<VideoSkeleton />}>
        <VideoDetail video={video} />
      </Suspense>
    </div>
  );
}

function VideoSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
// src/app/api/videos/[id]/thumbnail/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import Video from "@/models/video";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3-client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const param = await params;
    const videoId = param.id;
    
    await connectToDatabase();
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return new NextResponse('Video not found', { status: 404 });
    }
    
    // Check if the video has a thumbnail or is ready
    if (video.thumbnailUrl) {
      // Redirect to the existing thumbnail
      return NextResponse.redirect(video.thumbnailUrl);
    }
    
    // If the video is ready but has no thumbnail, try to generate one
    if (video.status === 'ready' && video.hlsKey) {
      try {
        // For a real implementation, you should generate an actual thumbnail
        // Here we'll just redirect to a generic thumbnail
        return NextResponse.redirect(new URL('/api/placeholder-thumbnail', req.url));
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    }
    
    // Return a placeholder based on status
    let placeholderPath;
    
    switch (video.status) {
      case 'uploading':
        placeholderPath = '/images/uploading-placeholder.png';
        break;
      case 'processing':
        placeholderPath = '/images/processing-placeholder.png';
        break;
      case 'error':
        placeholderPath = '/images/error-placeholder.png';
        break;
      default:
        placeholderPath = '/images/video-placeholder.png';
    }
    
    // Return a redirect to the placeholder image
    return NextResponse.redirect(new URL(placeholderPath, req.url));
  } catch (error) {
    console.error('Error getting video thumbnail:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


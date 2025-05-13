// src/app/api/videos/[id]/stream/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Video } from "@/models/video";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, bucketName } from "@/lib/s3-client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Stream request received for video ID: ${params.id}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.error("Unauthorized request to stream video");
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const param = await params
    const videoId = param.id;
    console.log(`Looking up video with ID: ${videoId}`);
    
    await connectToDatabase();
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      console.error(`Video not found: ${videoId}`);
      return new NextResponse('Video not found', { status: 404 });
    }
    
    console.log(`Found video: ${video.title}, status: ${video.status}`);
    
    // Check if the video is ready
    if (video.status !== 'ready') {
      console.error(`Video not ready for streaming: ${video.status}`);
      return new NextResponse('Video is not ready for streaming', { status: 400 });
    }
    
    // Check if the video has HLS content
    if (!video.hlsKey) {
      console.error(`Video has no HLS key: ${videoId}`);
      
      // If video has a direct videoKey but no HLS key, return a direct link
      if (video.videoKey) {
        console.log(`Returning direct video link instead of HLS`);
        const directCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: video.videoKey,
        });
        
        const directUrl = await getSignedUrl(s3Client, directCommand, { 
          expiresIn: 3600, // 1 hour
        });
        
        return NextResponse.json({ url: directUrl, isHLS: false });
      }
      
      return new NextResponse('Video streaming manifest not found', { status: 404 });
    }
    
    console.log(`Generating pre-signed URL for HLS key: ${video.hlsKey}`);
    
    // Generate a pre-signed URL for the HLS manifest
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.hlsKey,
    });
    
    const url = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600, // 1 hour
    });
    
    console.log(`Generated streaming URL (truncated): ${url.substring(0, 50)}...`);
    
    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
      $inc: { viewCount: 1 }
    });
    
    // Return the URL
    return NextResponse.json({ url, isHLS: true });
  } catch (error: any) {
    console.error('Error getting video stream:', error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
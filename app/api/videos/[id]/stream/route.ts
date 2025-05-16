// src/app/api/videos/[id]/stream/route.ts
import { NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Video } from "@/models/video";
import { s3Client, bucketName } from "@/lib/s3-client";
import { getUserMembership } from "@/lib/UserMembership"; // You'll need to create this

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    // Get video information
    const param = await params
    const videoId = param.id;
    const video = await Video.findOne({
      _id: videoId,
      status: "ready"
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found or not ready" }, { status: 404 });
    }

    // Increment view count
    await Video.findByIdAndUpdate(videoId, { $inc: { viewCount: 1 } });

    // Get user's membership status
    const { isPaidMember } = await getUserMembership(userId);

    // Determine if we should use HLS or direct video
    let streamUrl;
    let isHLS = true;

    if (video.hlsKey) {
      // Generate a presigned URL for the master playlist
      const masterPlaylistKey = `${video.hlsKey}/master.m3u8`;
      
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: masterPlaylistKey,
      });
      
      streamUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      // Record the user's quality permission in the response
      const userAllowedHD = isPaidMember;
      
      return NextResponse.json({
        url: streamUrl,
        isHLS: true,
        allowedQuality: userAllowedHD ? "1080p" : "720p"
      });
    } else if (video.videoKey) {
      // Fallback to direct video if HLS is not available
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: video.videoKey,
      });
      
      streamUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      return NextResponse.json({
        url: streamUrl,
        isHLS: false
      });
    } else {
      return NextResponse.json({ error: "Video has no playable content" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error getting video stream:", error);
    return NextResponse.json(
      { error: "Failed to get streaming URL" },
      { status: 500 }
    );
  }
}
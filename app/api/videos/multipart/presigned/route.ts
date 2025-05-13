// src/app/api/videos/multipart/presigned/route.ts
import { NextResponse } from "next/server";
import { 
  UploadPartCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Video } from "@/models/video";
import { s3Client, bucketName } from "@/lib/s3-client";

export async function POST(req: Request) {
  try {
    console.log("Presigned URL request received");
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { 
      uploadId,
      key,
      videoId,
      partNumber,
    } = await req.json();
    
    console.log("Presigned URL request params:", { uploadId, key, videoId, partNumber });
    
    // Validate that the upload exists and belongs to this user
    await connectToDatabase();
    
    console.log("Finding video document...");
    const video = await Video.findOne({
      _id: videoId,
      uploadId,
      uploadedById: userId
    });
    
    if (!video) {
      console.error("Video not found or unauthorized:", { videoId, uploadId, userId });
      return NextResponse.json(
        { error: "Upload not found or unauthorized" },
        { status: 404 }
      );
    }
    
    console.log("Found video document:", video._id);
    
    // Generate pre-signed URL for this part
    console.log("Generating presigned URL for part:", partNumber);
    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    
    console.log("Command parameters:", { 
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("Presigned URL generated (redacted):", presignedUrl.substring(0, 50) + "...");
    
    return NextResponse.json({
      presignedUrl,
      partNumber,
    });
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
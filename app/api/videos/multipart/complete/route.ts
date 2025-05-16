// src/app/api/videos/multipart/complete/route.ts
import { NextResponse } from "next/server";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  CompleteMultipartUploadCommand
} from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Video } from "@/models/video";
import { s3Client, bucketName } from "@/lib/s3-client";
import { generateHLSContent } from "@/lib/video-processor";

// Define the types for multipart upload parts
interface UploadPart {
  ETag: string;
  PartNumber: number;
}

export async function POST(req: Request) {
  try {
    console.log("🔒 Authenticating user...");
    const { userId } = await auth();
    if (!userId) {
      console.log("❌ Unauthorized access attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🗄️ Connecting to the database...");
    await connectToDatabase();

    console.log("📦 Parsing request body...");
    let requestData;
    try {
      requestData = await req.json();
      console.log("✅ Request data parsed successfully:", requestData);
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { videoId, key, uploadId, parts } = requestData;
    if (!videoId || !key || !uploadId || !parts || parts.length === 0) {
      console.log("❌ Missing required parameters:", { videoId, key, uploadId, parts });
      return NextResponse.json(
        { error: "Missing required parameters: videoId, key, uploadId, and parts are required" },
        { status: 400 }
      );
    }

    console.log("🔍 Checking if the video exists in the database...");
    const existingVideo = await Video.findById(videoId);
    if (!existingVideo) {
      console.log("❌ Video not found:", videoId);
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // First, complete the multipart upload to finalize the object in S3
    try {
      console.log("🧩 Completing multipart upload in S3...");
      
      // Sort parts with proper TypeScript typing
      const sortedParts = [...parts].sort((a: UploadPart, b: UploadPart) => a.PartNumber - b.PartNumber);
      
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts
        }
      });
      
      const completeResponse = await s3Client.send(completeCommand);
      console.log("✅ Multipart upload completed in S3:", completeResponse.Location);
      
      // Update the database with the processing status
      await Video.findByIdAndUpdate(videoId, {
        status: "processing",
      });
      
    } catch (s3CompleteError) {
      console.error("❌ S3 multipart completion failed:", s3CompleteError);
      await Video.findByIdAndUpdate(videoId, { 
        status: "error", 
        errorMessage: "Failed to complete S3 multipart upload" 
      });
      return NextResponse.json({ 
        error: "Failed to complete S3 multipart upload",
        details: s3CompleteError instanceof Error ? s3CompleteError.message : "Unknown error"
      }, { status: 500 });
    }

    console.log("📁 Defining final storage location...");
    const finalKey = `videos/${videoId}/${existingVideo.fileName}`;
    console.log("🗂️ Final S3 key:", finalKey);

    try {
      console.log("🚚 Moving uploaded file to final location...");
      console.log("📝 Copy source:", `${bucketName}/${key}`);
      
      await s3Client.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${key}`,
        Key: finalKey,
      }));

      console.log("✅ File successfully copied to final location");

      console.log("🗑️ Deleting the temporary upload...");
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));
      console.log("✅ Temporary upload deleted:", key);
    } catch (s3Error) {
      console.error("❌ S3 operation failed:", s3Error);
      await Video.findByIdAndUpdate(videoId, { 
        status: "error", 
        errorMessage: "S3 file operation failed: " + (s3Error instanceof Error ? s3Error.message : String(s3Error))
      });
      return NextResponse.json({ 
        error: "Failed to process video in storage",
        details: s3Error instanceof Error ? s3Error.message : "Unknown error"
      }, { status: 500 });
    }

    try {
      console.log("🎥 Generating HLS content for streaming...");
      const hlsKey = await generateHLSContent(videoId, finalKey);
      console.log("✅ HLS content generated successfully:", hlsKey);

      console.log("📝 Updating video record in the database...");
      await Video.findByIdAndUpdate(videoId, {
        status: "ready",
        videoKey: finalKey,
        hlsKey,
        uploadCompletedAt: new Date(),
      });

      console.log("✅ Video processing completed successfully:", { videoId, videoKey: finalKey, hlsKey });
      return NextResponse.json({ 
        success: true, 
        videoId, 
        videoKey: finalKey, 
        hlsKey,
        message: "Video processing completed successfully"
      });
    } catch (processingError) {
      console.error("❌ Video processing failed:", processingError);
      await Video.findByIdAndUpdate(videoId, { 
        status: "error", 
        errorMessage: "Video processing failed: " + 
          (processingError instanceof Error ? processingError.message : String(processingError))
      });
      return NextResponse.json({ 
        error: "Failed to process video content",
        details: processingError instanceof Error ? processingError.message : "Unknown error"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Unhandled error in complete endpoint:", error);
    return NextResponse.json({ 
      error: "Failed to complete multipart upload", 
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
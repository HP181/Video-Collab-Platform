// src/app/api/videos/multipart/complete/route.ts
import { NextResponse } from "next/server";
import { 
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  PutObjectAclCommand
} from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Video } from "@/models/video";
import { s3Client, bucketName } from "@/lib/s3-client";
import { revalidatePath } from "next/cache";
import { generateHLSContent } from "@/lib/video-processor";

export async function POST(req: Request) {
  try {
    console.log("Complete multipart upload request received");
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check content type for debugging
    const contentType = req.headers.get('content-type');
    console.log("Request content type:", contentType);
    
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", requestData);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    const { 
      uploadId,
      key,
      videoId,
      parts, // Array of { ETag, PartNumber } objects from successful part uploads
    } = requestData;
    
    if (!uploadId || !key || !videoId || !parts || !Array.isArray(parts)) {
      console.error("Missing required parameters:", { uploadId, key, videoId, partsLength: parts?.length });
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    console.log(`Completing upload for videoId: ${videoId}, uploadId: ${uploadId}, with ${parts.length} parts`);
    
    // Validate parts array
    if (parts.length === 0) {
      return NextResponse.json(
        { error: "No parts provided" },
        { status: 400 }
      );
    }
    
    // Verify all parts have ETag and PartNumber
    const validParts = parts.every(part => part.ETag && part.PartNumber);
    if (!validParts) {
      console.error("Invalid parts data:", parts);
      return NextResponse.json(
        { error: "Invalid parts data" },
        { status: 400 }
      );
    }
    
    // Ensure parts are sorted by part number
    parts.sort((a, b) => a.PartNumber - b.PartNumber);
    
    // Validate that the upload exists and belongs to this user
    console.log("Connecting to database...");
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
    
    // Update video status to processing
    console.log("Updating video status to processing...");
    await Video.findByIdAndUpdate(videoId, {
      status: "processing",
    });
    
    // Complete the multipart upload
    console.log("Completing multipart upload in S3...");
    try {
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      });
      
      const completeResponse = await s3Client.send(completeCommand);
      console.log("Multipart upload completed:", completeResponse);
    } catch (s3Error: any) {
      console.error("Error completing multipart upload:", s3Error);
      
      // Even if there's an error with S3, let's try to proceed if possible
      console.warn("Attempting to continue despite S3 error");
    }
    
    // After successful upload, move the file to the videos folder
    const finalKey = `videos/${video._id}/${video.fileName}`;
    
    // Generate HLS content for streaming
    let hlsKey;
    
    try {
      console.log("Moving uploaded file to final location...");
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${key}`,
        Key: finalKey,
      });
      
      await s3Client.send(copyCommand);
      console.log("File moved to:", finalKey);
      
      // Generate HLS content for streaming
      console.log("Generating HLS content...");
      hlsKey = await generateHLSContent(finalKey);
      console.log("HLS content generated at:", hlsKey);
    } catch (processingError) {
      console.error("Error in post-upload processing:", processingError);
      
      // Update video with error status
      await Video.findByIdAndUpdate(videoId, {
        status: "error",
        processingError: "Failed to process video after upload"
      });
      
      return NextResponse.json(
        { error: "Failed to process video after upload" },
        { status: 500 }
      );
    }
    
    // Update the video record
    console.log("Updating video record with final data...");
    await Video.findByIdAndUpdate(videoId, {
      status: "ready",
      videoKey: finalKey,
      hlsKey,
      uploadCompletedAt: new Date(),
    });
    
    // Revalidate paths to update UI
    console.log("Revalidating paths...");
    revalidatePath(`/workspaces/${video.workspaceId}`);
    
    return NextResponse.json({
      success: true,
      videoId,
      videoKey: finalKey,
      hlsKey,
    });
  } catch (error: any) {
    console.error("Unhandled error in complete endpoint:", error);
    
    try {
      // Update video status to error
      const { videoId } = await req.json();
      if (videoId) {
        await Video.findByIdAndUpdate(videoId, {
          status: "error",
          processingError: error.message || "Failed to complete upload",
        });
      }
    } catch (e) {
      // Ignore error during error handling
    }
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to complete multipart upload",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
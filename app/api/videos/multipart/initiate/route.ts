// src/app/api/videos/multipart/initiate/route.ts
import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import Video, { IVideo } from "@/models/video";
import { s3Client, bucketName } from "@/lib/s3-client";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { 
      fileName, 
      fileType, 
      fileSize,
      workspaceId,
      title,
      description = ""
    } = await req.json();
    
    // Generate a unique ID for the upload
    const uploadId = crypto.randomUUID();
    const key = `uploads/${uploadId}/${fileName}`;
    
    // Create multipart upload in S3
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
      Metadata: {
        'original-filename': fileName,
        'user-id': userId,
      },
    });
    
    console.log("Creating multipart upload in S3...");
    const multipartUpload = await s3Client.send(createCommand);
    const s3UploadId = multipartUpload.UploadId;
    
    if (!s3UploadId) {
      throw new Error("Failed to initiate multipart upload");
    }
    
    // Save upload info to the database
    console.log("Connecting to database...");
    await connectToDatabase();
    
    // Create video document
    console.log("Creating video document...");
    
    // Define video data
    const videoData: Partial<IVideo> = {
      title: title || fileName,
      description,
      workspaceId,
      uploadedById: userId,
      fileName,
      fileSize,
      uploadId: s3UploadId,
      s3Key: key,
      status: "uploading",
      viewCount: 0,
    };
    
    // Print the actual data to debug
    console.log("Video data:", JSON.stringify(videoData));
    
    // Create the document
    let video: IVideo;
    try {
      video = new Video(videoData);
      await video.validate(); // Explicitly validate before saving
      await video.save();
      console.log("Video document created successfully");
    } catch (validationError) {
      if (validationError instanceof Error) {
        console.error("Validation error:", validationError.message);
        return NextResponse.json(
          { error: `Validation error: ${validationError.message}` },
          { status: 400 }
        );
      } else {
        console.error("Unknown validation error:", validationError);
        return NextResponse.json(
          { error: "Unknown validation error" },
          { status: 500 }
        );
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      uploadId: s3UploadId,
      key,
      videoId: video._id.toString(),
    });
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error initiating multipart upload:", error.message);
      return NextResponse.json(
        { 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          details: error.toString()
        },
        { status: 500 }
      );
    } else {
      console.error("Unknown error during upload initiation:", error);
      return NextResponse.json(
        { 
          error: "Unknown error during upload initiation",
          details: String(error)
        },
        { status: 500 }
      );
    }
  }
}

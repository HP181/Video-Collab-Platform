// src/lib/actions/video.ts
'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongodb";
import Video, { IVideo } from "@/models/video";
import Workspace from "@/models/workspace";
import User from "@/models/user";
import { 
  CompleteMultipartUploadCommand, 
  AbortMultipartUploadCommand 
} from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3-client";
import { Types } from "mongoose";

/**
 * Get videos for a workspace
 */
export async function getWorkspaceVideos(workspaceId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Check if the workspace exists and the user has access
    const workspace = await Workspace.findById(workspaceId).lean();
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is a member or owner
    // Use type assertion to help TypeScript understand the structure
    const workspaceData = workspace as any;
    const isMember = workspaceData.members.some((member: { userId: string }) => member.userId === userId);
    const isOwner = workspaceData.ownerId === userId;
    
    if (!isMember && !isOwner) {
      throw new Error("You don't have access to this workspace");
    }
    
    // Get the videos
    const videos = await Video.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Get uploader details
    const uploaderIds = [...new Set(videos.map(video => video.uploadedById))];
    const uploaders = await User.find({ clerkId: { $in: uploaderIds } }).lean();
    
    // Map uploader details to videos
    const videosWithUploaderInfo = videos.map(video => {
      const uploader = uploaders.find(u => (u as any).clerkId === video.uploadedById);
      const videoObj = video as any;
      
      return {
        ...videoObj,
        _id: videoObj._id.toString(),
        workspaceId: videoObj.workspaceId.toString(),
        uploader: {
          id: videoObj.uploadedById,
          name: uploader ? (uploader as any).name || "Unknown User" : "Unknown User",
          email: uploader ? (uploader as any).email || "" : "",
          profileImage: uploader ? (uploader as any).profileImage || "" : "",
        },
      };
    });
    
    return { success: true, videos: videosWithUploaderInfo };
  } catch (error: any) {
    return { success: false, error: error.message, videos: [] };
  }
}

/**
 * Get a single video by ID
 */
export async function getVideo(videoId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Get the video
const video = await Video.findById(videoId).lean();
    
    if (!video) {
      throw new Error("Video not found");
    }
    
    // Get the workspace
    const workspace = await Workspace.findById(video.workspaceId).lean();
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is a member or owner
    // Add proper type casting to ensure TypeScript knows workspace has members
    const workspaceData = workspace as any;
    const isMember = workspaceData.members.some((member: { userId: string }) => member.userId === userId);
    const isOwner = workspaceData.ownerId === userId;
    
    if (!isMember && !isOwner) {
      throw new Error("You don't have access to this video");
    }
    
    // Get uploader details
// Get uploader details
    const uploader = await User.findOne({ clerkId: video.uploadedById }).lean();
    
    // Increment view count (could be more sophisticated with unique views)
    await Video.findByIdAndUpdate(videoId, { $inc: { viewCount: 1 } });
    
    // Convert MongoDB ObjectId to string for all ID fields
    const serializedVideo = {
      ...video,
      _id: video._id.toString(),
      workspaceId: video.workspaceId.toString(),
      // Serialize any other ObjectId fields
      chunkParts: video.chunkParts ? video.chunkParts.map((part: any) => ({
        ...part,
        _id: part._id ? part._id.toString() : undefined
      })) : [],
      uploader: {
        id: video.uploadedById,
        name: uploader ? (uploader as any).name || "Unknown User" : "Unknown User",
        email: uploader ? (uploader as any).email || "" : "",
        profileImage: uploader ? (uploader as any).profileImage || "" : "",
      },
      workspace: {
        id: (workspace as any)._id.toString(),
        name: (workspace as any).name,
        slug: (workspace as any).slug,
      },
      // Convert dates to ISO strings
      createdAt: video.createdAt ? video.createdAt.toISOString() : undefined,
      updatedAt: video.updatedAt ? video.updatedAt.toISOString() : undefined,
      uploadCompletedAt: video.uploadCompletedAt ? video.uploadCompletedAt.toISOString() : undefined,
    };
    
    return {
      success: true,
      video: serializedVideo,
    };
  } catch (error: any) {
    console.error("Error getting video:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update video metadata
 */
export async function updateVideo(videoId: string, data: { title?: string; description?: string }) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Get the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      throw new Error("Video not found");
    }
    
    // Check if user is the uploader or workspace owner
    const isUploader = video.uploadedById === userId;
    
    if (!isUploader) {
      const workspace = await Workspace.findById(video.workspaceId);
      
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      
      const isWorkspaceOwner = workspace.ownerId === userId;
      const isAdmin = workspace.members.some(
        (member: { userId: string; role: string }) => member.userId === userId && member.role === "admin"
      );
      
      if (!isWorkspaceOwner && !isAdmin) {
        throw new Error("You don't have permission to update this video");
      }
    }
    
    // Update the video
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
      { new: true }
    );
    
    // Get the workspace for revalidation
    const workspace = await Workspace.findById(video.workspaceId);
    
    if (workspace) {
      revalidatePath(`/workspaces/${workspace.slug}`);
    }
    
    revalidatePath(`/videos/${videoId}`);
    
    return { success: true, video: updatedVideo };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a video
 */
export async function deleteVideo(videoId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Get the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      throw new Error("Video not found");
    }
    
    // Check if user is the uploader or workspace owner
    const isUploader = video.uploadedById === userId;
    
    if (!isUploader) {
      const workspace = await Workspace.findById(video.workspaceId);
      
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      
      const isWorkspaceOwner = workspace.ownerId === userId;
      const isAdmin = workspace.members.some(
        (member: { userId: string; role: string }) => member.userId === userId && member.role === "admin"
      );
      
      if (!isWorkspaceOwner && !isAdmin) {
        throw new Error("You don't have permission to delete this video");
      }
    }
    
    // If the video is still uploading, abort the multipart upload
    if (video.status === 'uploading' && video.uploadId) {
      try {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: video.s3Key,
          UploadId: video.uploadId,
        });
        
        await s3Client.send(abortCommand);
      } catch (error) {
        console.error("Error aborting multipart upload:", error);
        // Continue with deletion even if abort fails
      }
    }
    
    // Delete the video from the database
    await Video.findByIdAndDelete(videoId);
    
    // Get the workspace for revalidation
    const workspace = await Workspace.findById(video.workspaceId);
    
    if (workspace) {
      revalidatePath(`/workspaces/${workspace.slug}`);
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update multipart upload parts
 */
export async function updateMultipartUploadParts(
  videoId: string, 
  uploadId: string, 
  part: { ETag: string, PartNumber: number }
) {
  try {
    console.log(`Updating part ${part.PartNumber} for video ${videoId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    console.log(`Finding video document... videoId: ${videoId}, uploadId: ${uploadId}`);
    
    // Get the video (explicitly type as IVideo)
    const video = await Video.findOne({
      _id: new Types.ObjectId(videoId),
      uploadId,
      uploadedById: userId
    }) as IVideo | null;
    
    if (!video) {
      console.error(`Video not found: videoId=${videoId}, uploadId=${uploadId}, userId=${userId}`);
      throw new Error("Video not found or unauthorized");
    }
    
    console.log(`Found video document. Adding part ${part.PartNumber} to chunkParts`);
    
    // Add the part to the video
    await Video.findByIdAndUpdate(videoId, {
      $push: { chunkParts: part }
    });
    
    console.log(`Part ${part.PartNumber} added successfully`);
    
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating multipart parts:", error);
    return { success: false, error: (error as Error).message };
  }
}
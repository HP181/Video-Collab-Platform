// src/models/video.ts
import mongoose, { Schema, model, models, Model, Document, Types } from 'mongoose';

export interface IVideo extends Document {
  _id: Types.ObjectId;  // Explicitly define the _id type
  title: string;
  description?: string;
  workspaceId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  uploadId: string;
  s3Key: string;
  videoKey?: string;
  hlsKey?: string;
  duration?: number;
  thumbnailUrl?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  processingError?: string;
  uploadCompletedAt?: Date;
  resolution?: '720p' | '1080p';
  viewCount: number;
  chunkParts?: Array<{ ETag: string, PartNumber: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true },
    description: { type: String },
    workspaceId: { type: String, required: true },
    uploadedById: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadId: { type: String, required: true },
    s3Key: { type: String, required: true },
    videoKey: { type: String },
    hlsKey: { type: String },
    duration: { type: Number },
    thumbnailUrl: { type: String },
    status: { 
      type: String, 
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
      required: true 
    },
    processingError: { type: String },
    uploadCompletedAt: { type: Date },
    resolution: { 
      type: String, 
      enum: ['720p', '1080p'],
      default: '720p',
    },
    viewCount: { type: Number, default: 0 },
    chunkParts: [{ 
      ETag: { type: String },
      PartNumber: { type: Number }
    }],
  },
  { timestamps: true }
);

// Create indexes for faster queries
VideoSchema.index({ workspaceId: 1 });
VideoSchema.index({ uploadedById: 1 });
VideoSchema.index({ status: 1 });
VideoSchema.index({ uploadId: 1 });

// Use existing model or create new model
export const Video: Model<IVideo> = models.Video || model<IVideo>('Video', VideoSchema);

export default Video;

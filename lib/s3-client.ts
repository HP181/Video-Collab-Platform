// src/lib/s3-client.ts
import { S3Client } from '@aws-sdk/client-s3';

// Initialize S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Add the CORS-specific headers
  forcePathStyle: false, // Use virtual-hosted style URLs (default behavior)
});

export const bucketName = process.env.AWS_S3_BUCKET_NAME!;

// For client-side usage - add these to your public env vars in next.config.js
export const publicBucketUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;
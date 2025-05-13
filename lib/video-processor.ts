// src/lib/video-processor.ts
import { 
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3-client";

/**
 * Generates a basic HLS manifest for streaming
 * In a production environment, you would use AWS MediaConvert or similar service
 */
export async function generateHLSContent(videoKey: string): Promise<string> {
  try {
    // For a real implementation, you'd use a service like AWS MediaConvert
    // to transcode the video and create proper HLS content with multiple
    // quality levels. This is a simplified version that just creates
    // a basic manifest file.
    
    // Create the output directory path
    const hlsBasePath = `hls/${videoKey.split('/').slice(1, -1).join('/')}`;
    const hlsKey = `${hlsBasePath}/master.m3u8`;
    
    // Create a simple master playlist
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
playlist.m3u8`;
    
    // Upload the master playlist
    const masterCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: hlsKey,
      Body: masterPlaylist,
      ContentType: 'application/vnd.apple.mpegurl',
    });
    
    await s3Client.send(masterCommand);
    
    // Create a simple playlist that points to the original video
    const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:60
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:60.0,
../../${videoKey}
#EXT-X-ENDLIST`;
    
    // Upload the playlist
    const playlistCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${hlsBasePath}/playlist.m3u8`,
      Body: playlist,
      ContentType: 'application/vnd.apple.mpegurl',
    });
    
    await s3Client.send(playlistCommand);
    
    return hlsKey;
  } catch (error) {
    console.error('Error generating HLS content:', error);
    throw error;
  }
}

/**
 * Generates a temporary public URL for video playback
 */
export async function generateVideoUrl(videoKey: string, expiresIn = 3600): Promise<string> {
  try {
    // For a more production-ready implementation, consider using CloudFront
    // signed URLs instead of direct S3 access
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: videoKey,
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating video URL:', error);
    throw error;
  }
}

/**
 * Gets a signed URL with CORS headers for streaming
 */
async function getSignedUrl(client: S3Client, command: any, options: any): Promise<string> {
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  return getSignedUrl(client, command, options);
}
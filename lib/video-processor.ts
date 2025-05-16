// src/lib/video-processor.ts
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { s3Client, bucketName } from "@/lib/s3-client"; // Import the shared s3Client and bucketName

const chunkDuration = 10; // Duration for each .ts chunk (in seconds)

/**
 * Uploads a file to S3
 */
async function uploadToS3(localPath: string, s3Key: string, contentType: string) {
  console.log(`Uploading ${s3Key} to S3...`);
  console.log(`Using bucket: ${bucketName}`);
  
  const fileStream = fs.createReadStream(localPath);
  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(uploadCommand);
  console.log(`Successfully uploaded ${s3Key} to S3`);
}

/**
 * Downloads a file from S3 to a local path
 */
async function downloadFromS3(s3Key: string, localPath: string) {
  console.log(`Downloading ${s3Key} from S3 to ${localPath}...`);
  console.log(`Using bucket: ${bucketName}`);
  
  // Make sure the directory exists
  fs.ensureDirSync(path.dirname(localPath));
  
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });
    
    console.log(`GetObjectCommand created with Bucket: ${bucketName}, Key: ${s3Key}`);
    
    const response = await s3Client.send(getCommand);
    console.log(`S3 GetObject response received`);
    
    if (!response.Body) {
      throw new Error(`Failed to download file from S3: Empty response body for ${s3Key}`);
    }
    
    // Stream the file to disk
    await pipeline(
      response.Body as Readable,
      fs.createWriteStream(localPath)
    );
    
    console.log(`Successfully downloaded ${s3Key} to ${localPath} (${fs.statSync(localPath).size} bytes)`);
  } catch (error) {
    console.error(`Error in downloadFromS3:`, error);
    console.error(`Bucket: ${bucketName}, Key: ${s3Key}`);
    throw error;
  }
}

/**
 * Generates HLS content for a given video file
 */
export async function generateHLSContent(videoId: string, videoKey: string) {
  console.log(`Starting HLS content generation for video ${videoId}, S3 key: ${videoKey}`);
  console.log(`Using S3 bucket: ${bucketName}`);
  
  try {
    if (!videoId || !videoKey) {
      throw new Error("Both videoId and videoKey are required");
    }

    if (!bucketName) {
      throw new Error("S3 bucket name is undefined. Check environment variables.");
    }

    // Create a temporary file path for the video
    const fileName = path.basename(videoKey);
    const tempDir = path.join("/tmp", videoId);
    const videoLocalPath = path.join(tempDir, fileName);
    
    console.log(`Temporary directory: ${tempDir}`);
    console.log(`Local video path: ${videoLocalPath}`);
    
    // Download the video from S3
    try {
      await downloadFromS3(videoKey, videoLocalPath);
    } catch (error: unknown) {
      console.error(`Error downloading video from S3:`, error);
      // Handle the error properly with type checking
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during download';
      throw new Error(`Failed to download video from S3: ${errorMessage}`);
    }
    
    // Verify the file exists and has content
    if (!fs.existsSync(videoLocalPath)) {
      throw new Error(`Downloaded file ${videoLocalPath} does not exist`);
    }
    
    const fileSize = fs.statSync(videoLocalPath).size;
    if (fileSize === 0) {
      throw new Error(`Downloaded file ${videoLocalPath} is empty (0 bytes)`);
    }
    
    console.log(`Downloaded file verified: ${videoLocalPath} (${fileSize} bytes)`);

    // Define HLS output directory
    const hlsBaseDir = `videos/${videoId}/hls`;
    const hlsLocalDir = path.join(tempDir, 'hls');
    fs.ensureDirSync(hlsLocalDir);

    const resolutions = [
      { name: "720p", width: 1280, height: 720, bitrate: 2800000 },
      { name: "1080p", width: 1920, height: 1080, bitrate: 5000000 },
    ];

    let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";

    for (const res of resolutions) {
      const outputDir = path.join(hlsLocalDir, res.name);
      fs.ensureDirSync(outputDir);

      const playlistPath = path.join(outputDir, "playlist.m3u8");
      const s3PlaylistKey = `${hlsBaseDir}/${res.name}/playlist.m3u8`;

      // Run ffmpeg to create HLS segments
      console.log(`Generating HLS for ${res.name}...`);
      console.log(`Input file: ${videoLocalPath}`);
      console.log(`Output playlist: ${playlistPath}`);
      
      await new Promise((resolve, reject) => {
        ffmpeg(videoLocalPath)
          .outputOptions([
            `-vf scale=${res.width}:${res.height}`,
            "-c:v h264",
            `-b:v ${res.bitrate}`,
            "-c:a aac",
            "-ar 48000",
            "-ac 2",
            "-f hls",
            `-hls_time ${chunkDuration}`,
            "-hls_playlist_type vod",
            `-hls_segment_filename ${outputDir}/chunk%03d.ts`
          ])
          .output(playlistPath)
          .on("start", (commandLine) => {
            console.log(`FFmpeg started with command: ${commandLine}`);
          })
          .on("progress", (progress) => {
            console.log(`FFmpeg progress: ${JSON.stringify(progress)}`);
          })
          .on("end", () => {
            console.log(`HLS generation for ${res.name} completed successfully`);
            resolve(true);
          })
          .on("error", (err, stdout, stderr) => {
            console.error(`Error generating HLS for ${res.name}:`, err);
            console.error(`FFmpeg stdout: ${stdout}`);
            console.error(`FFmpeg stderr: ${stderr}`);
            reject(err);
          })
          .run();
      });

      // Upload segments to S3
      const segmentFiles = fs.readdirSync(outputDir).filter(f => f.endsWith(".ts"));
      console.log(`Uploading ${segmentFiles.length} segments for ${res.name}...`);
      
      for (const segment of segmentFiles) {
        const localSegmentPath = path.join(outputDir, segment);
        const s3SegmentKey = `${hlsBaseDir}/${res.name}/${segment}`;
        await uploadToS3(localSegmentPath, s3SegmentKey, "video/MP2T");
      }

      // Upload the playlist itself
      await uploadToS3(playlistPath, s3PlaylistKey, "application/vnd.apple.mpegurl");

      // Add this resolution to the master playlist
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${res.bitrate},RESOLUTION=${res.width}x${res.height}\n${res.name}/playlist.m3u8\n`;
    }

    // Upload the master playlist
    const masterKey = `${hlsBaseDir}/master.m3u8`;
    const masterPath = path.join(hlsLocalDir, "master.m3u8");
    fs.writeFileSync(masterPath, masterPlaylist);
    await uploadToS3(masterPath, masterKey, "application/vnd.apple.mpegurl");

    // Clean up temp files
    try {
      fs.removeSync(tempDir);
      console.log(`Cleaned up temporary directory ${tempDir}`);
    } catch (error: unknown) {
      // Handle the cleanup error with proper type checking
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      console.warn(`Warning: Failed to clean up temp directory: ${errorMessage}`);
      // Continue execution even if cleanup fails
    }

    console.log("HLS content generated successfully. Master playlist key:", masterKey);
    return hlsBaseDir;
  } catch (error) {
    console.error("Error generating HLS content:", error);
    throw error;
  }
}
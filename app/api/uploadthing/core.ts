// src/app/api/uploadthing/core.ts
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { mux } from "@/lib/mux";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  videoUploader: f({ video: { maxFileSize: "512MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // Get user from clerk auth
      const { userId } = await auth();

      // If no userId, throw an error
      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      // Return metadata to be stored with the file
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Create a new Mux asset from the uploaded file
      try {
        const asset = await mux.video.assets.create({
          inputs: [{ url: file.url }],
          playback_policy: ["public"],
        });

        // Return URL and other metadata
        return {
          uploadedBy: metadata.userId,
          assetId: asset.id,
          playbackId: asset.playback_ids?.[0]?.id,
          status: "processing",
          url: file.url,
        };
      } catch (error) {
        console.error("Error creating Mux asset:", error);
        throw new UploadThingError("Failed to process video");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
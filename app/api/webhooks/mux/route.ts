// src/app/api/webhooks/mux/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import Video from "@/models/video";
import { parseMuxWebhookEvent } from "@/lib/mux";

export async function POST(req: Request) {
  try {
    // Get the raw request body
    const payload = await req.json();
    
    // Get the Mux signature header
    const headersList = await headers();
    const muxSignature = headersList.get("mux-signature") || "";
    
    // Validate the webhook payload
    const event = parseMuxWebhookEvent(payload, muxSignature);
    
    // Process different event types
    if (event.type === "video.asset.ready") {
      await handleAssetReady(event.data);
    } else if (event.type === "video.asset.errored") {
      await handleAssetError(event.data);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 400 });
  }
}

async function handleAssetReady(data: any) {
  try {
    await connectToDatabase();
    
    const assetId = data.id;
    const playbackId = data.playback_ids?.[0]?.id;
    const duration = data.duration;
    
    if (!assetId) {
      console.error("No asset ID in webhook data");
      return;
    }
    
    // Update the video record in the database
    await Video.findOneAndUpdate(
      { muxAssetId: assetId },
      {
        status: "ready",
        duration,
        muxPlaybackId: playbackId,
        thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0` : undefined,
      }
    );
  } catch (error) {
    console.error("Error handling asset ready event:", error);
  }
}

async function handleAssetError(data: any) {
  try {
    await connectToDatabase();
    
    const assetId = data.id;
    
    if (!assetId) {
      console.error("No asset ID in webhook data");
      return;
    }
    
    // Update the video record in the database
    await Video.findOneAndUpdate(
      { muxAssetId: assetId },
      {
        status: "error",
      }
    );
  } catch (error) {
    console.error("Error handling asset error event:", error);
  }
}
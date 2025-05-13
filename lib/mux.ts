// src/lib/mux.ts
import Mux from '@mux/mux-node';

// if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
//   throw new Error('Missing Mux API credentials');
// }

// Create a Mux client
export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || 'cb287dd4-1862-49a2-a87e-fc18a42e6560',
  tokenSecret: process.env.MUX_TOKEN_SECRET || 'WWD10aq1gx7sWp9GKNu+9FXDjLgyQjQIgXlPbbzGiQbfo2CiT6WJ9qZmHLsVJ6KbzmTpwLX3aiz',
});

// Convert duration in seconds to a formatted string (e.g., "5:23")
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Parse Mux webhook event
export function parseMuxWebhookEvent(payload: any, signature: string): any {
  try {
    // In a production environment, you should verify the signature
    // This would require additional implementation for security
    return payload;
  } catch (error) {
    console.error('Error parsing Mux webhook:', error);
    throw new Error('Failed to parse webhook event');
  }
}

// Generate a unique filename for uploads
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const extension = originalName.split('.').pop();
  
  return `${timestamp}-${random}.${extension}`;
}

// Get Mux playback URL
export function getMuxPlaybackUrl(playbackId: string, thumbnailTime?: number): string {
  if (!playbackId) return '';
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Get Mux thumbnail URL
export function getMuxThumbnailUrl(playbackId: string, thumbnailTime?: number): string {
  if (!playbackId) return '';
  const time = thumbnailTime || 0;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
}

// Get Mux poster URL
export function getMuxPosterUrl(playbackId: string, thumbnailTime?: number): string {
  if (!playbackId) return '';
  const time = thumbnailTime || 0;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
}

// Get video resolution options based on subscription tier
export function getResolutionOptions(tier: 'free' | 'pro'): string[] {
  return tier === 'free' 
    ? ['720p'] 
    : ['720p', '1080p'];
}

// Get max video resolution based on subscription tier
export function getMaxResolution(tier: 'free' | 'pro'): string {
  return tier === 'free' ? '720p' : '1080p';
}
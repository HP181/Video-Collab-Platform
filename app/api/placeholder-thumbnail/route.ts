// src/app/api/videos/[id]/thumbnail/route.ts
import { NextResponse } from "next/server";




// src/app/api/placeholder-thumbnail/route.ts
export function GET() {
  // Generate a simple placeholder thumbnail with a video icon
  const width = 1280;
  const height = 720;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#1e293b" />
      <rect x="${width * 0.1}" y="${height * 0.1}" width="${width * 0.8}" height="${height * 0.8}" rx="20" fill="#334155" />
      <path d="M${width * 0.5 - 50},${height * 0.5 - 40} a10,10 0 0 1 10,-10 h80 a10,10 0 0 1 10,10 v80 a10,10 0 0 1 -10,10 h-80 a10,10 0 0 1 -10,-10 z" fill="#94a3b8" />
      <path d="M${width * 0.5 - 10},${height * 0.5 - 30} l50,40 l-50,40 z" fill="#f8fafc" />
    </svg>
  `;
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
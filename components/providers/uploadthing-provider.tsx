// src/components/providers/uploadthing-provider.tsx
"use client";

import { ReactNode } from "react";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";

export function UploadthingProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
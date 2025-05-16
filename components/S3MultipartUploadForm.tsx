// src/components/S3MultipartUploadForm.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const videoFormSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

export function S3MultipartUploadForm({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const router = useRouter();

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: { title: "", description: "" },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log("📁 File selected:", file.name);
      setSelectedFile(file);
      const defaultTitle = file.name.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      form.setValue("title", defaultTitle);
    }
  }, [form]);

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1
  });

  const initiateMultipartUpload = async (file: File, values: VideoFormValues) => {
    try {
      console.log("🚀 Starting multipart upload...");
      const response = await fetch("/api/videos/multipart/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          workspaceId,
          title: values.title,
          description: values.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate upload");
      }

      const data = await response.json();
      console.log("✅ Multipart upload initiated:", data);
      return data;
    } catch (error) {
      console.error("❌ Error initiating multipart upload:", error);
      toast.error("Failed to initiate upload. Please try again.");
      throw error;
    }
  };

  const uploadPart = async (
    partNumber: number, 
    chunk: Blob, 
    uploadId: string, 
    key: string, 
    videoId: string
  ) => {
    try {
      console.log(`🚀 Requesting presigned URL for part ${partNumber}...`);
      
      const presignedResponse = await fetch("/api/videos/multipart/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          key,
          videoId,
          partNumber,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || `Failed to get presigned URL for part ${partNumber}`);
      }

      const { presignedUrl } = await presignedResponse.json();
      console.log(`🔗 Received presigned URL for part ${partNumber}`);

      // Create an abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(presignedUrl, {
        method: "PUT",
        body: chunk,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to upload part ${partNumber}: ${response.statusText}`);
      }

      const ETag = response.headers.get("ETag")?.replace(/"/g, "") || "";
      console.log(`✅ Part ${partNumber} uploaded successfully. ETag: ${ETag}`);

      return { ETag, PartNumber: partNumber };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`🛑 Upload of part ${partNumber} was aborted`);
        return null;
      }
      console.error(`❌ Error uploading part ${partNumber}:`, error);
      throw error;
    }
  };

  const completeUpload = async (
    uploadId: string, 
    videoId: string, 
    key: string, 
    parts: { ETag: string; PartNumber: number }[]
  ) => {
    try {
      console.log("🚀 Completing multipart upload...");
      console.log("✅ Final parts list:", parts);

      const response = await fetch("/api/videos/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          videoId,
          key,
          parts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete upload");
      }

      const data = await response.json();
      console.log("✅ Multipart upload completed successfully:", data);
      toast.success("Video upload completed successfully!");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("❌ Error completing multipart upload:", error);
      toast.error("Upload failed. Please try again.");
      throw error;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      toast.info("Upload cancelled");
    }
  };

  const onSubmit = async (values: VideoFormValues) => {
    try {
      if (!selectedFile) {
        toast.error("Please select a file before uploading.");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      
      // Step 1: Initiate the multipart upload
      const data = await initiateMultipartUpload(selectedFile, values);
      const { uploadId, key, videoId } = data;

      if (!uploadId || !key || !videoId) {
        throw new Error("Invalid response from server when initiating upload");
      }

      // Step 2: Upload all parts
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);
      console.log(`🗂️ Total chunks: ${totalChunks}`);

      const parts: { ETag: string; PartNumber: number }[] = [];
      
      // Upload parts sequentially to avoid overwhelming the server
      for (let i = 0; i < totalChunks; i++) {
        if (!abortControllerRef.current) {
          abortControllerRef.current = new AbortController();
        }
        
        const partNumber = i + 1;
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, selectedFile.size);
        const chunk = selectedFile.slice(start, end);
        
        console.log(`🚀 Uploading part ${partNumber}...`);
        
        const part = await uploadPart(partNumber, chunk, uploadId, key, videoId);
        
        if (part === null) {
          // Upload was aborted
          setIsUploading(false);
          return;
        }
        
        parts.push(part);
        
        // Update progress
        setUploadProgress(Math.round((partNumber / totalChunks) * 100));
      }

      // Step 3: Complete the multipart upload
      await completeUpload(uploadId, videoId, key, parts);
      
      // Reset state
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      form.reset();
      
    } catch (error) {
      setIsUploading(false);
      console.error("❌ Upload error:", error);
      toast.error("Upload failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isUploading) {
        setOpen(newOpen);
        if (!newOpen) {
          setSelectedFile(null);
          setUploadProgress(0);
          form.reset();
        }
      } else if (!newOpen) {
        toast.info("Please wait for the upload to complete or cancel it first");
      }
    }}>
      <DialogTrigger asChild>
        <Button><Upload className="mr-2 h-4 w-4" /> Upload Video</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div {...getRootProps()} className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition">
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <span className="font-medium truncate">{selectedFile.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p>Drag & drop a video file here, or click to select</p>
                    <p className="text-xs text-muted-foreground">
                      Supports MP4, MOV, AVI, and WEBM formats
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter video title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description (optional)</label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Enter video description"
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>

            {(uploadProgress > 0 || isUploading) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <DialogFooter className="sm:justify-between">
              {isUploading ? (
                <Button type="button" variant="outline" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={!selectedFile || isUploading}
                className="min-w-24"
              >
                {isUploading ? "Uploading..." : "Upload Video"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
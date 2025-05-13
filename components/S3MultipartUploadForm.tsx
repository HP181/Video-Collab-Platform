"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { updateMultipartUploadParts } from "@/actions/video";

// Define form validation schema
const videoFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }).max(100, {
    message: "Title cannot be longer than 100 characters."
  }),
  description: z.string().max(1000, {
    message: "Description cannot be longer than 1000 characters."
  }).optional(),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

type S3MultipartUploadFormProps = {
  workspaceId: string;
  onSuccess?: () => void;
};

// Constants for multipart upload
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export function S3MultipartUploadForm({ workspaceId, onSuccess }: S3MultipartUploadFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedParts, setUploadedParts] = useState<{ ETag: string, PartNumber: number }[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const router = useRouter();

  // Initialize form
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error("Invalid file", {
          description: "Please select a video file",
        });
        return;
      }
      
      // Validate file size (e.g., limit to 2GB)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Please select a video file smaller than 2GB",
        });
        return;
      }
      
      setSelectedFile(file);
      
      // Auto-populate title from filename if empty
      const fileName = file.name.split(".")[0];
      const formattedName = fileName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      
      if (!form.getValues("title")) {
        form.setValue("title", formattedName);
      }
    }
  }, [form, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Calculate total chunks for a file
  const calculateTotalChunks = (fileSize: number) => {
    return Math.ceil(fileSize / CHUNK_SIZE);
  };

  // Initiate multipart upload
  const initiateMultipartUpload = async (file: File, formValues: VideoFormValues) => {
    try {
      const response = await fetch('/api/videos/multipart/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          workspaceId,
          title: formValues.title,
          description: formValues.description,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate upload');
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error initiating multipart upload:', error);
      throw error;
    }
  };

 // Upload a single part
  const uploadPart = async (
    file: File,
    uploadId: string,
    key: string,
    partNumber: number,
    abortController: AbortController,
    videoId: string  // Add videoId as a parameter
  ) => {
    console.log(`Uploading part ${partNumber}...`);
    
    try {
      // Get a pre-signed URL for this part
      console.log(`Requesting presigned URL for part ${partNumber}...`);
      console.log(`Request params:`, { uploadId, key, videoId, partNumber });
      
      const response = await fetch('/api/videos/multipart/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          key,
          videoId,  // Make sure videoId is included here
          partNumber,
        }),
      });
      
      if (!response.ok) {
        console.error(`Error response from presigned URL API:`, response.status, response.statusText);
        const errorText = await response.text();
        console.error(`Error response body:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `Failed to get presigned URL for part ${partNumber}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Got presigned URL for part ${partNumber}`);
      
      const { presignedUrl } = data;
      
      // Calculate chunk start and end positions
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      
      console.log(`Uploading part ${partNumber} (${start}-${end}) directly to S3...`);
      
      // Upload the chunk to S3 - add mode: 'cors' to help with CORS issues
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: chunk,
        signal: abortController.signal,
        mode: 'cors',
        headers: {
          'Content-Type': file.type,
          'Content-Length': `${end - start}`,
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      console.log(`Part ${partNumber} uploaded successfully`);
      
      // Get the ETag from the response headers
      const ETag = uploadResponse.headers.get('ETag')?.replace(/"/g, '') || '';
      
      if (!ETag) {
        console.warn(`No ETag returned for part ${partNumber}, generating a fake one for testing`);
        // If no ETag (might happen due to CORS), generate a fake one for testing
        const fakeETag = `part${partNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        // Update the server about this part
        await updateMultipartUploadParts(videoId, uploadId, {
          ETag: fakeETag, 
          PartNumber: partNumber,
        });
        
        return { ETag: fakeETag, PartNumber: partNumber };
      }
      
      console.log(`Got ETag for part ${partNumber}: ${ETag}`);
      
      // Update the server about this part
      await updateMultipartUploadParts(videoId, uploadId, {
        ETag,
        PartNumber: partNumber,
      });
      
      return { ETag, PartNumber: partNumber };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Upload aborted by user');
        throw new Error('Upload aborted by user');
      }
      console.error(`Error uploading part ${partNumber}:`, error);
      throw error;
    }
  };
  
  // Complete multipart upload
  const completeMultipartUpload = async (
    uploadId: string,
    key: string,
    parts: { ETag: string, PartNumber: number }[]
  ) => {
    try {
      const response = await fetch('/api/videos/multipart/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          key,
          videoId,
          parts,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete upload');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error completing multipart upload:', error);
      throw error;
    }
  };

  // Cancel upload
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedParts([]);
    setUploadId(null);
    setKey(null);
    setVideoId(null);
    
    toast.warning("Upload cancelled",{
      description: "Your video upload has been cancelled",
    });
  };

  // Upload all parts
      const uploadAllParts = async (file: File, uploadId: string, key: string, videoId: string) => {
        const totalParts = calculateTotalChunks(file.size);
        const parts: { ETag: string, PartNumber: number }[] = [];
        
        // Create a new abort controller
        abortControllerRef.current = new AbortController();
        
        // Upload each part sequentially
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          try {
            const part = await uploadPart(file, uploadId, key, partNumber, abortControllerRef.current, videoId);
            parts.push(part);
            setUploadedParts(prev => [...prev, part]);
            
            // Update progress
            setUploadProgress(Math.round((partNumber / totalParts) * 100));
          } catch (error: any) {
            if (error.message === 'Upload aborted by user') {
              return null; // Upload was cancelled
            }
            throw error;
          }
        }
        
        return parts;
      };

  // Handle form submission
  const onSubmit = async (values: VideoFormValues) => {
    if (!selectedFile) {
      toast.error("No file selected",{
        description: "Please select a video file to upload",
      });
      return;
    }
    
    setIsSubmitting(true);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      console.log("Starting upload process for file:", selectedFile.name);
      
      // Step 1: Initiate multipart upload
      console.log("Initiating multipart upload...");
      const initResponse = await fetch('/api/videos/multipart/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          workspaceId,
          title: values.title,
          description: values.description,
        }),
      });
      
      if (!initResponse.ok) {
        let errorMessage = 'Failed to initiate upload';
        try {
          const errorData = await initResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      const initData = await initResponse.json();
      console.log("Multipart upload initiated:", initData);
      
      // Save important data from response
      const newUploadId = initData.uploadId;
      const newKey = initData.key;
      const newVideoId = initData.videoId;
      
      // Set state for these values
      setUploadId(newUploadId);
      setKey(newKey);
      setVideoId(newVideoId);
      
      console.log("State updated with upload info:", { 
        uploadId: newUploadId, 
        key: newKey, 
        videoId: newVideoId 
      });
      
      // Validate that we have the necessary data
      if (!newUploadId || !newKey || !newVideoId) {
        throw new Error("Missing required upload data from server");
      }
      
      // Step 2: Upload all parts
      console.log("Beginning to upload parts...");
      const totalChunks = calculateTotalChunks(selectedFile.size);
      const parts: { ETag: string, PartNumber: number }[] = [];
      
      // Create a new abort controller
      abortControllerRef.current = new AbortController();
      
      // Upload each part sequentially
      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        try {
          console.log(`Uploading part ${partNumber} of ${totalChunks}...`);
          
          const part = await uploadPart(
            selectedFile, 
            newUploadId, 
            newKey, 
            partNumber, 
            abortControllerRef.current,
            newVideoId  // Pass the videoId here
          );
          
          parts.push(part);
          setUploadedParts(prev => [...prev, part]);
          
          // Update progress
          setUploadProgress(Math.round((partNumber / totalChunks) * 100));
          console.log(`Progress: ${Math.round((partNumber / totalChunks) * 100)}%`);
        } catch (error: any) {
          if (error.message === 'Upload aborted by user') {
            console.log("Upload was aborted by user");
            return;
          }
          throw error;
        }
      }
      
      if (parts.length === 0) {
        throw new Error("No parts were uploaded successfully");
      }
      
      // Step 3: Complete multipart upload
      console.log("All parts uploaded. Completing multipart upload...");
      const completeResponse = await fetch('/api/videos/multipart/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: newUploadId,
          key: newKey,
          videoId: newVideoId,
          parts,
        }),
      });
      
      if (!completeResponse.ok) {
        let errorMessage = 'Failed to complete upload';
        try {
          const errorData = await completeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignore parse errors
        }
        throw new Error(errorMessage);
      }
      
      console.log("Upload completed successfully!");
      
      toast.success("Video uploaded",{
        description: "Your video has been uploaded and is now processing.",
      });
      
      // Reset form and state
      form.reset();
      setSelectedFile(null);
      setUploadId(null);
      setKey(null);
      setVideoId(null);
      setUploadedParts([]);
      
      // Close dialog
      setOpen(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Refresh the workspace page
      router.refresh();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload Error",{
        description: error.message || "An error occurred during upload",
      });
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  };

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setIsSubmitting(false);
      setUploadId(null);
      setKey(null);
      setVideoId(null);
      setUploadedParts([]);
      
      // Cancel any ongoing upload
      if (isUploading) {
        cancelUpload();
      }
    }
    setOpen(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>
            Upload a video to your workspace. The video will be processed and made available for viewing.
          </DialogDescription>
        </DialogHeader>
        
        {/* File Selection */}
        <div className="space-y-4">
          {!selectedFile ? (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                isDragActive ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileVideo className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drag & drop a video file here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP4, WebM, MOV, AVI up to 2GB
              </p>
            </div>
          ) : (
            <div className="border rounded-md p-4 bg-muted/40 relative">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                  <FileVideo className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          )}
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading{uploadProgress < 100 ? '...' : ' - Finalizing'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              {uploadProgress < 100 && (
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={cancelUpload}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Video Details Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter video title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedFile || isUploading}
              >
                {isSubmitting 
                  ? uploadProgress < 100 
                    ? "Uploading..." 
                    : "Processing..." 
                  : "Upload Video"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
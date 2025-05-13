"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Upload, X } from "lucide-react";
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
import { toast } from "sonner";
import { UploadDropzone } from "@/lib/uploadthing"
import { createVideo } from "@/actions/video";

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

type VideoUploadFormProps = {
  workspaceId: string;
  onSuccess?: () => void;
};

export function VideoUploadForm({ workspaceId, onSuccess }: VideoUploadFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<{
    assetId?: string;
    playbackId?: string;
  } | null>(null);
  const router = useRouter();

  // Initialize form
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: VideoFormValues) {
    if (!uploadComplete || !uploadData) {
      setUploadError("Please upload a video first");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await createVideo({
        title: values.title,
        description: values.description,
        workspaceId,
        muxAssetId: uploadData.assetId,
        muxPlaybackId: uploadData.playbackId,
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Video uploaded", {
        description: "Your video has been uploaded and is now processing.",
      });
      
      // Reset form
      form.reset();
      setUploadComplete(false);
      setUploadData(null);
      
      // Close dialog
      setOpen(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Refresh the workspace page
      router.refresh();
    } catch (error: any) {
      toast.error( error.message || "Failed to create video", {
        description: error.message || "Failed to create video",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      form.reset();
      setUploadComplete(false);
      setUploadData(null);
      setUploadError(null);
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
        
        {/* Upload Dropzone */}
        {!uploadComplete && (
          <div className="space-y-4">
            <UploadDropzone
              endpoint="videoUploader"
              onClientUploadComplete={(res: Array<{ 
                name: string; 
                url: string; 
                assetId?: string; 
                playbackId?: string; 
              }>) => {
                const uploadedFile = res[0];
                if (uploadedFile) {
                  setUploadComplete(true);
                  setUploadData({
                    assetId: uploadedFile.assetId,
                    playbackId: uploadedFile.playbackId,
                  });
                  setUploadError(null);
                  
                  // Auto-populate title from filename if empty
                  if (!form.getValues("title")) {
                    const filename = uploadedFile.name.split(".")[0];
                    const formattedName = filename
                      .replace(/[-_]/g, " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase());
                    form.setValue("title", formattedName);
                  }
                }
              }}
              onUploadError={(error: Error) => {
                setUploadError(error.message);
                toast.error(error.message, {
                  description: error.message,
                });
              }}
            />
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>
        )}
        
        {/* Upload Complete State */}
        {uploadComplete && (
          <div className="border rounded-md p-4 bg-muted/40 relative">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Video uploaded successfully</p>
                <p className="text-sm text-muted-foreground">
                  Your video is being processed and will be available shortly.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                setUploadComplete(false);
                setUploadData(null);
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        )}
        
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
                disabled={isSubmitting || !uploadComplete}
              >
                {isSubmitting ? "Creating..." : "Create Video"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
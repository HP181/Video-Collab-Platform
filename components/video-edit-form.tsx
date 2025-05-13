"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { updateVideo } from "@/actions/video";

// Define form validation schema
const videoEditSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }).max(100, {
    message: "Title cannot be longer than 100 characters."
  }),
  description: z.string().max(1000, {
    message: "Description cannot be longer than 1000 characters."
  }).optional(),
});

type VideoEditValues = z.infer<typeof videoEditSchema>;

type VideoItem = {
  _id: string;
  title: string;
  description?: string;
  status: "uploading" | "processing" | "ready" | "error";
  hlsKey?: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
    profileImage: string;
  };
};

type VideoEditFormProps = {
  video: VideoItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function VideoEditForm({
  video,
  open,
  onOpenChange,
  onSuccess,
}: VideoEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with current video data
  const form = useForm<VideoEditValues>({
    resolver: zodResolver(videoEditSchema),
    defaultValues: {
      title: video.title,
      description: video.description || "",
    },
  });

  // Handle form submission
  async function onSubmit(values: VideoEditValues) {
    setIsSubmitting(true);
    
    try {
      const response = await updateVideo(video._id, {
        title: values.title,
        description: values.description,
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Video updated", {
        description: "Your video has been updated successfully.",
      });
      
      // Close dialog
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update video", {
        description: error.message || "Failed to update video",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update your video's title and description.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
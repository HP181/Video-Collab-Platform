"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createWorkspace, updateWorkspace } from "@/actions/workspace";

// Define form validation schema
const workspaceFormSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "Workspace name must be at least 3 characters.",
    })
    .max(50, {
      message: "Workspace name cannot be longer than 50 characters.",
    }),
  description: z
    .string()
    .max(500, {
      message: "Description cannot be longer than 500 characters.",
    })
    .optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

type WorkspaceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    id?: string;
    name: string;
    description?: string;
  };
  type: "create" | "edit";
};

export function WorkspaceForm({
  open,
  onOpenChange,
  defaultValues,
  type,
}: WorkspaceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Initialize form with default values or empty values
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
    },
  });

  // Handle form submission
  async function onSubmit(values: WorkspaceFormValues) {
    setIsSubmitting(true);
    
    try {
      if (type === "create") {
        // Create new workspace
        const response = await createWorkspace(values);
        
        if (!response.success) {
          throw new Error(response.error);
        }
        
        // Use Sonner for success notification
        toast.success("Workspace created successfully!", {
          description: "Your workspace has been created successfully.",
        });
        
        // Redirect to the workspaces page
        router.push("/workspaces");
        router.refresh();
      } else {
        // Update existing workspace
        if (!defaultValues?.id) {
          throw new Error("Workspace ID is required for updating");
        }
        
        const response = await updateWorkspace(defaultValues.id, values);
        
        if (!response.success) {
          throw new Error(response.error);
        }
        
        toast.success("Workspace updated successfully!", {
          description: "Your workspace has been updated successfully.",
        });
        
        router.refresh();
      }
      
      // Close the dialog
      onOpenChange(false);
    } catch (error: any) {
      // Use Sonner for error notification
      toast.error(error.message || "Something went wrong", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === "create" ? "Create Workspace" : "Edit Workspace"}
          </DialogTitle>
          <DialogDescription>
            {type === "create"
              ? "Create a new workspace to organize your videos and collaborate with your team."
              : "Update your workspace details."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Workspace" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your workspace (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : type === "create" ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

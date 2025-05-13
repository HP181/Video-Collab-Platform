"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { IWorkspace } from "@/models/workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { deleteWorkspace } from "@/actions/workspace";
import { WorkspaceForm } from "./WorkspaceForm";

type WorkspaceCardProps = {
  workspace: IWorkspace;
  isOwner: boolean;
};

export function WorkspaceCard({ workspace, isOwner }: WorkspaceCardProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const router = useRouter();

  // Handle workspace deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteWorkspace(workspace._id.toString());
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      // Use Sonner for toast notifications
      toast.success("Workspace deleted successfully!", {
        description: "Your workspace has been deleted successfully.",
      });
      
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{workspace.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                Created {formatDate(workspace.createdAt)}
              </CardDescription>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowEditDialog(true)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteAlert(true)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {workspace.description || "No description provided."}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted/50 p-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-1 h-4 w-4" />
            {workspace.members.length + 1} member{workspace.members.length > 0 ? "s" : ""}
          </div>
          <Link href={`/workspaces/${workspace.slug}`}>
            <Button size="sm" variant="default">
              Open Workspace
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Edit Workspace Dialog */}
      <WorkspaceForm
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        type="edit"
        defaultValues={{
          id: workspace._id.toString(),
          name: workspace.name,
          description: workspace.description,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace "{workspace.name}" and all its videos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

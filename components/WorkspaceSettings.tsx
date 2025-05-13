"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteWorkspace } from "@/actions/workspace";
import { WorkspaceForm } from "@/components/WorkspaceForm";

type WorkspaceSettingsProps = {
  workspace: IWorkspace;
};

export function WorkspaceSettings({ workspace }: WorkspaceSettingsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Handle workspace deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteWorkspace(workspace._id.toString());
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Workspace deleted", {
        description: "Your workspace has been deleted successfully.",
      });
      
      router.push("/workspaces");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", {
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Manage your workspace settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-medium">Workspace Name</h3>
            <p>{workspace.name}</p>
          </div>
          <div className="space-y-2 mt-4">
            <h3 className="font-medium">Description</h3>
            <p>{workspace.description || "No description provided."}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <Button
            variant="outline"
            onClick={() => setShowEditDialog(true)}
          >
            Edit Workspace
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteAlert(true)}
          >
            Delete Workspace
          </Button>
        </CardFooter>
      </Card>

      {/* Storage Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>
            Manage your workspace storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Videos</span>
                <span className="font-medium">0 MB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-0"></div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Free tier includes up to 2GB of storage. Upgrade to Pro for 50GB of storage and additional features.
            </p>
          </div>
        </CardContent>
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
    </div>
  );
}
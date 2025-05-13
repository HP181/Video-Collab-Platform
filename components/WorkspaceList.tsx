"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { IWorkspace } from "@/models/workspace";
import { Button } from "@/components/ui/button";
import { WorkspaceCard } from "./WorkspaceCard"
import { WorkspaceForm } from "./WorkspaceForm";

type WorkspaceListProps = {
  workspaces: IWorkspace[];
  isOwnerMap: Record<string, boolean>;
};

export function WorkspaceList({ workspaces, isOwnerMap }: WorkspaceListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Workspaces</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a workspace to start collaborating on videos.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace._id.toString()}
              workspace={workspace}
              isOwner={isOwnerMap[workspace._id.toString()]}
            />
          ))}
        </div>
      )}

      <WorkspaceForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        type="create"
      />
    </div>
  );
}
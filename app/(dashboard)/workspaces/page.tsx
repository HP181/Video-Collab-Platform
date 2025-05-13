import { Suspense } from "react";
import { getUserWorkspaces } from "@/actions/workspace";
import { WorkspaceList } from "@/components/WorkspaceList";
import { Skeleton } from "@/components/ui/skeleton";
import { IWorkspace } from "@/models/workspace";
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspacesPage() {
  const { workspaces, success } = await getUserWorkspaces();
   const { userId } = await auth();
  
  // Create a map of workspace ID to owner status
  const isOwnerMap: Record<string, boolean> = {};
  if (success && workspaces) {
    workspaces.forEach((workspace: IWorkspace & { _id: string }) => {
      if ("ownerId" in workspace) {
        isOwnerMap[workspace._id] = workspace.ownerId === userId;
      }
    });
  }
  
  return (
    <div className="container">
      <Suspense fallback={<WorkspacesPageSkeleton />}>
        <WorkspaceList workspaces={workspaces || []} isOwnerMap={isOwnerMap} />
      </Suspense>
    </div>
  );
}

function WorkspacesPageSkeleton() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}

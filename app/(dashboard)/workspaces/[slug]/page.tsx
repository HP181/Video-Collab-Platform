// src/app/(dashboard)/workspaces/[slug]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/actions/workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceMembers } from "@/components/WorkspaceMembers";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";
import { WorkspaceVideos } from "@/components/WorkSpaceVideos";
import { auth } from "@clerk/nextjs/server";
import { S3MultipartUploadForm } from "@/components/S3MultipartUploadForm";

interface WorkspacePageProps {
  params: {
    slug: string;
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const {
    workspace,
    success,
    isOwner = false,
  } = await getWorkspaceBySlug(slug);

  if (!success || !workspace) {
    notFound();
  }

  // Get members details
  const { members } = await getWorkspaceMembers(workspace._id.toString());

    // Get current user ID
  const { userId } = await auth();

  return (
    <div className="container max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            <p className="text-muted-foreground mt-1">
              Created {formatDate(workspace.createdAt)}
            </p>
            {workspace.description && (
              <p className="mt-4 max-w-3xl">{workspace.description}</p>
            )}
          </div>
          <div className="flex items-center">
            <Badge variant="outline" className="ml-2">
              {isOwner ? "Owner" : "Member"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

       <TabsContent value="videos">
  <Suspense fallback={<VideosSkeleton />}>
    <WorkspaceVideos
      workspaceId={workspace._id.toString()}
      slug={workspace.slug}
      isOwner={!!isOwner}
    />
  </Suspense>
</TabsContent>

     <TabsContent value="members">
          <Suspense fallback={<MembersSkeleton />}>
            <WorkspaceMembers
              members={members}
              workspaceId={workspace._id.toString()}
              isOwner={!!isOwner}
              currentUserId={userId || undefined}
            />
          </Suspense>
        </TabsContent>

        {isOwner && (
          <TabsContent value="settings">
            <Suspense fallback={<SettingsSkeleton />}>
              <WorkspaceSettings workspace={workspace} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function VideosSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] w-full" />
        ))}
      </div>
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-36" />
    </div>
  );
}

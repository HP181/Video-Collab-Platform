"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, UserMinus, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { UserInviteSelector } from "./UserInviteSelector";
import { PendingInvitations } from "./PendingInvitations";
import { removeMember, leaveWorkspace } from "@/actions/workspace";
import { auth } from "@clerk/nextjs/server";

type Member = {
  userId: string;
  role: "admin" | "member" | "viewer";
  addedAt: string;
  name: string;
  email: string;
  profileImage: string;
};

type WorkspaceMembersProps = {
  members: Member[];
  workspaceId: string;
  isOwner: boolean;
  currentUserId?: string; // Added to identify the current user
};

export function WorkspaceMembers({ 
  members, 
  workspaceId, 
  isOwner,
  currentUserId
}: WorkspaceMembersProps) {
  const [refreshInvitations, setRefreshInvitations] = useState(0);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Function to get role display text and color
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "member":
        return <Badge variant="outline">Member</Badge>;
      case "viewer":
        return <Badge variant="secondary">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Check if user can remove a member
  const canRemoveMember = (member: Member) => {
    if (isOwner) {
      // Owner can remove anyone except themselves
      return member.userId !== currentUserId;
    }
    
    // Admins can remove non-admin members
    const isCurrentUserAdmin = members.some(
      m => m.userId === currentUserId && m.role === "admin"
    );
    
    if (isCurrentUserAdmin) {
      return member.role !== "admin" && member.userId !== currentUserId;
    }
    
    return false;
  };

  // Handle removing a member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsProcessing(true);
    try {
      const response = await removeMember(workspaceId, memberToRemove.userId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Member removed", {
        description: `${memberToRemove.name} has been removed from this workspace.`,
      });
      
      // Update local state without requiring a full page refresh
      router.refresh();
    } catch (error: any) {
      toast.error( error.message || "Failed to remove member",{
        description: error.message || "Failed to remove member",
      });
    } finally {
      setIsProcessing(false);
      setMemberToRemove(null);
    }
  };

  // Handle leaving the workspace
  const handleLeaveWorkspace = async () => {
    setIsProcessing(true);
    try {
      const response = await leaveWorkspace(workspaceId);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Left workspace", {
        description: "You have successfully left the workspace.",
      });
      
      // Redirect to workspaces list
      router.push("/workspaces");
    } catch (error: any) {
      toast.error( error.message || "Failed to leave workspace", {
        description: error.message || "Failed to leave workspace",
      });
      setIsProcessing(false);
      setShowLeaveDialog(false);
    }
  };

  // Handle successful invitation
  const handleInvitationSuccess = () => {
    setRefreshInvitations(prev => prev + 1);
  };

  // Find if current user can leave (is a member but not owner)
  const canLeave = currentUserId && 
    members.some(member => member.userId === currentUserId) && 
    !isOwner;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Workspace Members</h2>
        <div className="flex gap-2">
          {canLeave && (
            <Button 
              variant="outline" 
              onClick={() => setShowLeaveDialog(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Workspace
            </Button>
          )}
          {isOwner && (
            <UserInviteSelector 
              workspaceId={workspaceId} 
              onSuccess={handleInvitationSuccess}
            />
          )}
        </div>
      </div>
      
      {/* Pending Invitations */}
      {isOwner && (
        <PendingInvitations 
          workspaceId={workspaceId} 
          refreshTrigger={refreshInvitations}
        />
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People with access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.profileImage} />
                    <AvatarFallback>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">{member.name}</p>
                      {member.userId === currentUserId && (
                        <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Joined {formatDate(member.addedAt)}
                  </div>
                  {getRoleBadge(member.role)}
                  
                  {/* Member actions dropdown */}
                  {canRemoveMember(member) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setMemberToRemove(member)} className="text-destructive focus:text-destructive">
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}

            {/* If no members yet */}
            {members.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No members yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog 
        open={!!memberToRemove} 
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from this workspace?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Leave Workspace Confirmation Dialog */}
      <AlertDialog 
        open={showLeaveDialog} 
        onOpenChange={setShowLeaveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this workspace?
              You will lose access to all videos and content in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveWorkspace}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Leaving..." : "Leave Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
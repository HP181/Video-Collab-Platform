"use client";

import { useEffect, useState } from "react";
import { RotateCw, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getWorkspaceInvitations, cancelInvitation, resendInvitation } from "@/actions/invitation";

type Invitation = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  invitedBy: {
    id: string;
    name: string;
  };
};

type PendingInvitationsProps = {
  workspaceId: string;
  refreshTrigger?: number;
};

export function PendingInvitations({ workspaceId, refreshTrigger = 0 }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitations
  useEffect(() => {
    async function fetchInvitations() {
      setLoading(true);
      try {
        const response = await getWorkspaceInvitations(workspaceId);
        
        if (response.success) {
          setInvitations(response.invitations);
          setError(null);
        } else {
          setError(response.error || "Failed to load invitations");
          setInvitations([]);
        }
      } catch (error: any) {
        setError(error.message || "An error occurred");
        setInvitations([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvitations();
  }, [workspaceId, refreshTrigger]);

  // Handle cancel invitation
  const handleCancel = async (id: string) => {
    try {
      const response = await cancelInvitation(id);
      
      if (response.success) {
        // Update local state
        setInvitations(prevInvitations => 
          prevInvitations.filter(invitation => invitation.id !== id)
        );
        
        toast.success("Invitation cancelled", {
          description: "The invitation has been cancelled successfully.",
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation", {
        description: error.message || "Failed to cancel invitation",
      });
    }
  };

  // Handle resend invitation
  const handleResend = async (id: string) => {
    try {
      const response = await resendInvitation(id);
      
      if (response.success) {
        toast.success("Invitation resent", {
          description: "The invitation has been resent successfully.",
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast(error.message || "Failed to resend invitation", {
        description: error.message || "Failed to resend invitation",
      });
    }
  };

  // Role badge component
  const RoleBadge = ({ role }: { role: string }) => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Loading invitations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          {invitations.length > 0
            ? `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`
            : "No pending invitations"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length > 0 ? (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div>
                  <div className="font-medium">{invitation.email}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>
                      Invited {formatRelativeTime(invitation.createdAt)} by {invitation.invitedBy.name}
                    </span>
                    <RoleBadge role={invitation.role} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResend(invitation.id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Resend invitation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cancel invitation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No pending invitations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
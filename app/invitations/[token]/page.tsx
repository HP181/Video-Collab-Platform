// src/app/invitations/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { acceptInvitation, declineInvitation } from "@/actions/invitation";

export default function InvitationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const router = useRouter();
  const params = useParams();  // Use useParams to unwrap the params promise

// src/app/invitations/[token]/page.tsx

// Process invitation on page load
useEffect(() => {
  async function processInvitation() {
    try {
      const tokenParam = params.token;
      
      // Ensure the token is a string, not an array
      const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
      
      if (!token) {
        throw new Error("Token not found in URL.");
      }

      const response = await acceptInvitation(token);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      setSuccess(true);
      setWorkspaceName(response.workspace.name);
      
      // Show toast
      toast.success(response.alreadyMember 
        ? `You are already a member of ${response.workspace.name}`
        : `You have successfully joined ${response.workspace.name}`);
      
      // Redirect to workspace after a delay
      setTimeout(() => {
        router.push(`/workspaces/${response.workspace.slug}`);
      }, 3000);
    } catch (error: any) {
      setError(error.message || "Failed to process invitation");
    } finally {
      setLoading(false);
    }
  }
  
  processInvitation();
}, [params, router]);

// Handle decline invitation
const handleDecline = async () => {
  try {
    setLoading(true);
    const tokenParam = params.token;
    
    // Ensure the token is a string, not an array
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    
    if (!token) {
      throw new Error("Token not found in URL.");
    }

    const response = await declineInvitation(token);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    toast.success("Invitation declined", {
      description: "You have declined the invitation.",
    });
    
    // Redirect to home
    router.push("/");
  } catch (error: any) {
    toast.error(error.message || "Failed to decline invitation", {
      description: "Please try again or contact support.",
    });
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-3/4" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-full" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-1/3" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {success ? "Invitation Accepted" : "Workspace Invitation"}
          </CardTitle>
          <CardDescription>
            {success
              ? `You have successfully joined ${workspaceName}`
              : error
              ? "Error processing invitation"
              : "Process your workspace invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="p-4 text-destructive border border-destructive/20 rounded-md bg-destructive/10">
              <p className="font-medium mb-2">Error</p>
              <p>{error}</p>
            </div>
          ) : success ? (
            <div className="p-4 text-center">
              <div className="mb-4 flex justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Check className="h-6 w-6" />
                </div>
              </div>
              <p>You will be redirected to the workspace shortly.</p>
            </div>
          ) : (
            <p>Loading invitation details...</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {!success && !error ? (
            <>
              <Button variant="outline" onClick={handleDecline} disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button disabled>
                <Check className="mr-2 h-4 w-4" />
                Accepting...
              </Button>
            </>
          ) : (
            <div className="w-full">
              <Link href={success ? `/workspaces` : "/"} className="w-full">
                <Button className="w-full">
                  {success ? "Go to Workspaces" : "Go to Home"}
                </Button>
              </Link>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

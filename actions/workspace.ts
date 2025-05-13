// src/lib/actions/workspace.ts
'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import connectToDatabase from "@/lib/mongodb";
import Workspace, { IWorkspace } from "@/models/workspace";
import User from "@/models/user";
import { generateSlug } from "@/lib/utils";

// Type for workspace form data
export type WorkspaceFormData = {
  name: string;
  description?: string;
};

/**
 * Create a new workspace
 */
export async function createWorkspace(data: WorkspaceFormData) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Generate a slug from the name
    const slug = generateSlug(data.name);
    
    // Check if a workspace with this slug already exists
    const existingWorkspace = await Workspace.findOne({ slug });
    
    if (existingWorkspace) {
      throw new Error("A workspace with this name already exists");
    }
    
    // Create the workspace
    const workspace = await Workspace.create({
      name: data.name,
      slug,
      description: data.description || "",
      ownerId: userId,
      members: [
        {
          userId,
          role: "admin",
          addedAt: new Date(),
        },
      ],
    });
    
    revalidatePath("/workspaces");
    
    return { success: true, workspaceId: workspace._id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all workspaces for the current user
 */
export async function getUserWorkspaces() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find workspaces where user is a member or owner
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: userId },
        { "members.userId": userId },
      ],
    }).sort({ updatedAt: -1 });
    
    return { success: true, workspaces: JSON.parse(JSON.stringify(workspaces)) };
  } catch (error: any) {
    return { success: false, error: error.message, workspaces: [] };
  }
}

/**
 * Get a workspace by slug
 */
export async function getWorkspaceBySlug(slug: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find workspace by slug
    const workspace = await Workspace.findOne({ slug });
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is a member or owner
    const isMember = workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId);
    const isOwner = workspace.ownerId === userId;
    
    if (!isMember && !isOwner) {
      throw new Error("You don't have access to this workspace");
    }
    
    return { 
      success: true, 
      workspace: JSON.parse(JSON.stringify(workspace)),
      isOwner
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update a workspace
 */
export async function updateWorkspace(workspaceId: string, data: WorkspaceFormData) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is an admin
    const isAdmin = workspace.ownerId === userId || 
      workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    if (!isAdmin) {
      throw new Error("You don't have permission to update this workspace");
    }
    
    // Update the workspace
    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      {
        name: data.name,
        description: data.description || "",
      },
      { new: true }
    );
    
    revalidatePath(`/workspaces/${workspace.slug}`);
    revalidatePath("/workspaces");
    
    return { success: true, workspace: JSON.parse(JSON.stringify(updatedWorkspace)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is the owner
    if (workspace.ownerId !== userId) {
      throw new Error("Only the workspace owner can delete it");
    }
    
    // Delete the workspace
    await Workspace.findByIdAndDelete(workspaceId);
    
    // TODO: Delete associated videos and comments
    
    revalidatePath("/workspaces");
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get workspace members with user details
 */
export async function getWorkspaceMembers(workspaceId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is a member or owner
    const isMember = workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId);
    const isOwner = workspace.ownerId === userId;
    
    if (!isMember && !isOwner) {
      throw new Error("You don't have access to this workspace");
    }
    
    // Get all user IDs
    const memberIds = workspace.members.map((member: IWorkspace["members"][0]) => member.userId);
    if (!memberIds.includes(workspace.ownerId)) {
      memberIds.push(workspace.ownerId);
    }
    
    // Get user details
    const users = await User.find({ clerkId: { $in: memberIds } });
    
    // Map user details to members
    const membersWithDetails = workspace.members.map((member: IWorkspace["members"][0]) => {
      const user = users.find(u => u.clerkId === member.userId);
      return {
        userId: member.userId,
        role: member.role,
        addedAt: member.addedAt,
        name: user?.name || "Unknown User",
        email: user?.email || "",
        profileImage: user?.profileImage || "",
      };
    });
    
    // Add owner if not already in members
    const ownerInMembers = membersWithDetails.some((m: { userId: string }) => m.userId === workspace.ownerId);
    
    if (!ownerInMembers) {
      const owner = users.find(u => u.clerkId === workspace.ownerId);
      if (owner) {
        membersWithDetails.push({
          userId: workspace.ownerId,
          role: "admin",
          addedAt: workspace.createdAt,
          name: owner.name || "Unknown User",
          email: owner.email || "",
          profileImage: owner.profileImage || "",
        });
      }
    }
    
    return { 
      success: true, 
      members: membersWithDetails,
      isOwner
    };
  } catch (error: any) {
    return { success: false, error: error.message, members: [] };
  }
}



// Add these functions to your src/actions/workspace.ts file

/**
 * Remove a member from a workspace
 */
export async function removeMember(workspaceId: string, memberUserId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is the owner or an admin
    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    // Check if the member being removed is an admin (only owners can remove admins)
    const memberToRemove = workspace.members.find((member: IWorkspace["members"][0]) => member.userId === memberUserId);
    const isRemovingAdmin = memberToRemove?.role === "admin";
    
    // Validate permissions
    // - Owner can remove anyone
    // - Admin can remove members and viewers but not other admins
    // - User can remove themselves (leaving the workspace)
    if (!isOwner && !isAdmin && userId !== memberUserId) {
      throw new Error("You don't have permission to remove members from this workspace");
    }

    // Only owners can remove admins
    if (isRemovingAdmin && !isOwner) {
      throw new Error("Only the workspace owner can remove administrators");
    }
    
    // Can't remove the owner
    if (memberUserId === workspace.ownerId) {
      throw new Error("The workspace owner cannot be removed");
    }
    
    // Remove the member
    await Workspace.findByIdAndUpdate(workspaceId, {
      $pull: {
        members: { userId: memberUserId }
      }
    });
    
    revalidatePath(`/workspaces/${workspace.slug}`);
    
    // If user is removing themselves, also redirect
    const selfRemoval = userId === memberUserId;
    
    return { success: true, selfRemoval };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Leave a workspace (shorthand for removing yourself)
 */
export async function leaveWorkspace(workspaceId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is the owner
    if (workspace.ownerId === userId) {
      throw new Error("The workspace owner cannot leave. You must delete the workspace or transfer ownership first.");
    }
    
    // Check if user is a member
    const isMember = workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId);
    
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }
    
    // Remove the member
    await Workspace.findByIdAndUpdate(workspaceId, {
      $pull: {
        members: { userId }
      }
    });
    
    revalidatePath(`/workspaces`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
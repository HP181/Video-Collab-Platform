// src/lib/actions/invitation.ts
'use server';

import { nanoid } from 'nanoid';
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongodb";
import Invitation from "@/models/invitation";
import Workspace, { IWorkspace } from "@/models/workspace";
import User from "@/models/user";
import { sendEmail, generateInvitationEmail } from "@/lib/email";

// Type for invitation form data
export type InvitationFormData = {
  email: string;
  role: 'admin' | 'member' | 'viewer';
};

// Type for user list item
export type UserListItem = {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  profileImage?: string;
};

/**
 * Get users that can be invited to a workspace
 */
export async function getInvitableUsers(workspaceId: string) {
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
    
    // Get all current member IDs including the owner
    const currentMemberIds = [
      workspace.ownerId,
      ...workspace.members.map((member: IWorkspace["members"][0]) => member.userId)
    ];
    
    // Get all users except current members
    const users = await User.find({
      clerkId: { $nin: currentMemberIds }
    }).sort({ name: 1 });
    
    // Convert to user list items
    const userListItems: UserListItem[] = users.map(user => ({
      id: user._id.toString(),
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }));
    
    return { success: true, users: userListItems };
  } catch (error: any) {
    return { success: false, error: error.message, users: [] };
  }
}

/**
 * Send an invitation to join a workspace
 */
export async function sendWorkspaceInvitation(workspaceId: string, data: InvitationFormData) {
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
    
    // Check if user is an admin or owner
    const isAdmin = workspace.ownerId === userId || 
      workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    if (!isAdmin) {
      throw new Error("You don't have permission to invite members");
    }
    
    // Verify that the user exists in our database
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (!existingUser) {
      throw new Error("This user isn't registered in the system yet");
    }
    
    // Check if user is already a member
    const isMember = workspace.members.some((member: IWorkspace["members"][0]) => member.userId === existingUser.clerkId);
    const isOwner = workspace.ownerId === existingUser.clerkId;
    
    if (isMember || isOwner) {
      throw new Error("This user is already a member of the workspace");
    }
    
    // Check if there's a pending invitation
    const existingInvitation = await Invitation.findOne({
      workspaceId: workspaceId,
      email: data.email.toLowerCase(),
      status: 'pending',
    });
    
    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }
    
    // Create a token for the invitation
    const token = nanoid(32);
    
    // Set expiration for 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create the invitation
    const invitation = await Invitation.create({
      workspaceId,
      email: data.email.toLowerCase(),
      role: data.role,
      token,
      status: 'pending',
      invitedBy: userId,
      expiresAt,
    });
    
    // Get inviter's name
    const inviter = await User.findOne({ clerkId: userId });
    const inviterName = inviter?.name || "A workspace admin";
    
    // Generate the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${token}`;
    
    // Send the invitation email
    const emailResult = await sendEmail({
      to: data.email,
      subject: `Invitation to join ${workspace.name} on VideoCollab`,
      html: generateInvitationEmail({
        workspaceName: workspace.name,
        inviterName,
        invitationLink,
        role: data.role,
      }),
    });
    
    if (!emailResult.success) {
      // If email fails, delete the invitation
      await Invitation.findByIdAndDelete(invitation._id);
      throw new Error("Failed to send invitation email");
    }
    
    revalidatePath(`/workspaces/${workspace.slug}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending invitations for a workspace
 */
export async function getWorkspaceInvitations(workspaceId: string) {
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
    
    // Check if user is an admin or owner
    const isAdmin = workspace.ownerId === userId || 
      workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    if (!isAdmin) {
      throw new Error("You don't have permission to view invitations");
    }
    
    // Get pending invitations
    const invitations = await Invitation.find({
      workspaceId,
      status: 'pending',
    }).sort({ createdAt: -1 });
    
    // Get inviter details
    const inviterIds = [...new Set(invitations.map(inv => inv.invitedBy))];
    const inviters = await User.find({ clerkId: { $in: inviterIds } });
    
    // Map inviter details to invitations
    const invitationsWithDetails = invitations.map(invitation => {
      const inviter = inviters.find(u => u.clerkId === invitation.invitedBy);
      return {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        invitedBy: {
          id: invitation.invitedBy,
          name: inviter?.name || "Unknown User",
        },
      };
    });
    
    return { success: true, invitations: invitationsWithDetails };
  } catch (error: any) {
    return { success: false, error: error.message, invitations: [] };
  }
}

/**
 * Cancel (delete) an invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the invitation
    const invitation = await Invitation.findById(invitationId);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Find the workspace
    const workspace = await Workspace.findById(invitation.workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is an admin or owner
    const isAdmin = workspace.ownerId === userId || 
      workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    if (!isAdmin) {
      throw new Error("You don't have permission to cancel invitations");
    }
    
    // Delete the invitation
    await Invitation.findByIdAndDelete(invitationId);
    
    revalidatePath(`/workspaces/${workspace.slug}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Accept an invitation (for the invitation page)
 */
export async function acceptInvitation(token: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("You must be logged in to accept an invitation");
    }
    
    await connectToDatabase();
    
    // Find the invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
    });
    
    if (!invitation) {
      throw new Error("Invitation not found or already processed");
    }
    
    // Check if the invitation has expired
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      throw new Error("This invitation has expired");
    }
    
    // Find the workspace
    const workspace = await Workspace.findById(invitation.workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Find or create the user in our database
    let user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      // Instead of using Clerk client, use the webhook data that should already be synced
      // If it's not, create a minimal user
      try {
        // Get invitation email and use it to create a basic user
        const invitationEmail = invitation.email.toLowerCase();
        
        console.log('Creating minimal user from invitation email:', invitationEmail);
        
        // Create user in our database with minimal info
        user = await User.create({
          clerkId: userId,
          email: invitationEmail,
          name: invitationEmail.split('@')[0], // Create a basic name from email
          subscriptionPlan: 'free',
        });
        
        console.log('Created minimal user in database during invitation acceptance:', user);
      } catch (error) {
        console.error('Error creating user in MongoDB:', error);
        throw new Error("User not found and couldn't be created. Please try again later.");
      }
    }
    
    // Check if the invitation email matches the user's email
    // Make this check case-insensitive
    const userEmail = user.email.toLowerCase();
    const invitationEmail = invitation.email.toLowerCase();
    
    if (userEmail !== invitationEmail) {
      throw new Error("This invitation was sent to a different email address. Please log in with the email address that received the invitation.");
    }
    
    // Check if user is already a member
    const isMember = workspace.members.some((member: { userId: string }) => member.userId === userId);
    const isOwner = workspace.ownerId === userId;
    
    if (isMember || isOwner) {
      // Mark invitation as accepted
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });
      return { success: true, alreadyMember: true, workspace };
    }
    
    // Add user as a member
    await Workspace.findByIdAndUpdate(invitation.workspaceId, {
      $push: {
        members: {
          userId,
          role: invitation.role,
          addedAt: new Date(),
        },
      },
    });
    
    // Mark invitation as accepted
    await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });
    
    return { success: true, workspace };
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Decline an invitation
 */
export async function declineInvitation(token: string) {
  try {
    await connectToDatabase();
    
    // Find the invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
    });
    
    if (!invitation) {
      throw new Error("Invitation not found or already processed");
    }
    
    // Mark invitation as declined
    await Invitation.findByIdAndUpdate(invitation._id, { status: 'declined' });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    await connectToDatabase();
    
    // Find the invitation
    const invitation = await Invitation.findById(invitationId);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Find the workspace
    const workspace = await Workspace.findById(invitation.workspaceId);
    
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    
    // Check if user is an admin or owner
    const isAdmin = workspace.ownerId === userId || 
      workspace.members.some((member: IWorkspace["members"][0]) => member.userId === userId && member.role === "admin");
    
    if (!isAdmin) {
      throw new Error("You don't have permission to resend invitations");
    }
    
    // Update the expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await Invitation.findByIdAndUpdate(invitationId, { expiresAt });
    
    // Get inviter's name
    const inviter = await User.findOne({ clerkId: userId });
    const inviterName = inviter?.name || "A workspace admin";
    
    // Generate the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${invitation.token}`;
    
    // Send the invitation email
    const emailResult = await sendEmail({
      to: invitation.email,
      subject: `Invitation to join ${workspace.name} on VideoCollab`,
      html: generateInvitationEmail({
        workspaceName: workspace.name,
        inviterName,
        invitationLink,
        role: invitation.role,
      }),
    });
    
    if (!emailResult.success) {
      throw new Error("Failed to send invitation email");
    }
    
    revalidatePath(`/workspaces/${workspace.slug}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
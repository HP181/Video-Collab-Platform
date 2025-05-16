// src/lib/user-membership.ts
import User from '@/models/user';
import connectToDatabase from "@/lib/mongodb";
import { clerkClient } from '@clerk/express'

interface MembershipStatus {
  isPaidMember: boolean;
  tier: 'free' | 'premium';
  expiresAt?: Date | null;
}

/**
 * Get the user's membership status
 */
export async function getUserMembership(userId: string): Promise<MembershipStatus> {
  try {
    // Connect to the database to fetch user data
    await connectToDatabase();
    
    // Get the Clerk user data
    const clerkUser = await clerkClient.users.getUser(userId);
    
    // Get the user's membership information from Clerk metadata
    const membershipMetadata = clerkUser.privateMetadata?.membership as any || {};
    
    // Build the membership status
    const membershipStatus: MembershipStatus = {
      isPaidMember: Boolean(membershipMetadata?.isPaid),
      tier: membershipMetadata?.tier || 'free',
      expiresAt: membershipMetadata?.expiresAt ? new Date(membershipMetadata.expiresAt) : null
    };
    
    // Check if the membership has expired
    if (membershipStatus.expiresAt && new Date() > membershipStatus.expiresAt) {
      return {
        isPaidMember: false,
        tier: 'free',
        expiresAt: null
      };
    }
    
    return membershipStatus;
  } catch (error) {
    console.error('Error fetching user membership:', error);
    
    // Default to free tier if there's an error
    return {
      isPaidMember: false,
      tier: 'free'
    };
  }
}

/**
 * Update a user's membership status
 */
export async function updateUserMembership(
  userId: string, 
  membership: { 
    tier: 'free' | 'premium',
    isPaid: boolean,
    expiresAt?: Date | string
  }
): Promise<boolean> {
  try {
    // Update the user's membership in Clerk's private metadata
    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        membership: {
          tier: membership.tier,
          isPaid: membership.isPaid,
          expiresAt: membership.expiresAt?.toString()
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user membership:', error);
    return false;
  }
}
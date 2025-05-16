"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface UserMembershipResult {
  isPaidMember: boolean;
  tier: 'free' | 'premium';
  expiresAt?: Date | null;
}

export function useUserMembership(): UserMembershipResult {
  const { user, isLoaded } = useUser();
  const [membershipData, setMembershipData] = useState<UserMembershipResult>({
    isPaidMember: false,
    tier: 'free',
    expiresAt: null
  });

  useEffect(() => {
    async function fetchMembershipStatus() {
      if (!isLoaded || !user) {
        return;
      }

      try {
        // Try to fetch membership status from API
        const response = await fetch('/api/user/membership');
        
        if (response.ok) {
          const data = await response.json();
          setMembershipData({
            isPaidMember: data.isPaidMember || false,
            tier: data.tier || 'free',
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
          });
          return;
        }
      } catch (error) {
        console.error('Error fetching membership status:', error);
      }
      
      // Fallback to checking Clerk metadata directly
      try {
        const publicMetadata = user.publicMetadata || {};
        const isPaidMember = publicMetadata.membershipTier === 'premium';
        
        setMembershipData({
          isPaidMember,
          tier: isPaidMember ? 'premium' : 'free'
        });
      } catch (error) {
        console.error('Error retrieving membership from user metadata:', error);
        
        // Default to free tier if all methods fail
        setMembershipData({
          isPaidMember: false,
          tier: 'free',
          expiresAt: null
        });
      }
    }

    fetchMembershipStatus();
  }, [user, isLoaded]);

  return membershipData;
}
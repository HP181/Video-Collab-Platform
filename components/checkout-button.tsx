"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CheckoutButtonProps {
  plan: "PRO";
}

export function CheckoutButton({ plan }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      
      // Use Sonner for error notification
      toast.error(error.message || "Something went wrong", {
        description: "Please try again or contact support.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={loading}
      size="lg"
      className="w-full"
    >
      {loading ? "Loading..." : "Upgrade to Pro"}
    </Button>
  );
}

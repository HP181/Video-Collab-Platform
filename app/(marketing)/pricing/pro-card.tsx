"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckoutButton } from "@/components/checkout-button";
import { PLANS } from "@/lib/stripe";

export function ProPricingCard() {
  return (
    <Card className="flex flex-col border-primary">
      <CardHeader>
        <CardTitle className="text-2xl">{PLANS.PRO.name}</CardTitle>
        <CardDescription>{PLANS.PRO.description}</CardDescription>
        <div className="mt-3">
          <span className="text-4xl font-bold">${PLANS.PRO.price}</span>
          <span className="text-muted-foreground ml-1">/ month</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          {PLANS.PRO.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check size={18} className="text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <CheckoutButton plan="PRO" />
      </CardFooter>
    </Card>
  );
}
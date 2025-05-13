import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PLANS } from "@/lib/stripe";
import { ProPricingCard } from "./pro-card";

export default function PricingPage() {
  return (
    <div className="container py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that's right for you and your team
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">{PLANS.FREE.name}</CardTitle>
            <CardDescription>{PLANS.FREE.description}</CardDescription>
            <div className="mt-3">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/ month</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              {PLANS.FREE.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check size={18} className="text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/sign-up" className="w-full">
              <Button size="lg" variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Pro Plan - Client Component */}
        <ProPricingCard />
      </div>
    </div>
  );
}
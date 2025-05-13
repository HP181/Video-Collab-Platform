import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
  const { userId } = await auth();

    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { plan } = await req.json();
    
    const planInfo = PLANS[plan as keyof typeof PLANS];
    
    if (!planInfo || !planInfo.stripePriceId) {
      return new NextResponse("Invalid plan", { status: 400 });
    }
    
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: planInfo.stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
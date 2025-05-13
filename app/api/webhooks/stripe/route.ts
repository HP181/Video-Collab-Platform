import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';

export async function POST(req: Request) {
  const body = await req.text();
 const signature = (await headers()).get('stripe-signature') as string;


  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook secret not found', {
      status: 400,
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, {
      status: 400,
    });
  }

  // Connect to database
  await connectToDatabase();

  // Handle specific Stripe events
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      
      // Update user subscription status
      if (checkoutSession.customer && checkoutSession.metadata?.userId) {
        await User.findOneAndUpdate(
          { clerkId: checkoutSession.metadata.userId },
          {
            $set: {
              stripeCustomerId: checkoutSession.customer,
              subscriptionStatus: 'active',
              subscriptionPlan: 'pro',
            },
          }
        );
      }
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;

if (invoice.customer && (invoice as any).subscription) {
    const subscriptionId = (invoice as any).subscription as string;

    // Fetch subscription to get metadata with the userId
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (subscription.metadata?.userId) {
        await User.findOneAndUpdate(
            { stripeCustomerId: invoice.customer },
            {
                $set: {
                    subscriptionStatus: 'active',
                    subscriptionPlan: 'pro',
                },
            }
        );
    }
}

      break;
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      
      // Handle subscription cancellation
      if (subscription.metadata?.userId) {
        await User.findOneAndUpdate(
          { clerkId: subscription.metadata.userId },
          {
            $set: {
              subscriptionStatus: 'inactive',
              subscriptionPlan: 'free',
            },
          }
        );
      }
      break;
  }

  return NextResponse.json({ received: true });
}
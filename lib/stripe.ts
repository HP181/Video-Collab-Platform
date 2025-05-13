import Stripe from 'stripe';

// if (!process.env.STRIPE_SECRET_KEY) {
//   throw new Error('STRIPE_SECRET_KEY is not defined');
// }

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_51QZfEzGaaZp3gjw9uOWHdczfGHzB7R7x4GNo4yNQ33FPQDS10D9C4yEji6AkyWWlr0EUO9H0Lg7mLZ1U1Y2Tn58100ytsFOaAf", {
  apiVersion: '2025-04-30.basil', // Use the latest version available
  typescript: true,
});

// Define subscription plans
export const PLANS = {
  FREE: {
    name: 'Free',
    description: 'For individuals and small teams',
    price: 0,
    features: [
      '720p video quality',
      'Limited storage (2GB)',
      'Basic AI features',
      '5 videos per workspace',
      'Up to 3 workspace members',
    ],
    stripePriceId: '', // No price ID for free plan
  },
  PRO: {
    name: 'Pro',
    description: 'For growing teams and professionals',
    price: 19.99,
    interval: 'month',
    features: [
      '1080p video quality',
      'Expanded storage (50GB)',
      'Advanced AI capabilities',
      'Priority processing',
      'Unlimited videos',
      'Unlimited workspace members',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
  },
};
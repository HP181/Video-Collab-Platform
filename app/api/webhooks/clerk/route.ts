// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
    return new NextResponse('Webhook secret not found', {
      status: 400,
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Missing svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error verifying webhook', {
      status: 400,
    });
  }

  // Connect to the database
  await connectToDatabase();

  // Log the event type for debugging
  console.log(`Webhook event type: ${evt.type}`);
  
  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    await handleUserCreated(evt.data);
  } else if (eventType === 'user.updated') {
    await handleUserUpdated(evt.data);
  } else if (eventType === 'user.deleted') {
    await handleUserDeleted(evt.data);
  } else if (eventType === 'session.created') {
    // Optional: Handle session creation
    console.log('User session created', evt.data.user_id);
  }

  return NextResponse.json({ message: 'Webhook processed successfully' });
}

async function handleUserCreated(data: any) {
  try {
    
    // Extract primary email
    const primaryEmail = data.email_addresses?.find((email: any) => email.id === data.primary_email_address_id);
    const email = primaryEmail?.email_address || '';

    // Prepare user data
    const userData = {
      clerkId: data.id,
      email: email.toLowerCase(),
      name: data.username || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      profileImage: data.image_url,
      subscriptionPlan: 'free', // Default plan
    };

    // Log the data we're going to store
    console.log('Saving user data to MongoDB:', userData);

    // Create or update the user
    await User.findOneAndUpdate(
      { clerkId: data.id },
      userData,
      { upsert: true, new: true }
    );

    console.log('User created/updated in MongoDB');
  } catch (error) {
    console.error('Error creating user in MongoDB:', error);
    throw error;
  }
}

async function handleUserUpdated(data: any) {
  try {
    console.log('Updating user in MongoDB from Clerk webhook:', data);
    
    // Extract primary email
    const primaryEmail = data.email_addresses?.find((email: any) => email.id === data.primary_email_address_id);
    const email = primaryEmail?.email_address || '';

    // Prepare update data
    const updateData: any = {
      email: email.toLowerCase(),
      name: data.username || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
    };

    // Only include image_url if it exists
    if (data.image_url) {
      updateData.profileImage = data.image_url;
    }

    console.log('Updating user data in MongoDB:', updateData);

    // Update the user
    await User.findOneAndUpdate(
      { clerkId: data.id },
      updateData,
      { upsert: true } // Create if doesn't exist
    );

    console.log('User updated in MongoDB');
  } catch (error) {
    console.error('Error updating user in MongoDB:', error);
    throw error;
  }
}

async function handleUserDeleted(data: any) {
  try {
    console.log('Deleting user in MongoDB from Clerk webhook:', data.id);
    
    // Delete the user
    await User.findOneAndDelete({ clerkId: data.id });
    
    console.log('User deleted from MongoDB');
  } catch (error) {
    console.error('Error deleting user from MongoDB:', error);
    throw error;
  }
}
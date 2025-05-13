// src/models/invitation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
  workspaceId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema = new Schema(
  {
    workspaceId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    role: { 
      type: String, 
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
      required: true 
    },
    token: { type: String, required: true, unique: true },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      required: true 
    },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Create composite index for workspace and email
InvitationSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ expiresAt: 1 });

export default mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);
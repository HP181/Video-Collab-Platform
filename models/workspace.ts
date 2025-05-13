import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMember {
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  addedAt: Date;
}

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  members: IMember[];
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema: Schema = new Schema({
  userId: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'member', 'viewer'], 
    default: 'member',
    required: true 
  },
  addedAt: { type: Date, default: Date.now }
});

const WorkspaceSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    ownerId: { type: String, required: true },
    members: [MemberSchema],
  },
  { timestamps: true }
);

// Create index for faster queries
WorkspaceSchema.index({ slug: 1 });
WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ 'members.userId': 1 });

export default mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

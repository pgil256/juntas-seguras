import mongoose, { Schema, Document, Model } from 'mongoose';

// User schema for basic authentication and user management
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  createdAt: { type: String, required: true },
  lastLogin: { type: String },
  avatar: { type: String },
  // Simple password hash - in a production app, use a proper password hashing library
  hashedPassword: { type: String },
  pools: [{ type: String }], // Array of pool IDs the user belongs to
});

// Function to initialize the model with checking for existing models
export function getUserModel(): Model<any> {
  const modelName = 'User';
  return mongoose.models[modelName] || mongoose.model(modelName, UserSchema);
}

export default getUserModel;
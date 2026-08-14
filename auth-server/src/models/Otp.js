import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, required: true, enum: ['signup', 'reset'], default: 'signup' },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export const Otp = mongoose.model('Otp', otpSchema);
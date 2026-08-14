import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    collegeName: { type: String, trim: true, default: '' },
    userType: { type: String, enum: ['student', 'professional'], default: 'professional' },
    year: { type: String, trim: true, default: '' },
    course: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    leetcode: { type: String, trim: true, default: '' },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
import crypto from 'crypto';
import { User } from '../models/User.js';

const memoryState = {
  users: [],
};

const makeId = () => crypto.randomUUID();

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizePhone = (phoneNumber) => phoneNumber.trim();

const toPlainUser = (user) => ({
  id: user.id || user._id?.toString?.() || user._id || makeId(),
  fullName: user.fullName,
  email: normalizeEmail(user.email),
  phoneNumber: normalizePhone(user.phoneNumber),
  passwordHash: user.passwordHash,
  collegeName: user.collegeName || '',
  userType: user.userType || 'professional',
  year: user.year || '',
  course: user.course || '',
  github: user.github || '',
  linkedin: user.linkedin || '',
  leetcode: user.leetcode || '',
  profileCompleted: Boolean(user.profileCompleted),
  createdAt: user.createdAt || new Date().toISOString(),
  updatedAt: user.updatedAt || new Date().toISOString(),
});

const useMongo = () => process.env.AUTH_STORAGE_MODE === 'mongo';

export const repository = {
  async findUserByEmail(email, { includePasswordHash = false } = {}) {
    const normalizedEmail = normalizeEmail(email);

    if (useMongo()) {
      let query = User.findOne({ email: normalizedEmail });
      if (includePasswordHash) {
        query = query.select('+passwordHash');
      }

      const user = await query;
      return user ? user.toObject() : null;
    }

    const user = memoryState.users.find((entry) => entry.email === normalizedEmail) || null;
    return user ? { ...user } : null;
  },

  async findUserByPhoneNumber(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);

    if (useMongo()) {
      const user = await User.findOne({ phoneNumber: normalizedPhone });
      return user ? user.toObject() : null;
    }

    const user = memoryState.users.find((entry) => entry.phoneNumber === normalizedPhone) || null;
    return user ? { ...user } : null;
  },

  async findUserById(userId) {
    if (useMongo()) {
      const user = await User.findById(userId);
      return user ? user.toObject() : null;
    }

    const user = memoryState.users.find((entry) => entry.id === String(userId)) || null;
    return user ? { ...user } : null;
  },

  async findConflictingUsers(email, phoneNumber) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phoneNumber);

    if (useMongo()) {
      const users = await User.find({
        $or: [{ email: normalizedEmail }, { phoneNumber: normalizedPhone }],
      });

      return users.map((user) => user.toObject());
    }

    return memoryState.users.filter((entry) => entry.email === normalizedEmail || entry.phoneNumber === normalizedPhone).map((entry) => ({ ...entry }));
  },

  async deleteUnverifiedConflicts(email, phoneNumber) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phoneNumber);

    if (useMongo()) {
      await User.deleteMany({
        $or: [{ email: normalizedEmail }, { phoneNumber: normalizedPhone }],
        isVerified: false,
      });
      return;
    }

    memoryState.users = memoryState.users.filter((entry) => {
      return entry.email !== normalizedEmail && entry.phoneNumber !== normalizedPhone;
    });
  },

  async createUser({ fullName, email, phoneNumber, passwordHash }) {
    if (useMongo()) {
      const user = await User.create({
        fullName,
        email: normalizeEmail(email),
        phoneNumber: normalizePhone(phoneNumber),
        passwordHash,
      });

      return user.toObject();
    }

    const user = toPlainUser({
      id: makeId(),
      fullName,
      email: normalizeEmail(email),
      phoneNumber: normalizePhone(phoneNumber),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    memoryState.users.push(user);
    return { ...user };
  },

  async markUserVerified(userId) {
    return this.findUserById(userId);
  },

  async deleteUserById(userId) {
    if (useMongo()) {
      await User.deleteOne({ _id: userId });
      return;
    }

    memoryState.users = memoryState.users.filter((entry) => entry.id !== String(userId));
  },

  async updateUserProfile(userId, profile) {
    const applyProfile = (user) => {
      if (!user) {
        return null;
      }

      Object.assign(user, {
        collegeName: profile.collegeName || '',
        userType: profile.userType || 'professional',
        year: profile.year || '',
        course: profile.course || '',
        github: profile.github || '',
        linkedin: profile.linkedin || '',
        leetcode: profile.leetcode || '',
        profileCompleted: Boolean(profile.profileCompleted),
        updatedAt: new Date().toISOString(),
      });

      return useMongo() ? user.save().then((saved) => saved.toObject()) : { ...user };
    };

    if (useMongo()) {
      const user = await User.findById(userId);
      return applyProfile(user);
    }

    const user = memoryState.users.find((entry) => entry.id === String(userId));
    return applyProfile(user);
  },
};

export const repositoryMode = () => (useMongo() ? 'mongo' : 'memory');
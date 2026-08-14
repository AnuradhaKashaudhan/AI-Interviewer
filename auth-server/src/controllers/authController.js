import bcrypt from 'bcrypt';
import { profileUpdateSchema, loginSchema, parseBody, signupSchema } from '../utils/validation.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';
import { repository } from '../services/authRepository.js';

const setSessionUser = (req, user) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => {
    if (error) {
      reject(error);
      return;
    }

    req.session.userId = String(user.id || user._id);
    req.session.save((saveError) => {
      if (saveError) {
        reject(saveError);
        return;
      }

      resolve();
    });
  });
});

const findUser = async (email) => repository.findUserByEmail(email, { includePasswordHash: true });

const normalizeEmail = (email) => email.trim().toLowerCase();

export const signup = async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, password } = parseBody(signupSchema, req.body);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = phoneNumber.trim();

    const conflictingUsers = await repository.findConflictingUsers(normalizedEmail, normalizedPhone);

    if (conflictingUsers.length > 0) {
      return res.status(409).json({ message: 'Email or phone number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await repository.createUser({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      passwordHash,
    });

    await setSessionUser(req, user);

    return res.status(201).json({
      message: 'Account created successfully.',
      email: normalizedEmail,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid signup details.' });
    }

    next(error);
  }
};

export const profile = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await repository.findUserById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const profileData = parseBody(profileUpdateSchema, req.body);
    const updatedUser = await repository.updateUserProfile(req.session.userId, {
      ...profileData,
      profileCompleted: true,
    });

    return res.json({ message: 'Profile updated successfully.', user: sanitizeUser(updatedUser) });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid profile details.' });
    }

    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await findUser(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await setSessionUser(req, user);

    return res.json({
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid login details.' });
    }

    next(error);
  }
};

export const me = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  const user = await repository.findUserById(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: 'Session expired.' });
  }

  return res.json({ user: sanitizeUser(user) });
};

export const logout = async (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie('ai-interviewer.sid');
  return res.json({ message: 'Logged out successfully.' });
};
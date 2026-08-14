import { Router } from 'express';
import {
  login,
  logout,
  me,
  profile,
  signup,
  updateProfile,
} from '../controllers/authController.js';
import {
  loginLimiter,
  signupLimiter,
} from '../middleware/rateLimiters.js';

const router = Router();

router.get('/me', me);
router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.get('/profile', profile);
router.put('/profile', signupLimiter, updateProfile);
router.post('/logout', logout);

export default router;
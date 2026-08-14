import rateLimit from 'express-rate-limit';

const rateLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many signup attempts. Please try again later.' },
  ...rateLimiterOptions,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  ...rateLimiterOptions,
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: { message: 'Too many OTP attempts. Please try again later.' },
  ...rateLimiterOptions,
});

export const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  message: { message: 'Too many resend requests. Please try again later.' },
  ...rateLimiterOptions,
});

export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many password reset attempts. Please try again later.' },
  ...rateLimiterOptions,
});
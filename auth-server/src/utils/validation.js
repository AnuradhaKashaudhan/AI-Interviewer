import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long.');

const profileSchema = z.object({
  collegeName: z.string().trim().optional().or(z.literal('')),
  userType: z.enum(['student', 'professional']),
  year: z.string().trim().optional().or(z.literal('')),
  course: z.string().trim().optional().or(z.literal('')),
  github: z.string().trim().url('Enter a valid GitHub profile URL.').optional().or(z.literal('')),
  linkedin: z.string().trim().url('Enter a valid LinkedIn profile URL.').optional().or(z.literal('')),
  leetcode: z.string().trim().url('Enter a valid LeetCode profile URL.').optional().or(z.literal('')),
}).superRefine((data, context) => {
  if (data.userType === 'student') {
    if (!data.collegeName?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['collegeName'], message: 'College name is required for students.' });
    }

    if (!data.year?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['year'], message: 'Year is required for students.' });
    }

    if (!data.course?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['course'], message: 'Course is required for students.' });
    }
  }
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phoneNumber: z.string().trim().min(7, 'Enter a valid phone number.'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const profileUpdateSchema = profileSchema;

export const parseBody = (schema, body) => schema.parse(body);
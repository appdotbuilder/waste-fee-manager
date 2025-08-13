import { z } from 'zod';

// Enum schemas
export const userRoleSchema = z.enum(['warga', 'admin_kelurahan']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const disputeStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  role: userRoleSchema,
  full_name: z.string(),
  nik: z.string().length(16).regex(/^\d{16}$/, 'NIK must be 16 digits'), // 16-digit ID number
  no_kk: z.string().length(16).regex(/^\d{16}$/, 'No. KK must be 16 digits'), // 16-digit Family Card number
  home_address: z.string(),
  rt: z.string().regex(/^00\d{1,2}$/, 'RT must be in format 00X or 00XX where X is a digit'), // RT format like 001, 002, 010, 025, etc.
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number().positive(), // Amount in Rupiah
  payment_date: z.coerce.date(),
  month: z.number().int().min(1).max(12), // Payment month (1-12)
  year: z.number().int().min(2000), // Payment year
  receipt_photo_url: z.string().url().nullable(), // URL to uploaded receipt photo
  recorded_by_admin_id: z.number(), // Admin who recorded this payment
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Dispute schema
export const disputeSchema = z.object({
  id: z.number(),
  payment_id: z.number(),
  user_id: z.number(),
  dispute_reason: z.string(),
  evidence_photo_url: z.string().url().nullable(), // Citizen's photo evidence
  status: disputeStatusSchema,
  admin_response: z.string().nullable(),
  resolved_by_admin_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Dispute = z.infer<typeof disputeSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  role: userRoleSchema,
  full_name: z.string().min(1).max(255),
  nik: z.string().length(16).regex(/^\d{16}$/, 'NIK must be 16 digits'),
  no_kk: z.string().length(16).regex(/^\d{16}$/, 'No. KK must be 16 digits'),
  home_address: z.string().min(1),
  rt: z.string().regex(/^00\d{1,2}$/, 'RT must be in format 00X or 00XX where X is a digit')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for user login
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schema for recording payments
export const createPaymentInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  payment_date: z.coerce.date(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  receipt_photo_url: z.string().url().nullable(),
  recorded_by_admin_id: z.number()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Input schema for updating payments
export const updatePaymentInputSchema = z.object({
  id: z.number(),
  amount: z.number().positive().optional(),
  payment_date: z.coerce.date().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).optional(),
  receipt_photo_url: z.string().url().nullable().optional()
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentInputSchema>;

// Input schema for creating disputes
export const createDisputeInputSchema = z.object({
  payment_id: z.number(),
  user_id: z.number(),
  dispute_reason: z.string().min(1),
  evidence_photo_url: z.string().url().nullable()
});

export type CreateDisputeInput = z.infer<typeof createDisputeInputSchema>;

// Input schema for resolving disputes
export const resolveDisputeInputSchema = z.object({
  id: z.number(),
  status: disputeStatusSchema,
  admin_response: z.string().nullable(),
  resolved_by_admin_id: z.number()
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeInputSchema>;

// Input schema for updating user data (Admin only)
export const updateUserInputSchema = z.object({
  id: z.number(),
  full_name: z.string().min(1).max(255).optional(),
  nik: z.string().length(16).regex(/^\d{16}$/, 'NIK must be 16 digits').optional(),
  no_kk: z.string().length(16).regex(/^\d{16}$/, 'No. KK must be 16 digits').optional(),
  home_address: z.string().min(1).optional(),
  rt: z.string().regex(/^00\d{1,2}$/, 'RT must be in format 00X or 00XX where X is a digit').optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Query schemas
export const getUserPaymentsInputSchema = z.object({
  user_id: z.number(),
  year: z.number().int().min(2000).optional(),
  month: z.number().int().min(1).max(12).optional()
});

export type GetUserPaymentsInput = z.infer<typeof getUserPaymentsInputSchema>;

export const getUserDisputesInputSchema = z.object({
  user_id: z.number(),
  status: disputeStatusSchema.optional()
});

export type GetUserDisputesInput = z.infer<typeof getUserDisputesInputSchema>;
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['warga', 'admin_kelurahan']);
export const disputeStatusEnum = pgEnum('dispute_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  nik: text('nik').notNull().unique(), // 16-digit National ID
  no_kk: text('no_kk').notNull(), // 16-digit Family Card number
  home_address: text('home_address').notNull(),
  rt: text('rt').notNull(), // RT format like 001, 002, 010, 025
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Amount in Rupiah with decimal precision
  payment_date: timestamp('payment_date').notNull(),
  month: integer('month').notNull(), // Payment month (1-12)
  year: integer('year').notNull(), // Payment year
  receipt_photo_url: text('receipt_photo_url'), // URL to uploaded receipt photo (nullable)
  recorded_by_admin_id: integer('recorded_by_admin_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Disputes table
export const disputesTable = pgTable('disputes', {
  id: serial('id').primaryKey(),
  payment_id: integer('payment_id').notNull().references(() => paymentsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  dispute_reason: text('dispute_reason').notNull(),
  evidence_photo_url: text('evidence_photo_url'), // Citizen's photo evidence (nullable)
  status: disputeStatusEnum('status').notNull().default('pending'),
  admin_response: text('admin_response'), // Admin's response to dispute (nullable)
  resolved_by_admin_id: integer('resolved_by_admin_id').references(() => usersTable.id), // Admin who resolved the dispute (nullable)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  payments: many(paymentsTable, { relationName: 'user_payments' }),
  disputes: many(disputesTable, { relationName: 'user_disputes' }),
  recordedPayments: many(paymentsTable, { relationName: 'admin_recorded_payments' }),
  resolvedDisputes: many(disputesTable, { relationName: 'admin_resolved_disputes' }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.user_id],
    references: [usersTable.id],
    relationName: 'user_payments'
  }),
  recordedByAdmin: one(usersTable, {
    fields: [paymentsTable.recorded_by_admin_id],
    references: [usersTable.id],
    relationName: 'admin_recorded_payments'
  }),
  disputes: many(disputesTable),
}));

export const disputesRelations = relations(disputesTable, ({ one }) => ({
  payment: one(paymentsTable, {
    fields: [disputesTable.payment_id],
    references: [paymentsTable.id],
  }),
  user: one(usersTable, {
    fields: [disputesTable.user_id],
    references: [usersTable.id],
    relationName: 'user_disputes'
  }),
  resolvedByAdmin: one(usersTable, {
    fields: [disputesTable.resolved_by_admin_id],
    references: [usersTable.id],
    relationName: 'admin_resolved_disputes'
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;

export type Dispute = typeof disputesTable.$inferSelect;
export type NewDispute = typeof disputesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  payments: paymentsTable,
  disputes: disputesTable,
};
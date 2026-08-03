import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, text, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID (if linked)
  email: text('email').notNull(),
  role: text('role').notNull().default('Cashier'), // Admin, Manager, Cashier, Barista
  name: text('name').notNull(),
  pin: text('pin'), // Hashed PIN for POS login
  pinAttempts: integer('pin_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastPinChange: timestamp('last_pin_change').defaultNow(),
  previousPins: jsonb('previous_pins').default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, CLOSED
  clockIn: timestamp('clock_in').notNull().defaultNow(),
  clockOut: timestamp('clock_out'),
  openingBalance: numeric('opening_balance', { precision: 10, scale: 2 }).notNull(),
  closingBalance: numeric('closing_balance', { precision: 10, scale: 2 }),
  discrepancy: numeric('discrepancy', { precision: 10, scale: 2 }),
  managerApprovalId: integer('manager_approval_id').references(() => users.id),
  totalTips: numeric('total_tips', { precision: 10, scale: 2 }).default('0'),
});

export const breaks = pgTable('breaks', {
  id: serial('id').primaryKey(),
  shiftId: integer('shift_id').references(() => shifts.id).notNull(),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  phone: text('phone').unique(),
  name: text('name'),
  points: integer('points').default(0),
  tier: text('tier').default('Bronze'), // Bronze, Silver, Gold, Platinum
  birthDate: timestamp('birth_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(), // Arabic name
  category: text('category').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image: text('image'),
  isActive: boolean('is_active').default(true),
});

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(), // kg, liter, unit
  stockQuantity: numeric('stock_quantity', { precision: 10, scale: 3 }).notNull().default('0'),
  parLevel: numeric('par_level', { precision: 10, scale: 3 }).notNull(),
  costPerUnit: numeric('cost_per_unit', { precision: 10, scale: 4 }).notNull(),
});

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id).notNull(),
  quantityRequired: numeric('quantity_required', { precision: 10, scale: 3 }).notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: serial('order_number'),
  userId: integer('user_id').references(() => users.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(), // 15% VAT for KSA
  status: text('status').notNull().default('COMPLETED'),
  paymentMethod: text('payment_method').notNull(), // CASH, CARD, POINTS
  zatcaXml: text('zatca_xml'),
  zatcaQr: text('zatca_qr'),
  zatcaStatus: text('zatca_status').default('PENDING'), // PENDING, SUBMITTED, FAILED
  createdAt: timestamp('created_at').defaultNow().notNull(), // TimescaleDB time column
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb('modifiers'), // e.g. { "Milk": "Oat", "Syrup": "Vanilla" }
});

export const inventoryLogs = pgTable('inventory_logs', {
  id: serial('id').primaryKey(),
  inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id).notNull(),
  changeType: text('change_type').notNull(), // PURCHASE, USAGE, WASTE
  quantityChange: numeric('quantity_change', { precision: 10, scale: 3 }).notNull(),
  costAtTime: numeric('cost_at_time', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id), // Nullable for failed logins with unknown users
  eventType: text('event_type').notNull(), // LOGIN_SUCCESS, LOGIN_FAILED, CLOCK_IN, CLOCK_OUT, ACCOUNT_LOCKED, etc.
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  deviceFingerprint: text('device_fingerprint'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const securityAlerts = pgTable('security_alerts', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // MULTIPLE_FAILURES, SUSPICIOUS_LOGIN, DISCREPANCY, etc.
  message: text('message').notNull(),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scheduledShifts = pgTable('scheduled_shifts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('SCHEDULED'), // SCHEDULED, PUBLISHED
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'), // RRULE format
  createdAt: timestamp('created_at').defaultNow(),
});

export const shiftTrades = pgTable('shift_trades', {
  id: serial('id').primaryKey(),
  shiftId: integer('shift_id').references(() => scheduledShifts.id).notNull(),
  requestorId: integer('requestor_id').references(() => users.id).notNull(),
  acceptorId: integer('acceptor_id').references(() => users.id),
  status: text('status').notNull().default('OPEN'), // OPEN, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED
  managerApprovalId: integer('manager_approval_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const blackoutDates = pgTable('blackout_dates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const shiftSwaps = pgTable('shift_swaps', {
  id: serial('id').primaryKey(),
  requestorId: integer('requestor_id').references(() => users.id).notNull(),
  requestorShiftId: integer('requestor_shift_id').references(() => scheduledShifts.id).notNull(),
  targetUserId: integer('target_user_id').references(() => users.id).notNull(),
  targetShiftId: integer('target_shift_id').references(() => scheduledShifts.id), // Null if swapping for a day off
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow(),
});

export const employeeAvailability = pgTable('employee_availability', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: text('start_time'), // e.g., '08:00'
  endTime: text('end_time'),     // e.g., '16:00'
  isUnavailable: boolean('is_unavailable').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const timeOffRequests = pgTable('time_off_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // ANNUAL_LEAVE, SICK_LEAVE, UNPAID
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow(),
});

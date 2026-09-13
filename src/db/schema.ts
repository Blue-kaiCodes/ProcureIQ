import { pgTable, text, integer, doublePrecision, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 0. Companies Table
export const companies = pgTable("companies", {
  id: text("id").primaryKey(), // Generated company ID (domain/slug/uuid)
  name: text("name").notNull(),
  email: text("email").notNull(),
  industry: text("industry").notNull(),
  country: text("country").notNull(),
  timezone: text("timezone").notNull(),
  size: text("size").notNull(),
  businessId: text("business_id"),
  logo: text("logo"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 1. Users Table (with Role-Based Access Control fields)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin, officer, head, manager, warehouse, buyer
  department: text("department").notNull(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  avatar: text("avatar"),
  theme: text("theme").default("light").notNull(),
  notificationPreferences: jsonb("notification_preferences"),
  isDisabled: boolean("is_disabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 2. Suppliers Table
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avgPricePerUnit: doublePrecision("avg_price_per_unit").notNull(),
  deliveryPerformance: integer("delivery_performance").notNull(), // percentage (0-100)
  avgLeadTimeDays: integer("avg_lead_time_days").notNull(),
  qualityRating: doublePrecision("quality_rating").notNull(), // 0-5
  status: text("status").notNull(), // preferred, approved, restricted
  companyId: text("company_id")
});

// 3. Inventory Table
export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(), // SKU
  itemName: text("item_name").notNull(),
  quantityInStock: integer("quantity_in_stock").notNull(),
  warehouse: text("warehouse").notNull(),
  monthlyConsumption: integer("monthly_consumption").notNull(),
  unit: text("unit").notNull(),
  reorderPoint: integer("reorder_point").notNull(),
  companyId: text("company_id")
});

// 4. Purchase Requests Table
export const requests = pgTable("requests", {
  id: text("id").primaryKey(), // PR-001
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  currency: text("currency").default("INR").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  department: text("department").notNull(),
  supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  status: text("status").notNull(), // draft, submitted, under_review, needs_revision, approved, rejected, po_created, completed
  riskLevel: text("risk_level").notNull(), // low, medium, high
  healthScore: integer("health_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  requestedBy: text("requested_by").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  expectedDeliveryDate: text("expected_delivery_date"),
  purchasingInstructions: text("purchasing_instructions"),
  aiRecommendation: jsonb("ai_recommendation"), // { reason, estimatedSavings, confidence, businessImpact, suggestedAction, explanation }
  financialImpact: jsonb("financial_impact"), // { annualSavings, cashFlowImpact, storageCostChange, deliveryRiskMetric }
  companyId: text("company_id")
});

// 5. Timeline Events
export const timelines = pgTable("timelines", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  user: text("user").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  details: text("details").notNull()
});

// 6. Comments Table
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  author: text("author").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  parentId: text("parent_id")
});

// 7. Change History Table
export const changeHistories = pgTable("change_histories", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: text("user").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull()
});

// 8. Attachments Table
export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // quotation, invoice, specification, contract, other
  fileSize: text("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  url: text("url").notNull() // Data URI or static link or uploaded endpoint
});

// 9. Notifications Table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // NULL means broadcast / general
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
  type: text("type").notNull(), // info, warning, success, alert
  relatedRequestId: text("related_request_id"),
  companyId: text("company_id")
});

// 10. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: text("user").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  ip: text("ip").notNull(),
  companyId: text("company_id")
});

// 11. Invitations Table
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(), // Invitation code / random token
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(), // Email the invitation was sent to
  role: text("role").notNull(), // Role to assign (admin, officer, head, manager, warehouse, buyer)
  department: text("department").notNull(), // Department to assign
  status: text("status").notNull(), // pending, accepted, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull()
});

// Relationships
export const requestsRelations = relations(requests, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [requests.supplierId],
    references: [suppliers.id]
  }),
  timeline: many(timelines),
  comments: many(comments),
  changeHistory: many(changeHistories),
  attachments: many(attachments)
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  requests: many(requests)
}));

export const timelinesRelations = relations(timelines, ({ one }) => ({
  request: one(requests, {
    fields: [timelines.requestId],
    references: [requests.id]
  })
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  request: one(requests, {
    fields: [comments.requestId],
    references: [requests.id]
  })
}));

export const changeHistoriesRelations = relations(changeHistories, ({ one }) => ({
  request: one(requests, {
    fields: [changeHistories.requestId],
    references: [requests.id]
  })
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  request: one(requests, {
    fields: [attachments.requestId],
    references: [requests.id]
  })
}));

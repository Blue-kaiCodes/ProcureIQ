import { pgTable, text, integer, doublePrecision, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
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

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  avatar: text("avatar"),
  theme: text("theme").default("light").notNull(),
  notificationPreferences: jsonb("notification_preferences"),
  isDisabled: boolean("is_disabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avgPricePerUnit: doublePrecision("avg_price_per_unit").notNull(),
  deliveryPerformance: integer("delivery_performance").notNull(),
  avgLeadTimeDays: integer("avg_lead_time_days").notNull(),
  qualityRating: doublePrecision("quality_rating").notNull(),
  status: text("status").notNull(),
  companyId: text("company_id")
});

export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  itemName: text("item_name").notNull(),
  quantityInStock: integer("quantity_in_stock").notNull(),
  warehouse: text("warehouse").notNull(),
  monthlyConsumption: integer("monthly_consumption").notNull(),
  unit: text("unit").notNull(),
  reorderPoint: integer("reorder_point").notNull(),
  companyId: text("company_id")
});

export const requests = pgTable("requests", {
  id: text("id").primaryKey(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  currency: text("currency").default("INR").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  department: text("department").notNull(),
  supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: "restrict" }).notNull(),
  status: text("status").notNull(),
  riskLevel: text("risk_level").notNull(),
  healthScore: integer("health_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  requestedBy: text("requested_by").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium").notNull(),
  expectedDeliveryDate: text("expected_delivery_date"),
  purchasingInstructions: text("purchasing_instructions"),
  aiRecommendation: jsonb("ai_recommendation"),
  financialImpact: jsonb("financial_impact"),
  companyId: text("company_id")
});

export const timelines = pgTable("timelines", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  user: text("user").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  details: text("details").notNull()
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  author: text("author").notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  parentId: text("parent_id")
});

export const changeHistories = pgTable("change_histories", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: text("user").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull()
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => requests.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  url: text("url").notNull()
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
  type: text("type").notNull(),
  relatedRequestId: text("related_request_id"),
  companyId: text("company_id")
});

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

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  status: text("status").notNull(),
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

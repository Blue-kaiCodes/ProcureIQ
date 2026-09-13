CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"file_size" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user" text NOT NULL,
	"role" text NOT NULL,
	"action" text NOT NULL,
	"details" text NOT NULL,
	"ip" text NOT NULL,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "change_histories" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user" text NOT NULL,
	"field" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"author" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"parent_id" text
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"industry" text NOT NULL,
	"country" text NOT NULL,
	"timezone" text NOT NULL,
	"size" text NOT NULL,
	"business_id" text,
	"logo" text,
	"website" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"item_name" text NOT NULL,
	"quantity_in_stock" integer NOT NULL,
	"warehouse" text NOT NULL,
	"monthly_consumption" integer NOT NULL,
	"unit" text NOT NULL,
	"reorder_point" integer NOT NULL,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"type" text NOT NULL,
	"related_request_id" text,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" double precision NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"total_amount" double precision NOT NULL,
	"department" text NOT NULL,
	"supplier_id" text NOT NULL,
	"status" text NOT NULL,
	"risk_level" text NOT NULL,
	"health_score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"requested_by" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"expected_delivery_date" text,
	"purchasing_instructions" text,
	"ai_recommendation" jsonb,
	"financial_impact" jsonb,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avg_price_per_unit" double precision NOT NULL,
	"delivery_performance" integer NOT NULL,
	"avg_lead_time_days" integer NOT NULL,
	"quality_rating" double precision NOT NULL,
	"status" text NOT NULL,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"user" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"details" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"company_id" text,
	"avatar" text,
	"theme" text DEFAULT 'light' NOT NULL,
	"notification_preferences" jsonb,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_histories" ADD CONSTRAINT "change_histories_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
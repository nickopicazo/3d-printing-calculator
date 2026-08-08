-- Full domain revision: drop legacy app tables and recreate.
-- Better Auth tables (user, session, account, verification) are preserved.

DROP TABLE IF EXISTS "quote_filament_lines" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quote_plates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "quotes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "filaments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "projects" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "clients" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "print_materials" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "print_plates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prints" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "materials" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "customers" CASCADE;--> statement-breakpoint

CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'filament' NOT NULL,
	"type" text,
	"color" text,
	"price_per_unit" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "prints" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"technology" text DEFAULT 'fdm' NOT NULL,
	"printer_name" text,
	"source_name" text,
	"print_minutes" integer DEFAULT 0 NOT NULL,
	"labor_minutes" integer DEFAULT 0 NOT NULL,
	"hardware_cost" double precision DEFAULT 0 NOT NULL,
	"packaging_cost" double precision DEFAULT 0 NOT NULL,
	"material_cost" double precision DEFAULT 0 NOT NULL,
	"electricity_cost" double precision DEFAULT 0 NOT NULL,
	"labor_cost" double precision DEFAULT 0 NOT NULL,
	"machine_cost" double precision DEFAULT 0 NOT NULL,
	"consumables_cost" double precision DEFAULT 0 NOT NULL,
	"landed" double precision DEFAULT 0 NOT NULL,
	"failure_uplift" double precision DEFAULT 0 NOT NULL,
	"markup_amount" double precision DEFAULT 0 NOT NULL,
	"pre_vat" double precision DEFAULT 0 NOT NULL,
	"vat_amount" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "print_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"print_id" text NOT NULL,
	"inventory_material_id" text,
	"label" text NOT NULL,
	"unit" text DEFAULT 'g' NOT NULL,
	"quantity" double precision NOT NULL,
	"price_per_unit" double precision NOT NULL,
	"slot" integer,
	"type" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

CREATE TABLE "print_plates" (
	"id" text PRIMARY KEY NOT NULL,
	"print_id" text NOT NULL,
	"plate_index" integer NOT NULL,
	"image_path" text,
	"print_minutes" integer,
	"sliced" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);--> statement-breakpoint

CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" text,
	"project_id" text,
	"title" text NOT NULL,
	"material_cost" double precision DEFAULT 0 NOT NULL,
	"electricity_cost" double precision DEFAULT 0 NOT NULL,
	"labor_cost" double precision DEFAULT 0 NOT NULL,
	"machine_cost" double precision DEFAULT 0 NOT NULL,
	"hardware_cost" double precision DEFAULT 0 NOT NULL,
	"packaging_cost" double precision DEFAULT 0 NOT NULL,
	"consumables_cost" double precision DEFAULT 0 NOT NULL,
	"landed" double precision DEFAULT 0 NOT NULL,
	"failure_uplift" double precision DEFAULT 0 NOT NULL,
	"markup_amount" double precision DEFAULT 0 NOT NULL,
	"pre_vat" double precision DEFAULT 0 NOT NULL,
	"vat_amount" double precision DEFAULT 0 NOT NULL,
	"vat_rate" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"print_minutes" integer DEFAULT 0 NOT NULL,
	"settings_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prints_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"customer_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prints" ADD CONSTRAINT "prints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prints" ADD CONSTRAINT "prints_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_materials" ADD CONSTRAINT "print_materials_print_id_prints_id_fk" FOREIGN KEY ("print_id") REFERENCES "public"."prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_materials" ADD CONSTRAINT "print_materials_inventory_material_id_materials_id_fk" FOREIGN KEY ("inventory_material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_plates" ADD CONSTRAINT "print_plates_print_id_prints_id_fk" FOREIGN KEY ("print_id") REFERENCES "public"."prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;

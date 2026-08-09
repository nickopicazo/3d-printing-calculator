ALTER TABLE "prints" ADD COLUMN "addons_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "addons_cost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE "print_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"print_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"unit_cost" double precision DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "print_addons" ADD CONSTRAINT "print_addons_print_id_prints_id_fk" FOREIGN KEY ("print_id") REFERENCES "public"."prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "prints" SET "addons_cost" = COALESCE("hardware_cost", 0) + COALESCE("packaging_cost", 0);--> statement-breakpoint
UPDATE "quotes" SET "addons_cost" = COALESCE("hardware_cost", 0) + COALESCE("packaging_cost", 0);--> statement-breakpoint
INSERT INTO "print_addons" ("id", "print_id", "name", "quantity", "unit_cost", "sort_order")
SELECT 'hw-' || "id", "id", 'Hardware', 1, "hardware_cost", 0
FROM "prints"
WHERE COALESCE("hardware_cost", 0) > 0;--> statement-breakpoint
INSERT INTO "print_addons" ("id", "print_id", "name", "quantity", "unit_cost", "sort_order")
SELECT 'pkg-' || "id", "id", 'Packaging', 1, "packaging_cost", 1
FROM "prints"
WHERE COALESCE("packaging_cost", 0) > 0;--> statement-breakpoint
ALTER TABLE "prints" DROP COLUMN "hardware_cost";--> statement-breakpoint
ALTER TABLE "prints" DROP COLUMN "packaging_cost";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "hardware_cost";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "packaging_cost";

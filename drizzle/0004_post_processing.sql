ALTER TABLE "prints" ADD COLUMN "post_process_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "prints" ADD COLUMN "post_process_cost" double precision DEFAULT 0 NOT NULL;

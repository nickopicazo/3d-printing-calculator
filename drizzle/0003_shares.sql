CREATE TABLE IF NOT EXISTS "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shares_code_unique" ON "shares" ("code");

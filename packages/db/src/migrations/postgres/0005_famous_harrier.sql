CREATE TABLE "dashboard_cache" (
	"feed_type" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

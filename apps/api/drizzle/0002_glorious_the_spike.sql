CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"access_token_id" varchar(64) NOT NULL,
	"refresh_token_id" varchar(64) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pk";--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_session_id_uq" ON "auth_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_access_token_id_uq" ON "auth_sessions" USING btree ("access_token_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_refresh_token_id_uq" ON "auth_sessions" USING btree ("refresh_token_id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_role_campus_uq" UNIQUE NULLS NOT DISTINCT("user_id","role_id","campus_id");

CREATE TABLE "tasks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"task_type" varchar(64) NOT NULL,
	"source_type" varchar(64),
	"source_id" varchar(64),
	"student_id" varchar(36),
	"family_id" varchar(36),
	"teacher_id" varchar(36),
	"owner_user_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"due_at" timestamp with time zone,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"result_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"alert_type" varchar(64) NOT NULL,
	"alert_level" varchar(16) DEFAULT 'medium' NOT NULL,
	"source_type" varchar(64),
	"source_id" varchar(64),
	"student_id" varchar(36),
	"family_id" varchar(36),
	"invoice_id" varchar(36),
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"resolver_user_id" varchar(36),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tasks_owner_status_due_idx" ON "tasks" USING btree ("owner_user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "tasks_student_status_idx" ON "tasks" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "tasks_family_status_idx" ON "tasks" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX "tasks_teacher_status_idx" ON "tasks" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "alerts_status_level_created_idx" ON "alerts" USING btree ("status","alert_level","created_at");--> statement-breakpoint
CREATE INDEX "alerts_student_status_idx" ON "alerts" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "alerts_family_status_idx" ON "alerts" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX "alerts_invoice_status_idx" ON "alerts" USING btree ("invoice_id","status");

CREATE TABLE "homework_outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" varchar(32) NOT NULL,
	"biz_id" varchar(36) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_review_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar(36) NOT NULL,
	"reviewer_teacher_id" varchar(36),
	"review_result" varchar(16),
	"final_accuracy_pct" numeric(5, 2),
	"final_error_summary" text,
	"final_suggestion" text,
	"publish_to_family" varchar(5) DEFAULT 'false' NOT NULL,
	"final_error_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_taxonomies" RENAME COLUMN "active" TO "status";--> statement-breakpoint
ALTER TABLE "growth_observations" ADD COLUMN "scores" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "homework_review_drafts" ADD CONSTRAINT "homework_review_drafts_submission_id_homework_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."homework_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_review_drafts" ADD CONSTRAINT "homework_review_drafts_reviewer_teacher_id_teachers_id_fk" FOREIGN KEY ("reviewer_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "homework_review_drafts_submission_id_uq" ON "homework_review_drafts" USING btree ("submission_id");
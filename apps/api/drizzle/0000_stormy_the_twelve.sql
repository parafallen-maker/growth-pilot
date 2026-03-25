CREATE TABLE "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Shanghai' NOT NULL,
	"address" text,
	"contact_phone" varchar(32),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" varchar(36),
	"code" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_dictionaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dict_type" varchar(64) NOT NULL,
	"code" varchar(64) NOT NULL,
	"label" varchar(128) NOT NULL,
	"value" varchar(255),
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"module" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"scope_level" varchar(16) DEFAULT 'campus' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" varchar(36) NOT NULL,
	"role_id" varchar(36) NOT NULL,
	"campus_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pk" PRIMARY KEY("user_id","role_id","campus_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"mobile" varchar(32),
	"email" varchar(128),
	"avatar_url" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_code" varchar(32) NOT NULL,
	"family_name" varchar(128),
	"primary_contact_name" varchar(64),
	"primary_mobile" varchar(32),
	"secondary_mobile" varchar(32),
	"family_structure" varchar(32),
	"address" text,
	"communication_preference" varchar(32) DEFAULT 'wechat',
	"notes" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36),
	"source_type" varchar(32),
	"source_id" varchar(36),
	"title" varchar(128) NOT NULL,
	"description" text,
	"frequency" varchar(16) DEFAULT 'once' NOT NULL,
	"assignee_guardian_id" varchar(36),
	"start_date" date,
	"due_date" date,
	"status" varchar(16) DEFAULT 'todo' NOT NULL,
	"completion_note" text,
	"completed_at" timestamp with time zone,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" varchar(36) NOT NULL,
	"name" varchar(64) NOT NULL,
	"relation" varchar(32) NOT NULL,
	"mobile" varchar(32),
	"wechat_id" varchar(64),
	"email" varchar(128),
	"occupation" varchar(64),
	"is_primary" varchar(5) DEFAULT 'false' NOT NULL,
	"is_emergency" varchar(5) DEFAULT 'false' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_development_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"record_type" varchar(32) NOT NULL,
	"title" varchar(128) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"observer_teacher_id" varchar(36),
	"strengths" text,
	"improvements" text,
	"action_items" text,
	"due_date" date,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"attachment_file_id" varchar(36),
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"campus_id" varchar(36) NOT NULL,
	"weekday" varchar(8) NOT NULL,
	"start_time" varchar(16) NOT NULL,
	"end_time" varchar(16) NOT NULL,
	"shift_type" varchar(32) DEFAULT 'duty' NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"employee_no" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"mobile" varchar(32),
	"email" varchar(128),
	"hire_date" date,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"lead_subject" varchar(32),
	"avatar_file_id" varchar(36),
	"bio" text,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"campus_id" varchar(36) NOT NULL,
	"term_id" varchar(36) NOT NULL,
	"primary_teacher_id" varchar(36),
	"group_id" varchar(36),
	"enroll_date" date NOT NULL,
	"leave_date" date,
	"leave_reason" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"tag_code" varchar(64) NOT NULL,
	"tag_name" varchar(64) NOT NULL,
	"tag_color" varchar(16),
	"source_type" varchar(32) DEFAULT 'manual' NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_no" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"gender" varchar(16),
	"birth_date" date,
	"school_name" varchar(128),
	"grade_label" varchar(32) NOT NULL,
	"class_name" varchar(64),
	"home_campus_id" varchar(36),
	"family_id" varchar(36),
	"photo_file_id" varchar(36),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"profile_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_provider" varchar(32) DEFAULT 's3' NOT NULL,
	"bucket_name" varchar(128) NOT NULL,
	"object_key" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"checksum" varchar(128),
	"uploaded_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" varchar(64) NOT NULL,
	"biz_type" varchar(64) NOT NULL,
	"biz_id" varchar(36) NOT NULL,
	"idempotency_key" varchar(128),
	"status" varchar(16) DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "error_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"category" varchar(32) NOT NULL,
	"subject_scope" varchar(32),
	"description" text,
	"active" varchar(5) DEFAULT 'true' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar(36) NOT NULL,
	"job_id" varchar(36),
	"provider" varchar(64) NOT NULL,
	"model_name" varchar(64) NOT NULL,
	"model_version" varchar(64),
	"prompt_version" varchar(64),
	"status" varchar(16) DEFAULT 'success' NOT NULL,
	"raw_markdown" text,
	"structured_output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accuracy_pct" numeric(5, 2),
	"error_summary_text" text,
	"suggestion_text" text,
	"confidence" numeric(5, 2),
	"duration_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_review_error_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" varchar(36) NOT NULL,
	"error_taxonomy_id" varchar(36) NOT NULL,
	"weight" numeric(8, 2) DEFAULT '1' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar(36) NOT NULL,
	"reviewer_teacher_id" varchar(36),
	"review_result" varchar(16) NOT NULL,
	"final_accuracy_pct" numeric(5, 2),
	"final_error_summary" text,
	"final_suggestion" text,
	"publish_to_family" varchar(5) DEFAULT 'false' NOT NULL,
	"published_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submission_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar(36) NOT NULL,
	"file_id" varchar(36) NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_no" varchar(32) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"campus_id" varchar(36),
	"term_id" varchar(36),
	"teacher_id" varchar(36),
	"subject" varchar(32) NOT NULL,
	"homework_date" date NOT NULL,
	"source_type" varchar(32) DEFAULT 'teacher_upload' NOT NULL,
	"source_channel" varchar(32) DEFAULT 'web' NOT NULL,
	"ai_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"review_status" varchar(16) DEFAULT 'unreviewed' NOT NULL,
	"final_accuracy_pct" numeric(5, 2),
	"final_error_summary" text,
	"family_feedback_status" varchar(16) DEFAULT 'draft' NOT NULL,
	"remark" text,
	"uploaded_by" varchar(36),
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_goal_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" varchar(36) NOT NULL,
	"checkin_date" date NOT NULL,
	"progress_value" numeric(10, 2),
	"progress_note" text,
	"next_action" text,
	"recorder_user_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"goal_type" varchar(32) NOT NULL,
	"title" varchar(128) NOT NULL,
	"description" text,
	"owner_role" varchar(16) DEFAULT 'teacher' NOT NULL,
	"metric_type" varchar(16) DEFAULT 'score' NOT NULL,
	"baseline_value" numeric(10, 2),
	"target_value" numeric(10, 2),
	"current_value" numeric(10, 2),
	"start_date" date,
	"due_date" date,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"source_type" varchar(32),
	"source_id" varchar(36),
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"teacher_id" varchar(36),
	"template_id" varchar(36),
	"observation_date" date NOT NULL,
	"scene" varchar(32) NOT NULL,
	"total_score" numeric(8, 2),
	"strengths" text,
	"improvement_notes" text,
	"publish_to_family" varchar(5) DEFAULT 'false' NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"report_type" varchar(16) NOT NULL,
	"period_key" varchar(32) NOT NULL,
	"period_start" date,
	"period_end" date,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"title" varchar(128),
	"draft_markdown" text,
	"summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_by_job_id" varchar(36),
	"reviewer_user_id" varchar(36),
	"published_at" timestamp with time zone,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"weight" numeric(8, 2) DEFAULT '1' NOT NULL,
	"score_min" integer DEFAULT 1 NOT NULL,
	"score_max" integer DEFAULT 5 NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" varchar(36),
	"term_id" varchar(36),
	"name" varchar(128) NOT NULL,
	"stage_scope" varchar(64),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"description" text,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"campus_id" varchar(36) NOT NULL,
	"device_id" varchar(36),
	"event_type" varchar(32) NOT NULL,
	"event_time" timestamp with time zone NOT NULL,
	"operator_user_id" varchar(36),
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_device_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"device_id" varchar(36) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unbound_at" timestamp with time zone,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" varchar(36),
	"serial_no" varchar(64) NOT NULL,
	"device_type" varchar(32) DEFAULT 'beacon' NOT NULL,
	"status" varchar(16) DEFAULT 'idle' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_time_daily_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"stat_date" date NOT NULL,
	"subject" varchar(32) NOT NULL,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_time_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"campus_id" varchar(36),
	"subject" varchar(32) NOT NULL,
	"device_id" varchar(36),
	"source_type" varchar(16) DEFAULT 'manual' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"created_by" varchar(36),
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"category" varchar(32) NOT NULL,
	"billing_mode" varchar(16) NOT NULL,
	"price_cents" bigint NOT NULL,
	"unit" varchar(32) DEFAULT 'term' NOT NULL,
	"description" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar(36) NOT NULL,
	"product_id" varchar(36),
	"item_name" varchar(128) NOT NULL,
	"unit_price_cents" bigint DEFAULT 0 NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"subtotal_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_no" varchar(32) NOT NULL,
	"campus_id" varchar(36),
	"term_id" varchar(36),
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"sign_date" date NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_amount_cents" bigint DEFAULT 0 NOT NULL,
	"discount_amount_cents" bigint DEFAULT 0 NOT NULL,
	"payable_amount_cents" bigint DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"remark" text,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar(36) NOT NULL,
	"item_name" varchar(128) NOT NULL,
	"product_id" varchar(36),
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price_cents" bigint DEFAULT 0 NOT NULL,
	"amount_cents" bigint DEFAULT 0 NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_no" varchar(32) NOT NULL,
	"contract_id" varchar(36),
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"billing_period" varchar(32),
	"issue_date" date NOT NULL,
	"due_date" date,
	"amount_cents" bigint DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"note" text,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar(36) NOT NULL,
	"payment_no" varchar(32) NOT NULL,
	"paid_amount_cents" bigint NOT NULL,
	"payment_time" timestamp with time zone NOT NULL,
	"channel" varchar(32) NOT NULL,
	"transaction_no" varchar(128),
	"status" varchar(16) DEFAULT 'success' NOT NULL,
	"idempotency_key" varchar(128),
	"operator_user_id" varchar(36),
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" varchar(36),
	"refund_no" varchar(32) NOT NULL,
	"refund_amount_cents" bigint NOT NULL,
	"refund_time" timestamp with time zone NOT NULL,
	"reason" text,
	"status" varchar(16) DEFAULT 'success' NOT NULL,
	"operator_user_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewal_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36) NOT NULL,
	"contract_id" varchar(36),
	"owner_user_id" varchar(36),
	"expected_end_date" date,
	"status" varchar(16) DEFAULT 'todo' NOT NULL,
	"last_contact_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36),
	"channel" varchar(16) NOT NULL,
	"direction" varchar(16) NOT NULL,
	"topic" varchar(128),
	"summary" text NOT NULL,
	"next_action" text,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar(36),
	"family_id" varchar(36) NOT NULL,
	"student_id" varchar(36),
	"source_type" varchar(32),
	"source_id" varchar(36),
	"channel" varchar(16) NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_by_user_id" varchar(36),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"channel" varchar(16) NOT NULL,
	"subject_template" varchar(255),
	"body_template" text NOT NULL,
	"active" varchar(5) DEFAULT 'true' NOT NULL,
	"created_by" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_terms" ADD CONSTRAINT "school_terms_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_tasks" ADD CONSTRAINT "family_tasks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_tasks" ADD CONSTRAINT "family_tasks_assignee_guardian_id_guardians_id_fk" FOREIGN KEY ("assignee_guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_development_records" ADD CONSTRAINT "teacher_development_records_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_development_records" ADD CONSTRAINT "teacher_development_records_observer_teacher_id_teachers_id_fk" FOREIGN KEY ("observer_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_shifts" ADD CONSTRAINT "teacher_shifts_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_shifts" ADD CONSTRAINT "teacher_shifts_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_shifts" ADD CONSTRAINT "teacher_shifts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_primary_teacher_id_teachers_id_fk" FOREIGN KEY ("primary_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_tags" ADD CONSTRAINT "student_tags_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_home_campus_id_campuses_id_fk" FOREIGN KEY ("home_campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_ai_analyses" ADD CONSTRAINT "homework_ai_analyses_submission_id_homework_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."homework_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_ai_analyses" ADD CONSTRAINT "homework_ai_analyses_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_review_error_items" ADD CONSTRAINT "homework_review_error_items_review_id_homework_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."homework_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_review_error_items" ADD CONSTRAINT "homework_review_error_items_error_taxonomy_id_error_taxonomies_id_fk" FOREIGN KEY ("error_taxonomy_id") REFERENCES "public"."error_taxonomies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_reviews" ADD CONSTRAINT "homework_reviews_submission_id_homework_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."homework_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_reviews" ADD CONSTRAINT "homework_reviews_reviewer_teacher_id_teachers_id_fk" FOREIGN KEY ("reviewer_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submission_files" ADD CONSTRAINT "homework_submission_files_submission_id_homework_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."homework_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submission_files" ADD CONSTRAINT "homework_submission_files_file_id_file_assets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goal_checkins" ADD CONSTRAINT "growth_goal_checkins_goal_id_growth_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."growth_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD CONSTRAINT "growth_goals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_goals" ADD CONSTRAINT "growth_goals_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_observations" ADD CONSTRAINT "growth_observations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_observations" ADD CONSTRAINT "growth_observations_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_observations" ADD CONSTRAINT "growth_observations_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_observations" ADD CONSTRAINT "growth_observations_template_id_rubric_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rubric_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_reports" ADD CONSTRAINT "growth_reports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_reports" ADD CONSTRAINT "growth_reports_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_reports" ADD CONSTRAINT "growth_reports_generated_by_job_id_ai_jobs_id_fk" FOREIGN KEY ("generated_by_job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_dimensions" ADD CONSTRAINT "rubric_dimensions_template_id_rubric_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rubric_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_templates" ADD CONSTRAINT "rubric_templates_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_device_bindings" ADD CONSTRAINT "student_device_bindings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_device_bindings" ADD CONSTRAINT "student_device_bindings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_time_daily_stats" ADD CONSTRAINT "homework_time_daily_stats_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_time_sessions" ADD CONSTRAINT "homework_time_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_time_sessions" ADD CONSTRAINT "homework_time_sessions_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_time_sessions" ADD CONSTRAINT "homework_time_sessions_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_time_sessions" ADD CONSTRAINT "homework_time_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_product_id_billing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."billing_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_billing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."billing_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_tasks" ADD CONSTRAINT "renewal_tasks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_tasks" ADD CONSTRAINT "renewal_tasks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_tasks" ADD CONSTRAINT "renewal_tasks_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_records" ADD CONSTRAINT "communication_records_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_records" ADD CONSTRAINT "communication_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campuses_code_uq" ON "campuses" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "school_terms_code_uq" ON "school_terms" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "system_dictionaries_type_code_uq" ON "system_dictionaries" USING btree ("dict_type","code");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_code_uq" ON "permissions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_code_uq" ON "roles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "families_family_code_uq" ON "families" USING btree ("family_code");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_employee_no_uq" ON "teachers" USING btree ("employee_no");--> statement-breakpoint
CREATE UNIQUE INDEX "student_enrollments_student_campus_term_uq" ON "student_enrollments" USING btree ("student_id","campus_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_tags_student_tag_code_uq" ON "student_tags" USING btree ("student_id","tag_code");--> statement-breakpoint
CREATE UNIQUE INDEX "students_student_no_uq" ON "students" USING btree ("student_no");--> statement-breakpoint
CREATE UNIQUE INDEX "file_assets_bucket_object_key_uq" ON "file_assets" USING btree ("bucket_name","object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "error_taxonomies_code_uq" ON "error_taxonomies" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_review_error_items_review_taxonomy_uq" ON "homework_review_error_items" USING btree ("review_id","error_taxonomy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_reviews_submission_id_uq" ON "homework_reviews" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_submission_files_submission_file_uq" ON "homework_submission_files" USING btree ("submission_id","file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_submissions_submission_no_uq" ON "homework_submissions" USING btree ("submission_no");--> statement-breakpoint
CREATE UNIQUE INDEX "growth_reports_student_type_period_uq" ON "growth_reports" USING btree ("student_id","report_type","period_key");--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_dimensions_template_code_uq" ON "rubric_dimensions" USING btree ("template_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_serial_no_uq" ON "devices" USING btree ("serial_no");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_time_daily_stats_student_date_subject_uq" ON "homework_time_daily_stats" USING btree ("student_id","stat_date","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_products_code_uq" ON "billing_products" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_contract_no_uq" ON "contracts" USING btree ("contract_no");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_no_uq" ON "invoices" USING btree ("invoice_no");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_payment_no_uq" ON "payments" USING btree ("payment_no");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_refund_no_uq" ON "refunds" USING btree ("refund_no");--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_code_uq" ON "message_templates" USING btree ("code");
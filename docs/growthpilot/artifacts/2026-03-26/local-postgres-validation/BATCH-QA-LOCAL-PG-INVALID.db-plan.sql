create schema if not exists qa_staging_local_validation;
create table if not exists qa_staging_local_validation.import_batches (
  batch_id text primary key,
  source_system text not null,
  source_file text not null,
  mode text not null,
  raw_row_count integer not null,
  normalized_row_count integer not null,
  ready_row_count integer not null,
  rejected_row_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists qa_staging_local_validation.staging_raw_rows (
  batch_id text not null,
  source_system text not null,
  source_file text not null,
  source_sheet text not null,
  source_row_no integer not null,
  source_pk text not null,
  source_hash text not null,
  idempotency_key text not null,
  import_status text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, source_file, source_sheet, source_row_no)
);
create table if not exists qa_staging_local_validation.staging_normalized_rows (
  batch_id text not null,
  source_file text not null,
  source_sheet text not null,
  source_row_no integer not null,
  source_pk text not null,
  target_domain text not null,
  business_key text not null,
  idempotency_key text not null,
  import_status text not null,
  normalized_payload jsonb not null,
  mapping_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, source_file, source_sheet, source_row_no)
);
create table if not exists qa_staging_local_validation.staging_rejects (
  batch_id text not null,
  source_file text not null,
  source_sheet text not null,
  source_row_no integer not null,
  source_pk text not null,
  target_domain text not null,
  business_key text not null,
  reject_code text not null,
  reject_reason text not null,
  field_name text not null,
  raw_value text,
  expected_rule text not null,
  suggested_action text not null,
  owner text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_id, source_file, source_sheet, source_row_no, reject_code)
);
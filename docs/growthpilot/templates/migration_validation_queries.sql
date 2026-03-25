-- Migration validation SQL template
-- Replace <batch-id> before execution, then store the rendered SQL in release-workspace/sql/.

-- 1. Batch summary
select batch_id, source_system, source_file, mode, raw_row_count, normalized_row_count, ready_row_count, rejected_row_count, created_at, updated_at
from qa_staging.import_batches
where batch_id = '<batch-id>';

-- 2. Raw / normalized / reject counts
select batch_id, count(*) as raw_rows
from qa_staging.staging_raw_rows
where batch_id = '<batch-id>'
group by batch_id;

select batch_id, import_status, count(*) as normalized_rows
from qa_staging.staging_normalized_rows
where batch_id = '<batch-id>'
group by batch_id, import_status
order by import_status;

select batch_id, reject_code, count(*) as reject_rows
from qa_staging.staging_rejects
where batch_id = '<batch-id>'
group by batch_id, reject_code
order by reject_code;

-- 3. Ready rows by domain
select target_domain, count(*) as ready_rows
from qa_staging.staging_normalized_rows
where batch_id = '<batch-id>'
  and import_status = 'ready_to_load'
group by target_domain
order by target_domain;

-- 4. Duplicate idempotency keys
select idempotency_key, count(*) as duplicate_count
from qa_staging.staging_normalized_rows
where batch_id = '<batch-id>'
group by idempotency_key
having count(*) > 1
order by duplicate_count desc, idempotency_key;

-- 5. Sample rows per domain for manual review
with ranked as (
  select
    target_domain,
    source_sheet,
    source_row_no,
    business_key,
    normalized_payload,
    row_number() over (
      partition by target_domain
      order by source_sheet, source_row_no
    ) as rn
  from qa_staging.staging_normalized_rows
  where batch_id = '<batch-id>'
    and import_status = 'ready_to_load'
)
select target_domain, source_sheet, source_row_no, business_key, normalized_payload
from ranked
where rn <= 10
order by target_domain, rn;

-- 6. Billing balance checks inside staging normalized payload
select
  business_key,
  (normalized_payload -> 'amounts' ->> 'contractNo') as contract_no,
  (normalized_payload -> 'amounts' ->> 'invoiceNo') as invoice_no,
  (normalized_payload -> 'amounts' ->> 'totalAmountCents')::bigint as total_amount_cents,
  (normalized_payload -> 'amounts' ->> 'discountAmountCents')::bigint as discount_amount_cents,
  (normalized_payload -> 'amounts' ->> 'payableAmountCents')::bigint as payable_amount_cents,
  (normalized_payload -> 'amounts' ->> 'invoiceItemsAmountCents')::bigint as invoice_items_amount_cents,
  (normalized_payload -> 'amounts' ->> 'paymentsAmountCents')::bigint as payments_amount_cents,
  (normalized_payload -> 'amounts' ->> 'refundsAmountCents')::bigint as refunds_amount_cents
from qa_staging.staging_normalized_rows
where batch_id = '<batch-id>'
  and target_domain = 'billing'
  and import_status = 'ready_to_load'
  and (
    ((normalized_payload -> 'amounts' ->> 'totalAmountCents')::bigint - (normalized_payload -> 'amounts' ->> 'discountAmountCents')::bigint)
      <> (normalized_payload -> 'amounts' ->> 'payableAmountCents')::bigint
    or (normalized_payload -> 'amounts' ->> 'invoiceItemsAmountCents')::bigint
      <> (normalized_payload -> 'amounts' ->> 'totalAmountCents')::bigint
    or (normalized_payload -> 'amounts' ->> 'refundsAmountCents')::bigint
      > (normalized_payload -> 'amounts' ->> 'paymentsAmountCents')::bigint
  )
order by business_key;

-- 7. Final-table checks
-- Run only if downstream final load has already happened for this batch.

-- 7.1 Students without family after final load
select s.student_no, s.name, s.family_id
from students s
where s.family_id is null
order by s.student_no;

-- 7.2 Enrollments without teacher / campus / term linkage
select se.id, s.student_no, se.campus_id, se.term_id, se.primary_teacher_id
from student_enrollments se
join students s on s.id = se.student_id
where se.campus_id is null
   or se.term_id is null
order by s.student_no, se.id;

-- 7.3 Billing amount chain consistency after final load
with invoice_item_sums as (
  select invoice_id, sum(amount_cents) as invoice_items_amount_cents
  from invoice_items
  group by invoice_id
),
payment_sums as (
  select invoice_id, sum(paid_amount_cents) as payments_amount_cents
  from payments
  where status = 'success'
  group by invoice_id
),
refund_sums as (
  select p.invoice_id, sum(r.refund_amount_cents) as refunds_amount_cents
  from refunds r
  join payments p on p.id = r.payment_id
  where r.status = 'success'
  group by p.invoice_id
)
select
  c.contract_no,
  i.invoice_no,
  c.total_amount_cents,
  c.discount_amount_cents,
  c.payable_amount_cents,
  i.amount_cents as invoice_amount_cents,
  coalesce(ii.invoice_items_amount_cents, 0) as invoice_items_amount_cents,
  coalesce(ps.payments_amount_cents, 0) as payments_amount_cents,
  coalesce(rs.refunds_amount_cents, 0) as refunds_amount_cents
from contracts c
join invoices i on i.contract_id = c.id
left join invoice_item_sums ii on ii.invoice_id = i.id
left join payment_sums ps on ps.invoice_id = i.id
left join refund_sums rs on rs.invoice_id = i.id
where c.payable_amount_cents <> c.total_amount_cents - c.discount_amount_cents
   or i.amount_cents <> coalesce(ii.invoice_items_amount_cents, 0)
   or coalesce(rs.refunds_amount_cents, 0) > coalesce(ps.payments_amount_cents, 0)
order by c.contract_no, i.invoice_no;

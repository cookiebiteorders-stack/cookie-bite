-- Allow review-request emails in the notification_jobs queue (Day 3 post-delivery)
alter table public.notification_jobs
  drop constraint if exists notification_jobs_job_type_check;

alter table public.notification_jobs
  add constraint notification_jobs_job_type_check
  check (job_type in ('order_confirmation', 'payment_confirmation', 'review_request'));

create index if not exists notification_jobs_review_request_order_idx
  on public.notification_jobs (order_id, job_type)
  where job_type = 'review_request' and status in ('pending', 'processing', 'completed');

-- Business Service Requests — Scale Your Business concierge module
-- Run this in Supabase SQL Editor

create table if not exists business_service_requests (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid references stores(id) on delete set null,
  service_type   text not null, -- 'domestic_pg' | 'international_pg' | 'meta_usdt'
  status         text not null default 'new', -- new | contacted | in_review | docs_pending | approved | completed | closed
  -- common fields
  business_name  text not null,
  contact_person text not null,
  email          text not null,
  phone          text not null,
  -- domestic pg
  website_url         text,
  monthly_order_volume text,
  current_gateway     text,
  has_gst_msme        text,
  -- international pg
  countries_sold_to   text,
  monthly_intl_orders text,
  payment_receive_method text, -- 'bank_local_rails' | 'usdt'
  -- meta usdt
  monthly_meta_spend  text,
  settlement_currency text, -- 'USDT' | 'INR'
  -- shared optional
  additional_notes text,
  -- admin fields
  internal_notes text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists bsr_store_idx   on business_service_requests(store_id);
create index if not exists bsr_status_idx  on business_service_requests(status);
create index if not exists bsr_service_idx on business_service_requests(service_type);

create or replace function set_bsr_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists bsr_updated_at on business_service_requests;
create trigger bsr_updated_at
  before update on business_service_requests
  for each row execute function set_bsr_updated_at();

alter table business_service_requests enable row level security;

-- store owners can submit and view their own requests
create policy "owner can manage own service requests"
  on business_service_requests
  using (
    store_id is null or
    store_id in (select id from stores where owner_id = auth.uid())
  );

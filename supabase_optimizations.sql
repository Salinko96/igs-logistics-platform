-- Indexes for the operational dashboard. Run after confirming these columns exist.
create index if not exists shipments_case_id_updated_at_idx on public."Shipment" ("caseId", "updatedAt" desc);
create index if not exists documents_organization_status_idx on public."Document" ("organizationId", "status");
create index if not exists incidents_organization_status_severity_idx on public."Incident" ("organizationId", "status", "severity");

create materialized view if not exists public.monthly_revenue_view as
select date_trunc('month', "issuedAt")::date as month,
       "organizationId",
       sum("netAmount") as revenue,
       count(*)::int as invoice_count
from public."Invoice"
where "issuedAt" is not null and "status" not in ('annulee', 'brouillon')
group by 1, 2;

create unique index if not exists monthly_revenue_view_pk
  on public.monthly_revenue_view ("organizationId", month);

create or replace function public.get_monthly_revenue(p_organization_id text, p_months integer default 12)
returns table(month date, revenue numeric, invoice_count integer)
language sql stable security invoker
as $$
  select month, revenue, invoice_count
  from public.monthly_revenue_view
  where "organizationId" = p_organization_id
    and month >= (date_trunc('month', current_date) - make_interval(months => greatest(p_months, 1)))::date
  order by month;
$$;

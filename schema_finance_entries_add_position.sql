-- Add sortable position column
alter table if exists public.finance_entries
  add column if not exists position int;

-- Initialize positions for existing rows (per category/month/year)
with ranked as (
  select id, row_number() over (partition by category_id, year, month order by created_at) - 1 as rn
  from public.finance_entries
)
update public.finance_entries f
set position = r.rn
from ranked r
where r.id = f.id and f.position is null;

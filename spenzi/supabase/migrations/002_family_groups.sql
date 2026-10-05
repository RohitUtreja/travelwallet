-- ============================================================
-- Family groups + spend summary
-- Safe to run on an existing Spenzi database (idempotent).
-- ============================================================

-- 'split'  = share expenses and settle up (default, existing behaviour)
-- 'family' = shared household tracker: everyone logs spend, no splitting
alter table groups
  add column if not exists type text not null default 'split'
  check (type in ('split', 'family'));

-- Spend summary for one group over a date range, computed in Postgres.
-- security invoker => existing RLS applies, so only members get data.
-- Returns: total, count, by_category[], by_member[], by_month[] (6 months ending p_to)
create or replace function public.group_spend_summary(p_group uuid, p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with e as (
    select * from expenses
    where group_id = p_group and date between p_from and p_to
  )
  select jsonb_build_object(
    'total', coalesce((select sum(amount) from e), 0),
    'count', (select count(*) from e),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', t) order by t desc)
      from (select category, sum(amount) as t from e group by category) c
    ), '[]'::jsonb),
    'by_member', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', uid, 'name', name, 'total', t) order by t desc)
      from (
        select e.paid_by as uid, p.name, sum(e.amount) as t
        from e join profiles p on p.id = e.paid_by
        group by e.paid_by, p.name
      ) m
    ), '[]'::jsonb),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', mo, 'total', t) order by mo)
      from (
        select to_char(date_trunc('month', date), 'YYYY-MM') as mo, sum(amount) as t
        from expenses
        where group_id = p_group
          and date >= (date_trunc('month', p_to) - interval '5 months')::date
          and date <= p_to
        group by 1
      ) x
    ), '[]'::jsonb)
  );
$$;

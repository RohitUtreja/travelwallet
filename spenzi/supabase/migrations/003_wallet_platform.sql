-- ============================================================
-- FamilyWallet: roles, invites, budgets, recurring expenses,
-- atomic save/summary RPCs, and a recursion-free RLS rewrite.
-- Run AFTER schema.sql / 002. Idempotent.
-- ============================================================

-- ── Columns & constraints ────────────────────────────────────

alter table group_members
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'member', 'viewer'));

-- Existing creators become admins
update group_members gm
set role = 'admin'
from groups g
where g.id = gm.group_id and g.created_by = gm.user_id and gm.role <> 'admin';

alter table groups drop constraint if exists groups_type_check;
alter table groups
  add constraint groups_type_check check (type in ('split', 'family', 'personal'));

-- One personal wallet per user
create unique index if not exists one_personal_wallet_per_user
  on groups (created_by) where type = 'personal';

alter table expenses drop constraint if exists expenses_amount_positive;
alter table expenses add constraint expenses_amount_positive check (amount > 0) not valid;

create index if not exists expenses_group_date_idx on expenses (group_id, date desc);
create index if not exists expense_splits_expense_idx on expense_splits (expense_id);
create index if not exists group_members_user_idx on group_members (user_id);

alter table profiles alter column avatar_color set default '#c9a96a';

-- ── New tables ───────────────────────────────────────────────

create table if not exists budgets (
  group_id uuid not null references groups(id) on delete cascade,
  category text not null,               -- a category id, or '_total'
  monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  primary key (group_id, category)
);

create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid not null default auth.uid() references profiles(id),
  paid_by uuid not null references profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'other',
  description text,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date date not null,
  run_count integer not null default 0,
  next_due date not null,
  active boolean not null default true,
  split_users uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists recurring_group_idx on recurring_expenses (group_id, next_due);

create table if not exists group_invites (
  token text primary key
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  group_id uuid not null references groups(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'viewer')),
  created_by uuid not null default auth.uid() references profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists group_invites_group_idx on group_invites (group_id);

-- ── Policy helpers (SECURITY DEFINER: break RLS self-recursion) ──

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_write_group(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role in ('admin', 'member'));
$$;

create or replace function public.can_edit_expense(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from expenses e
    where e.id = eid
      and (public.is_group_admin(e.group_id) or (e.paid_by = auth.uid() and public.can_write_group(e.group_id)))
  );
$$;

-- ── Row Level Security rewrite ───────────────────────────────

alter table budgets enable row level security;
alter table recurring_expenses enable row level security;
alter table group_invites enable row level security;

-- groups
drop policy if exists "Members can view groups" on groups;
drop policy if exists "Authenticated users can create groups" on groups;
drop policy if exists "Members view groups" on groups;
create policy "Members view groups" on groups for select using (public.is_group_member(id));
drop policy if exists "Admins update groups" on groups;
create policy "Admins update groups" on groups for update using (public.is_group_admin(id));
drop policy if exists "Admins delete groups" on groups;
create policy "Admins delete groups" on groups for delete using (public.is_group_admin(id));
-- inserts happen only through create_group() / ensure_personal_wallet()

-- group_members
drop policy if exists "Members can view group_members" on group_members;
drop policy if exists "Group creators can add members" on group_members;
drop policy if exists "Members view members" on group_members;
create policy "Members view members" on group_members for select using (public.is_group_member(group_id));
drop policy if exists "Admins add members" on group_members;
create policy "Admins add members" on group_members for insert with check (public.is_group_admin(group_id));
drop policy if exists "Admins change roles" on group_members;
create policy "Admins change roles" on group_members for update using (public.is_group_admin(group_id));
drop policy if exists "Admins remove or self leave" on group_members;
create policy "Admins remove or self leave" on group_members for delete
  using (public.is_group_admin(group_id) or user_id = auth.uid());

-- expenses
drop policy if exists "Members can view expenses" on expenses;
drop policy if exists "Members can insert expenses" on expenses;
drop policy if exists "Expense creator can delete" on expenses;
drop policy if exists "Members view expenses" on expenses;
create policy "Members view expenses" on expenses for select using (public.is_group_member(group_id));
drop policy if exists "Writers add expenses" on expenses;
create policy "Writers add expenses" on expenses for insert
  with check (
    public.can_write_group(group_id)
    and exists (select 1 from group_members m where m.group_id = expenses.group_id and m.user_id = expenses.paid_by)
  );
drop policy if exists "Owner or admin edit expenses" on expenses;
create policy "Owner or admin edit expenses" on expenses for update
  using (public.is_group_admin(group_id) or (paid_by = auth.uid() and public.can_write_group(group_id)))
  with check (public.is_group_admin(group_id) or (paid_by = auth.uid() and public.can_write_group(group_id)));
drop policy if exists "Owner or admin delete expenses" on expenses;
create policy "Owner or admin delete expenses" on expenses for delete
  using (public.is_group_admin(group_id) or (paid_by = auth.uid() and public.can_write_group(group_id)));

-- expense_splits
drop policy if exists "Members can view splits" on expense_splits;
drop policy if exists "Members can insert splits" on expense_splits;
drop policy if exists "Members view splits" on expense_splits;
create policy "Members view splits" on expense_splits for select
  using (exists (select 1 from expenses e where e.id = expense_id and public.is_group_member(e.group_id)));
drop policy if exists "Editors add splits" on expense_splits;
create policy "Editors add splits" on expense_splits for insert with check (public.can_edit_expense(expense_id));
drop policy if exists "Editors delete splits" on expense_splits;
create policy "Editors delete splits" on expense_splits for delete using (public.can_edit_expense(expense_id));

-- settlements
drop policy if exists "Members can view settlements" on settlements;
drop policy if exists "Members can insert settlements" on settlements;
drop policy if exists "Members view settlements" on settlements;
create policy "Members view settlements" on settlements for select using (public.is_group_member(group_id));
drop policy if exists "Writers add settlements" on settlements;
create policy "Writers add settlements" on settlements for insert
  with check (
    public.can_write_group(group_id)
    and (from_user = auth.uid() or to_user = auth.uid() or public.is_group_admin(group_id))
    and exists (select 1 from group_members m where m.group_id = settlements.group_id and m.user_id = settlements.from_user)
    and exists (select 1 from group_members m where m.group_id = settlements.group_id and m.user_id = settlements.to_user)
  );

alter table settlements drop constraint if exists settlements_valid;
alter table settlements add constraint settlements_valid check (amount > 0 and from_user <> to_user) not valid;

-- budgets
drop policy if exists "Members view budgets" on budgets;
create policy "Members view budgets" on budgets for select using (public.is_group_member(group_id));
drop policy if exists "Admins add budgets" on budgets;
create policy "Admins add budgets" on budgets for insert with check (public.is_group_admin(group_id));
drop policy if exists "Admins edit budgets" on budgets;
create policy "Admins edit budgets" on budgets for update using (public.is_group_admin(group_id));
drop policy if exists "Admins delete budgets" on budgets;
create policy "Admins delete budgets" on budgets for delete using (public.is_group_admin(group_id));

-- recurring
drop policy if exists "Members view recurring" on recurring_expenses;
create policy "Members view recurring" on recurring_expenses for select using (public.is_group_member(group_id));
drop policy if exists "Writers add recurring" on recurring_expenses;
create policy "Writers add recurring" on recurring_expenses for insert
  with check (public.can_write_group(group_id) and created_by = auth.uid());
drop policy if exists "Owner or admin edit recurring" on recurring_expenses;
create policy "Owner or admin edit recurring" on recurring_expenses for update
  using (public.is_group_admin(group_id) or created_by = auth.uid());
drop policy if exists "Owner or admin delete recurring" on recurring_expenses;
create policy "Owner or admin delete recurring" on recurring_expenses for delete
  using (public.is_group_admin(group_id) or created_by = auth.uid());

-- invites
drop policy if exists "Admins view invites" on group_invites;
create policy "Admins view invites" on group_invites for select using (public.is_group_admin(group_id));
drop policy if exists "Admins create invites" on group_invites;
create policy "Admins create invites" on group_invites for insert
  with check (public.is_group_admin(group_id) and created_by = auth.uid());
drop policy if exists "Admins revoke invites" on group_invites;
create policy "Admins revoke invites" on group_invites for update using (public.is_group_admin(group_id));

-- ── Guard: a group must always keep one admin ────────────────

create or replace function public.keep_one_admin()
returns trigger language plpgsql as $$
begin
  -- cascading deletes (group removal) run nested; allow them
  if pg_trigger_depth() > 1 then return coalesce(old, new); end if;
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    if not exists (
      select 1 from group_members
      where group_id = old.group_id and role = 'admin' and user_id <> old.user_id
    ) then
      raise exception 'A group needs at least one admin';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists group_members_keep_one_admin on group_members;
create trigger group_members_keep_one_admin
  before update of role or delete on group_members
  for each row execute function public.keep_one_admin();

-- ── RPCs ─────────────────────────────────────────────────────

-- Create a group atomically; the caller becomes its admin.
create or replace function public.create_group(
  p_name text, p_currency text, p_type text, p_members uuid[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'Group name must be 1-60 characters';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency'; end if;
  if p_type not in ('split', 'family') then raise exception 'Invalid group type'; end if;

  insert into groups (name, currency, type, created_by)
  values (btrim(p_name), p_currency, p_type, uid)
  returning id into gid;

  insert into group_members (group_id, user_id, role) values (gid, uid, 'admin');
  insert into group_members (group_id, user_id, role)
    select gid, p.id, 'member' from profiles p
    where p.id = any(coalesce(p_members, '{}')) and p.id <> uid
    on conflict do nothing;
  return gid;
end;
$$;

-- Personal wallet per user; also folds in legacy personal_expenses rows once.
drop function if exists public.ensure_personal_wallet();
create or replace function public.ensure_personal_wallet(p_currency text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
  uid uuid := auth.uid();
  cur text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select id into gid from groups where created_by = uid and type = 'personal';
  if gid is not null then return gid; end if;

  select tracker_currency into cur from profiles where id = uid;
  insert into groups (name, currency, type, created_by)
  values ('Personal',
          case when p_currency ~ '^[A-Z]{3}$' then p_currency else coalesce(cur, 'USD') end,
          'personal', uid)
  on conflict do nothing
  returning id into gid;

  if gid is null then  -- lost a race; the other call created it
    select id into gid from groups where created_by = uid and type = 'personal';
    return gid;
  end if;

  insert into group_members (group_id, user_id, role) values (gid, uid, 'admin');

  insert into expenses (group_id, paid_by, amount, category, description, date, created_at)
    select gid, uid, amount, category, description, date, created_at
    from personal_expenses where user_id = uid and amount > 0;
  delete from personal_expenses where user_id = uid;
  return gid;
end;
$$;

-- Insert or update one expense and (for split groups) its equal splits, atomically.
-- Idempotent on p_id, so offline replays cannot duplicate.
create or replace function public.save_expense(
  p_id uuid, p_group uuid, p_paid_by uuid, p_amount numeric, p_category text,
  p_description text, p_date date, p_split_users uuid[] default '{}'
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  gtype text;
  uids uuid[];
  n int;
  cents bigint;
  base bigint;
  rem bigint;
  i int;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select type into gtype from groups where id = p_group;
  if gtype is null then raise exception 'Group not found'; end if;

  insert into expenses (id, group_id, paid_by, amount, category, description, date)
  values (p_id, p_group, p_paid_by, round(p_amount, 2), coalesce(nullif(p_category, ''), 'other'),
          nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_date, current_date))
  on conflict (id) do update
    set paid_by = excluded.paid_by, amount = excluded.amount, category = excluded.category,
        description = excluded.description, date = excluded.date
    where expenses.group_id = excluded.group_id;

  if not exists (select 1 from expenses where id = p_id and group_id = p_group) then
    raise exception 'Expense id belongs to another group';
  end if;

  delete from expense_splits where expense_id = p_id;

  if gtype = 'split' then
    select coalesce(array_agg(distinct u), '{}') into uids from unnest(coalesce(p_split_users, '{}')) u;
    n := coalesce(array_length(uids, 1), 0);
    if n = 0 then raise exception 'Select at least one person to split with'; end if;
    if (select count(*) from group_members where group_id = p_group and user_id = any(uids)) <> n then
      raise exception 'Split includes someone outside the group';
    end if;

    cents := round(p_amount * 100)::bigint;
    base := cents / n;
    rem := cents % n;
    for i in 1..n loop
      insert into expense_splits (expense_id, user_id, amount)
      values (p_id, uids[i], (base + case when i <= rem then 1 else 0 end)::numeric / 100);
    end loop;
  end if;

  return p_id;
end;
$$;

-- Materialise due recurring expenses (monthly drift-free: start_date + k*interval).
create or replace function public.apply_recurring(p_group uuid)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  r recurring_expenses;
  made int := 0;
  step interval;
  guard int;
begin
  if not public.can_write_group(p_group) then return 0; end if;

  for r in
    select * from recurring_expenses
    where group_id = p_group and active and next_due <= current_date
    for update skip locked
  loop
    step := case r.frequency when 'weekly' then interval '7 days'
                             when 'monthly' then interval '1 month'
                             else interval '1 year' end;
    guard := 0;
    while r.next_due <= current_date and guard < 36 loop
      perform public.save_expense(gen_random_uuid(), r.group_id, r.paid_by, r.amount,
                                  r.category, r.description, r.next_due, r.split_users);
      made := made + 1;
      r.run_count := r.run_count + 1;
      r.next_due := (r.start_date + step * (r.run_count))::date;
      guard := guard + 1;
    end loop;
    update recurring_expenses set run_count = r.run_count, next_due = r.next_due where id = r.id;
  end loop;
  return made;
end;
$$;

-- Join through an invite link. Existing accounts only (no self-signup yet).
create or replace function public.join_group(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv group_invites;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into inv from group_invites
   where token = p_token and revoked_at is null and expires_at > now();
  if not found then raise exception 'This invite is invalid or has expired'; end if;

  insert into group_members (group_id, user_id, role)
  values (inv.group_id, auth.uid(), inv.role)
  on conflict do nothing;
  return inv.group_id;
end;
$$;

-- Safe preview for the join screen (no membership required, no member data).
create or replace function public.invite_preview(p_token text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('group_id', g.id, 'name', g.name, 'type', g.type, 'role', i.role)
  from group_invites i join groups g on g.id = i.group_id
  where i.token = p_token and i.revoked_at is null and i.expires_at > now();
$$;

-- List wallets with role, member count, this month's spend, my split balance.
create or replace function public.wallet_overview()
returns table (
  id uuid, name text, currency text, type text, role text,
  member_count bigint, month_total numeric, balance numeric
)
language sql stable security invoker set search_path = public as $$
  select g.id, g.name, g.currency, g.type, gm.role,
    (select count(*) from group_members x where x.group_id = g.id),
    coalesce((select sum(e.amount) from expenses e
              where e.group_id = g.id and e.date >= date_trunc('month', current_date)::date), 0),
    case when g.type = 'split' then
      coalesce((select sum(e.amount) from expenses e where e.group_id = g.id and e.paid_by = auth.uid()), 0)
      - coalesce((select sum(s.amount) from expense_splits s join expenses e on e.id = s.expense_id
                  where e.group_id = g.id and s.user_id = auth.uid()), 0)
      + coalesce((select sum(amount) from settlements where group_id = g.id and from_user = auth.uid()), 0)
      - coalesce((select sum(amount) from settlements where group_id = g.id and to_user = auth.uid()), 0)
    else 0 end
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  order by (g.type = 'personal') desc, g.created_at;
$$;

-- Spend summary (replaces 002): adds previous-month comparison and top expense.
create or replace function public.group_spend_summary(p_group uuid, p_from date, p_to date)
returns jsonb
language sql stable security invoker set search_path = public as $$
  with e as (
    select * from expenses where group_id = p_group and date between p_from and p_to
  ), pv as (
    select * from expenses
    where group_id = p_group
      and date between (p_from - interval '1 month')::date and p_from - 1
  )
  select jsonb_build_object(
    'total', coalesce((select sum(amount) from e), 0),
    'count', (select count(*) from e),
    'prev_total', coalesce((select sum(amount) from pv), 0),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', t) order by t desc)
      from (select category, sum(amount) as t from e group by category) c), '[]'::jsonb),
    'prev_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', t) order by t desc)
      from (select category, sum(amount) as t from pv group by category) c), '[]'::jsonb),
    'by_member', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', uid, 'name', name, 'total', t) order by t desc)
      from (select e.paid_by as uid, p.name, sum(e.amount) as t
            from e join profiles p on p.id = e.paid_by group by e.paid_by, p.name) m), '[]'::jsonb),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', mo, 'total', t) order by mo)
      from (select to_char(date_trunc('month', date), 'YYYY-MM') as mo, sum(amount) as t
            from expenses
            where group_id = p_group
              and date >= (date_trunc('month', p_to) - interval '5 months')::date
              and date <= p_to
            group by 1) x), '[]'::jsonb),
    'top_expense', (
      select jsonb_build_object('description', description, 'amount', amount,
                                'category', category, 'date', date)
      from e order by amount desc, date desc limit 1)
  );
$$;

grant execute on function
  public.create_group(text, text, text, uuid[]),
  public.ensure_personal_wallet(text),
  public.save_expense(uuid, uuid, uuid, numeric, text, text, date, uuid[]),
  public.apply_recurring(uuid),
  public.join_group(text),
  public.invite_preview(text),
  public.wallet_overview(),
  public.group_spend_summary(uuid, date, date)
to authenticated;

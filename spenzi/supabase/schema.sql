-- ============================================================
-- Spenzi – Supabase Database Schema
-- Run this in the Supabase SQL editor for your project
-- ============================================================

-- ── profiles (extends auth.users) ───────────────────────────
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text not null,
  avatar_color text default '#00D4AA'
);

-- ── groups ──────────────────────────────────────────────────
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ── group_members ────────────────────────────────────────────
create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ── expenses ─────────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  paid_by uuid references profiles(id),
  amount numeric(12,2) not null,
  category text not null default 'other',
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ── expense_splits ───────────────────────────────────────────
create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references profiles(id),
  amount numeric(12,2) not null
);

-- ── settlements ──────────────────────────────────────────────
create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  from_user uuid references profiles(id),
  to_user uuid references profiles(id),
  amount numeric(12,2) not null,
  settled_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

-- ── profiles policies ────────────────────────────────────────
create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Allow all authenticated users to read profiles (needed for member search)
create policy "Authenticated users can read all profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- ── groups policies ──────────────────────────────────────────
create policy "Members can view groups"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on groups for insert
  with check (auth.uid() = created_by);

-- ── group_members policies ───────────────────────────────────
create policy "Members can view group_members"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group creators can add members"
  on group_members for insert
  with check (
    exists (
      select 1 from groups
      where id = group_id and created_by = auth.uid()
    )
  );

-- ── expenses policies ────────────────────────────────────────
create policy "Members can view expenses"
  on expenses for select
  using (
    exists (
      select 1 from group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "Members can insert expenses"
  on expenses for insert
  with check (
    exists (
      select 1 from group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "Expense creator can delete"
  on expenses for delete
  using (paid_by = auth.uid());

-- ── expense_splits policies ──────────────────────────────────
create policy "Members can view splits"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses e
      join group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "Members can insert splits"
  on expense_splits for insert
  with check (
    exists (
      select 1 from expenses e
      join group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

-- ── settlements policies ─────────────────────────────────────
create policy "Members can view settlements"
  on settlements for select
  using (
    exists (
      select 1 from group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create policy "Members can insert settlements"
  on settlements for insert
  with check (
    exists (
      select 1 from group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: auto-create profile row when a new auth user signs up
-- (optional — useful if you later allow self-signup)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

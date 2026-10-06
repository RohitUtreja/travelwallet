-- ============================================================
-- FamilyWallet: clear data.  DESTRUCTIVE and irreversible.
-- Run in the Supabase SQL editor. Choose ONE option below.
-- ============================================================

-- ── OPTION 1 (default): wipe all app data, KEEP user accounts and profiles ──
-- Removes every wallet, expense, split, settlement, budget, recurring rule,
-- invite and membership. People can still sign in; each gets a fresh
-- Personal wallet automatically next time they open the app.
begin;
truncate table
  settlements,
  expense_splits,
  expenses,
  recurring_expenses,
  budgets,
  group_invites,
  group_members,
  groups,
  personal_expenses
restart identity cascade;
commit;

-- ── OPTION 2: wipe everything INCLUDING user accounts (full reset) ──
-- Uncomment the block below. You'll need to create users again in
-- Authentication → Users.
--
-- begin;
-- truncate table
--   settlements, expense_splits, expenses, recurring_expenses, budgets,
--   group_invites, group_members, groups, personal_expenses, profiles
-- restart identity cascade;
-- delete from auth.users;
-- commit;

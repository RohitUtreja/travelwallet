#!/bin/bash
P="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-54329} -U ${PGUSER:-postgres} -d ${PGDATABASE:-fw} -v ON_ERROR_STOP=1 -qtA"
A=aaaaaaaa-0000-0000-0000-000000000001; B=bbbbbbbb-0000-0000-0000-000000000002
C=cccccccc-0000-0000-0000-000000000003; D=dddddddd-0000-0000-0000-000000000004
pass=0; fail=0
as() { # as <uid> <sql>  -> prints result, returns psql status
  $P -c "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); $2" 2>&1 | tail -n +2 | sed '/^$/d'
}
ok()   { if [ "$2" == "$3" ]; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1: got [$2] want [$3]"; fi; }
errs() { if echo "$2" | grep -qi "$3"; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1: [$2] lacks [$3]"; fi; }

$P -c "truncate auth.users cascade; truncate profiles cascade"
for u in $A:alice $B:bob $C:cara $D:dan; do id=${u%%:*}; n=${u##*:}; $P -c "insert into auth.users(id,email) values ('$id','$n@x.com')"; done
ok "profile trigger" "$($P -c 'select count(*) from profiles')" 4

FAM=$(as $A "select create_group('Home','INR','family', array['$B'::uuid])" | tail -1)
ok "creator is admin" "$($P -c "select role from group_members where group_id='$FAM' and user_id='$A'")" admin
ok "member role default" "$($P -c "select role from group_members where group_id='$FAM' and user_id='$B'")" member
errs "direct group insert denied" "$(as $A "insert into groups(name,currency,created_by) values ('x','INR','$A')")" "row-level security"
errs "bad currency rejected" "$(as $A "select create_group('x','inr','family')")" "Invalid currency"

# invites
TOK=$(as $A "insert into group_invites(group_id,role) values ('$FAM','viewer') returning token" | head -1)
errs "member cannot create invite" "$(as $B "insert into group_invites(group_id) values ('$FAM')")" "row-level security"
ok "outsider cannot list invites" "$(as $C "select count(*) from group_invites")" 0
ok "preview name" "$(as $C "select invite_preview('$TOK')->>'name'")" Home
as $C "select join_group('$TOK')" >/dev/null
ok "viewer joined with viewer role" "$($P -c "select role from group_members where group_id='$FAM' and user_id='$C'")" viewer
errs "bad token rejected" "$(as $D "select join_group('nope')")" "invalid or has expired"
$P -c "update group_invites set revoked_at=now() where token='$TOK'"
errs "revoked token rejected" "$(as $D "select join_group('$TOK')")" "invalid or has expired"

# expenses & roles
E1=11111111-1111-1111-1111-111111111111; E2=22222222-2222-2222-2222-222222222222
as $B "select save_expense('$E1','$FAM','$B',450.50,'groceries','milk','2026-10-01','{}')" >/dev/null
ok "member saves expense" "$(as $B "select amount from expenses where id='$E1'")" 450.50
errs "viewer cannot save" "$(as $C "select save_expense('$E2','$FAM','$C',10,'other',null,'2026-10-01','{}')")" "row-level security"
ok "viewer can read" "$(as $C "select count(*) from expenses")" 1
ok "outsider sees nothing" "$(as $D "select count(*) from expenses")" 0
as $A "select save_expense('$E2','$FAM','$A',100,'rent','r','2026-10-02','{}')" >/dev/null
errs "member cannot edit others' expense" "$(as $B "select save_expense('$E2','$FAM','$A',1,'rent','hack','2026-10-02','{}')")" "row-level security"
as $A "select save_expense('$E1','$FAM','$B',500,'groceries','milk+eggs','2026-10-01','{}')" >/dev/null
ok "admin edits member expense" "$(as $A "select amount from expenses where id='$E1'")" 500.00
ok "member deletes own" "$(as $B "with d as (delete from expenses where id='$E1' returning 1) select count(*) from d")" 1
ok "member cannot delete admin's" "$(as $B "with d as (delete from expenses where id='$E2' returning 1) select count(*) from d")" 0
errs "amount must be positive" "$(as $A "select save_expense(gen_random_uuid(),'$FAM','$A',0,'x',null,'2026-10-01','{}')")" "positive"
errs "paid_by must be member" "$(as $A "select save_expense(gen_random_uuid(),'$FAM','$D',5,'x',null,'2026-10-01','{}')")" "row-level security"

# split rounding, idempotency, cross-group id hijack
SPL=$(as $A "select create_group('Trip','EUR','split', array['$B'::uuid,'$C'::uuid])" | tail -1)
E3=33333333-3333-3333-3333-333333333333
as $A "select save_expense('$E3','$SPL','$A',100,'hotel','h','2026-10-01', array['$A'::uuid,'$B'::uuid,'$C'::uuid])" >/dev/null
ok "splits sum to total" "$(as $A "select sum(amount) from expense_splits where expense_id='$E3'")" 100.00
ok "split cents distributed" "$(as $A "select string_agg(amount::text, ',' order by amount desc) from expense_splits where expense_id='$E3'")" "33.34,33.33,33.33"
as $A "select save_expense('$E3','$SPL','$A',100,'hotel','h','2026-10-01', array['$A'::uuid,'$B'::uuid,'$C'::uuid])" >/dev/null
ok "replay is idempotent" "$(as $A "select count(*) from expense_splits where expense_id='$E3'")" 3
as $A "select save_expense('$E3','$SPL','$A',50,'hotel','h','2026-10-01', array['$A'::uuid,'$B'::uuid])" >/dev/null
ok "edit to 2 people re-splits" "$(as $A "select string_agg(amount::text, ',') from expense_splits where expense_id='$E3'")" "25.00,25.00"
errs "split needs people" "$(as $A "select save_expense(gen_random_uuid(),'$SPL','$A',5,'x',null,'2026-10-01','{}')")" "at least one"
errs "split outsider rejected" "$(as $A "select save_expense(gen_random_uuid(),'$SPL','$A',5,'x',null,'2026-10-01', array['$D'::uuid])")" "outside the group"
errs "cannot hijack id across groups" "$(as $A "select save_expense('$E3','$FAM','$A',5,'x',null,'2026-10-01','{}')")" "another group"
ok "balance (A paid 50, owes 25)" "$(as $A "select balance from wallet_overview() where id='$SPL'")" 25.00
ok "balance (B owes 25)" "$(as $B "select balance from wallet_overview() where id='$SPL'")" -25.00

# settlements: only parties (or admins) may record, both must be members, amount > 0
as $A "select 1" >/dev/null
errs "member cannot settle between two others" "$(as $B "insert into settlements(group_id,from_user,to_user,amount) values ('$SPL','$A','$C',5)")" "row-level security"
ok "party can record own payment" "$(as $B "insert into settlements(group_id,from_user,to_user,amount) values ('$SPL','$B','$A',5) returning amount")" 5.00
errs "non-member counterparty rejected" "$(as $A "insert into settlements(group_id,from_user,to_user,amount) values ('$SPL','$A','$D',5)")" "row-level security"
errs "zero amount rejected" "$(as $B "insert into settlements(group_id,from_user,to_user,amount) values ('$SPL','$B','$A',0)")" "settlements_valid"
errs "self payment rejected" "$(as $B "insert into settlements(group_id,from_user,to_user,amount) values ('$SPL','$B','$B',5)")" "settlements_valid"

# last admin guard
errs "cannot demote last admin" "$(as $A "update group_members set role='member' where group_id='$FAM' and user_id='$A'")" "at least one admin"
errs "cannot remove last admin" "$(as $A "delete from group_members where group_id='$FAM' and user_id='$A'")" "at least one admin"
as $A "update group_members set role='admin' where group_id='$FAM' and user_id='$B'" >/dev/null
ok "promote then demote ok" "$(as $A "update group_members set role='member' where group_id='$FAM' and user_id='$A' returning role" | head -1)" member
$P -c "update group_members set role='admin' where group_id='$FAM' and user_id='$A'"
ok "viewer cannot self-promote" "$(as $C "update group_members set role='admin' where group_id='$FAM' and user_id='$C' returning 1")" ""

# recurring
as $A "insert into recurring_expenses(group_id,paid_by,amount,category,description,frequency,start_date,next_due) values ('$FAM','$A',1000,'rent','Rent','monthly', current_date - 65, current_date - 65)" >/dev/null
N=$(as $A "select apply_recurring('$FAM')" | tail -1)
ok "recurring catches up 3 months (65d)" "$N" 3
ok "recurring second call no-op" "$(as $A "select apply_recurring('$FAM')")" 0
ok "next_due in future" "$($P -c "select next_due > current_date from recurring_expenses")" t
ok "viewer apply_recurring no-op" "$(as $C "select apply_recurring('$FAM')")" 0

# personal wallet + legacy migration
$P -c "insert into personal_expenses(user_id,category,amount,currency,date) values ('$D','groceries',12.5,'USD','2026-10-01'),('$D','fuel',30,'USD','2026-10-02')"
W=$(as $D "select ensure_personal_wallet()" | tail -1)
ok "legacy rows migrated" "$($P -c "select count(*) from expenses where group_id='$W'")" 2
ok "legacy rows removed" "$($P -c "select count(*) from personal_expenses where user_id='$D'")" 0
as $C "select ensure_personal_wallet('INR')" >/dev/null
ok "personal wallet honours requested currency" "$($P -c "select currency from groups where type='personal' and created_by='$C'")" INR
ok "ensure is idempotent" "$(as $D "select ensure_personal_wallet()" | tail -1)" "$W"

# summary
ok "summary total" "$(as $D "select group_spend_summary('$W','2026-10-01','2026-10-31')->>'total'")" 42.50
ok "summary top expense" "$(as $D "select group_spend_summary('$W','2026-10-01','2026-10-31')->'top_expense'->>'amount'")" 30.00
errs "summary denied to outsider (empty)" "$(as $A "select group_spend_summary('$W','2026-10-01','2026-10-31')->>'count'")" "^0$"
ok "overview lists personal first" "$(as $D "select type from wallet_overview() limit 1")" personal

# cascade delete of group works despite last-admin guard
as $A "delete from groups where id='$SPL'" >/dev/null
ok "admin deletes group (cascade)" "$($P -c "select count(*) from groups where id='$SPL'")" 0
echo "== $pass passed, $fail failed"; [ $fail -eq 0 ]

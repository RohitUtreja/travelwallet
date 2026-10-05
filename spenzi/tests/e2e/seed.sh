#!/bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"
P="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-54329} -U ${PGUSER:-postgres} -d ${PGDATABASE:-fw} -v ON_ERROR_STOP=1 -qtA"
R=11111111-0000-4000-8000-000000000001; PR=22222222-0000-4000-8000-000000000002
AA=33333333-0000-4000-8000-000000000003; ME=44444444-0000-4000-8000-000000000004
$P -c "truncate auth.users cascade" >/dev/null 2>&1
for u in $R:rohit $PR:priya $AA:aarav $ME:meera; do $P -c "insert into auth.users(id,email) values ('${u%%:*}','${u##*:}@family.test')" ; done
$P -c "update profiles set name='Rohit' where id='$R'; update profiles set name='Priya', avatar_color='#86bf9f' where id='$PR'; update profiles set name='Aarav', avatar_color='#9bb5d6' where id='$AA'; update profiles set name='Meera', avatar_color='#d6a0b5' where id='$ME'"
as() { $P -c "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); $2" | tail -n +2 | sed '/^$/d'; }
d() { date -d "$1" +%F; }
# legacy tracker rows for Rohit -> migrated by ensure_personal_wallet
$P -c "insert into personal_expenses(user_id,category,amount,currency,date,description) values ('$R','fuel',3200,'INR','2026-10-02','Petrol'),('$R','fitness',2500,'INR','2026-10-01','Gym'),('$R','groceries',860,'INR','2026-09-28','Fruit & veg')"
PERSONAL=$(as $R "select ensure_personal_wallet()" | tail -1)
FAM=$(as $R "select create_group('Utreja Household','INR','family', array['$PR'::uuid,'$AA'::uuid])" | tail -1)
GOA=$(as $R "select create_group('Goa Trip','INR','split', array['$PR'::uuid,'$ME'::uuid])" | tail -1)
e() { as "$1" "select save_expense(gen_random_uuid(),'$2','$1',$3,'$4','$5','$6','{}')" >/dev/null; }
# Household: Sept (full) & Aug
for m in 08 09; do
  e $PR $FAM 12400 groceries "BigBasket monthly" 2026-$m-03
  e $R  $FAM 4620 utilities "Electricity bill" 2026-$m-08
  e $R  $FAM 1180 utilities "Broadband" 2026-$m-09
  e $PR $FAM 2340 groceries "Vegetables & milk" 2026-$m-14
  e $R  $FAM 5200 eatingout "Anniversary dinner" 2026-$m-16
  e $AA $FAM 640 eatingout "Pizza with friends" 2026-$m-18
  e $R  $FAM 3100 fuel "Petrol" 2026-$m-12
  e $PR $FAM 2800 shopping "School supplies" 2026-$m-20
  e $R  $FAM 1850 medical "Pharmacy" 2026-$m-22
  e $PR $FAM 2100 transport "Cab rides" 2026-$m-25
done
e $PR $FAM 1900 eatingout "Weekend brunch" 2026-09-27
# October so far
e $PR $FAM 5890 groceries "BigBasket" 2026-10-02
e $R  $FAM 4210 utilities "Electricity bill" 2026-10-03
e $AA $FAM 1250 eatingout "Biryani night" 2026-10-04
e $PR $FAM 3480 eatingout "Family dinner" 2026-10-04
e $R  $FAM 3200 fuel "Petrol" 2026-10-05
# recurring: rent + SIP (apply_recurring materialises Aug/Sep/Oct)
as $R "insert into recurring_expenses(group_id,paid_by,amount,category,description,frequency,start_date,next_due) values ('$FAM','$R',35000,'rent','House rent','monthly','2026-08-01','2026-08-01'),('$FAM','$R',10000,'investment','Index fund SIP','monthly','2026-08-05','2026-08-05')" >/dev/null
as $R "select apply_recurring('$FAM')" >/dev/null
as $R "insert into budgets(group_id,category,monthly_limit) values ('$FAM','_total',75000),('$FAM','groceries',12000),('$FAM','eatingout',8000),('$FAM','utilities',6000)" >/dev/null
# Goa trip (split)
as $R "select save_expense('aaaaaaaa-0000-4000-8000-000000000001','$GOA','$R',18600,'hotel','Beach villa 3 nights','2026-09-20', array['$R'::uuid,'$PR'::uuid,'$ME'::uuid])" >/dev/null
as $PR "select save_expense('aaaaaaaa-0000-4000-8000-000000000002','$GOA','$PR',4800,'eatingout','Seafood dinner','2026-09-21', array['$R'::uuid,'$PR'::uuid,'$ME'::uuid])" >/dev/null
as $ME "select save_expense('aaaaaaaa-0000-4000-8000-000000000003','$GOA','$ME',2400,'activities','Water sports','2026-09-22', array['$R'::uuid,'$ME'::uuid])" >/dev/null
echo "FAM=$FAM GOA=$GOA PERSONAL=$PERSONAL" | tee "$HERE/ids.env"

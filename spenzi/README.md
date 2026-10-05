# FamilyWallet

A mobile-first PWA for shared household spending: family wallets everyone logs into, split wallets
for trips/flatmates, and a personal wallet — with budgets, insights, recurring expenses and CSV export.

**Stack:** Next.js 14 (App Router) · [React Aria Components](https://react-spectrum.adobe.com/react-aria/) ·
Tailwind · Supabase (Auth + Postgres + RLS).

## Setup

1. Create a Supabase project and put its URL/anon key in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. In the SQL editor run, in order:
   * **Fresh project:** `supabase/schema.sql`, then `supabase/migrations/003_wallet_platform.sql`
   * **Existing project:** `002_family_groups.sql` (if not yet applied), then `003_wallet_platform.sql`

   Migrations are idempotent. `003` replaces the earlier row-level-security policies (the old
   `group_members` policy queried its own table and fails with *infinite recursion*).
3. Create users in *Authentication → Users* (there is no self-signup yet). A profile row is created
   automatically. Existing users join wallets by invite link or by an admin adding them.
4. `npm install && npm run dev`. Deploy over HTTPS (e.g. Vercel) so the app is installable.

## Concepts

| | |
|---|---|
| **Personal** wallet | One per user, created automatically; absorbs legacy Tracker data |
| **Family** wallet | Everyone logs spending; no splitting/settling; summary, budgets, insights |
| **Split** wallet | Equal splits between chosen people, simplified debts, settle-up |
| Roles | `admin` (manage members/budgets, edit anything) · `member` (add; edit own) · `viewer` (read) |

Business rules live in Postgres (`save_expense`, `apply_recurring`, `group_spend_summary`, `join_group`,
…) so they hold regardless of client. `save_expense` is idempotent on a client-generated id, which is what
makes the offline queue safe to replay.

## Quality checks

```bash
npm run lint        # next lint (no suppressions)
npm test            # vitest: parsing, insights, CSV, PIN, offline queue, keypad logic
npm run test:sql    # RLS/RPC tests against a throw-away Postgres (see tests/e2e/setup.sh)
npm run test:e2e    # Playwright + axe against the real stack (Postgres + PostgREST + app)
```

The e2e harness runs the production build against a local Postgres through PostgREST (what Supabase
uses), with a tiny proxy faking GoTrue login. See `tests/e2e/setup.sh` and `tests/e2e/proxy.js`.
Env: `PGHOST/PGPORT/PGUSER`, `APP_URL` (default `http://localhost:3002`), `PLAYWRIGHT_PATH`, `CHROME_PATH`.

## Known limits

* **Offline:** expenses entered while a page is already open are queued and synced later; opening a
  wallet with no connection at all is not supported yet.
* **App lock** is a device-local privacy screen (PIN hashed with PBKDF2), not encryption.
* **Profiles are visible to every user of the Supabase project** (used for member search). Run one
  project per family/household group.
* Currency is per wallet; changing it doesn't convert amounts. No FX.
* Not built yet: push notifications, receipt/SMS parsing, biometric unlock, self-signup.

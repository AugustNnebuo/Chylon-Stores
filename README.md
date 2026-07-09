# Chylon Provision Store — Sales & Profit Tracker

A simple mobile-friendly app for logging daily sales and tracking profit,
backed by a real database (Supabase/Postgres) so it works fully
independently — no Claude account needed.

## What it does
- **Sell** — pick a product, adjust quantity, log a sale with profit shown before you confirm
- **Stock** — add/edit/delete products with cost price and selling price
- **Summary** — today / 7 days / this month totals, top products, and a sales log you can correct

---

## Part 1 — Set up the database (Supabase, free)

1. Go to https://supabase.com and sign up (free tier is enough for this).
2. Click **New Project**. Name it anything (e.g. `chylon-store`), set a database password (save it somewhere), pick the region closest to Nigeria (e.g. `eu-west` or `af-south` if available).
3. Once the project is created, go to the **SQL Editor** (left sidebar) and run this:

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost_price numeric not null,
  selling_price numeric not null,
  created_at timestamptz default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  cost_price numeric not null,
  selling_price numeric not null,
  qty integer not null,
  profit numeric not null,
  sale_date date not null,
  created_at timestamptz default now()
);

-- Allow the app to read/write without requiring a login
-- (fine for a single-family-business tool; see "Security note" below)
alter table products enable row level security;
alter table sales enable row level security;

create policy "public access" on products for all using (true) with check (true);
create policy "public access" on sales for all using (true) with check (true);
```

4. Go to **Settings → API** (left sidebar). Copy two values, you'll need them shortly:
   - **Project URL**
   - **anon public** key

---

## Part 2 — Get the code running

You'll need [Node.js](https://nodejs.org) installed (LTS version) and a terminal.

1. Unzip this project folder and open a terminal inside it.
2. Install dependencies:
   ```
   npm install
   ```
3. Create a file named `.env` in the project root (copy `.env.example` and rename it), and fill in the two values from Supabase:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. Test it locally:
   ```
   npm run dev
   ```
   Open the local link it prints (usually `http://localhost:5173`) — add a product, log a sale, confirm it saves.

---

## Part 3 — Deploy to Netlify (so your mum has a real link)

**Option A — Drag and drop (fastest, no GitHub needed)**
1. Build the production files:
   ```
   npm run build
   ```
   This creates a `dist` folder.
2. Go to https://app.netlify.com/drop and drag the `dist` folder in.
3. Netlify gives you a live link immediately (e.g. `chylon-store.netlify.app`).
4. **Important:** since you built locally with your `.env` file, the Supabase keys are already baked into this build — no extra Netlify config needed for Option A.

**Option B — Connect to GitHub (better long-term, auto-deploys on future changes)**
1. Push this project to a new GitHub repository.
2. In Netlify, click **Add new site → Import an existing project**, connect GitHub, pick the repo.
3. Build command: `npm run build`, Publish directory: `dist` (already set in `netlify.toml`).
4. Go to **Site configuration → Environment variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as your `.env`)
5. Deploy. Every time you push a code change to GitHub, Netlify redeploys automatically.

---

## Making it feel like an app on her phone
Once she opens the Netlify link in her phone's browser (Chrome/Safari):
- **Android (Chrome):** menu (⋮) → "Add to Home screen"
- **iPhone (Safari):** Share icon → "Add to Home Screen"

It'll then open full-screen like a normal app, no browser bar.

---

## Security note
The database is currently open to anyone who has your Supabase anon key (which is visible in the app's code). This is a reasonable trade-off for a single small business with no sensitive customer data — but it means technically anyone who found the key could read or edit the sales data. If you later package this for multiple businesses, you'll want to add proper user login (Supabase Auth) and restrict each business to their own data — happy to help with that when you get there.

## Extending it later
- Add stock/inventory quantity tracking (deduct on each sale)
- Add a low-stock alert
- Add export to CSV for her records/accountant
- Add multi-business support (Supabase Auth + a `business_id` column on both tables)

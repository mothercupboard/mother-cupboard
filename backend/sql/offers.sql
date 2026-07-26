-- Saver Cupboard: Supabase schema for supermarket offers
-- Run in the Supabase SQL editor.

create table if not exists retailers (
  id text primary key,             -- 'aldi', 'lidl', 'tesco', 'woolworths_nz', ...
  display_name text not null,
  source text not null check (source in ('scrape', 'pepesto', 'leaflet_scan', 'manual')),
  enabled boolean not null default true,
  country text not null default 'GB'  -- which region's users see it (GB/IE/AU/NZ)
);

insert into retailers (id, display_name, source, enabled, country) values
  ('aldi',          'Aldi',        'scrape',       true,  'GB'),
  ('aldi_ie',       'Aldi',        'scrape',       true,  'IE'),
  ('lidl',          'Lidl',        'leaflet_scan', false, 'GB'),
  ('tesco',         'Tesco',       'pepesto',      false, 'GB'),
  ('sainsburys',    'Sainsbury''s','pepesto',      false, 'GB'),
  ('asda',          'Asda',        'pepesto',      false, 'GB'),
  ('woolworths_nz', 'Woolworths',  'scrape',       true,  'NZ'),
  ('paknsave',      'PAK''nSAVE',  'scrape',       false, 'NZ'),  -- bot-blocked; needs headless
  ('woolworths_au', 'Woolworths',  'scrape',       true,  'AU')
on conflict (id) do nothing;

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  retailer_id text not null references retailers(id),
  product_name text not null,
  brand text,
  price_pence integer not null,
  was_price_pence integer,          -- null when no previous price shown
  pack_size text,                   -- as displayed, e.g. '0.5 kg', '80 pack'
  offer_type text,                  -- 'weekly_offer' | 'price_drop' | 'multibuy' | 'loyalty'
  starts_at date,
  ends_at date,
  source_url text,
  fetched_at timestamptz not null default now(),
  week_key text not null,           -- ISO week, e.g. '2026-W30' — one batch per week

  -- Filled by the AI ingredient-mapping pass:
  is_food boolean,
  canonical_ingredient text,        -- e.g. 'pork steaks', 'turkey mince'
  ingredient_category text,         -- e.g. 'meat', 'fruit', 'dairy', 'bakery'

  unique (retailer_id, product_name, week_key)
);

create index if not exists offers_week_food_idx
  on offers (week_key, retailer_id) where is_food = true;

-- The app reads current offers through this view:
create or replace view current_offers
  with (security_invoker = true) as
  select o.*, r.display_name as retailer_name
  from offers o
  join retailers r on r.id = o.retailer_id
  where o.is_food = true
    and o.week_key = to_char(now(), 'IYYY-"W"IW');

-- ── Row-level security ──────────────────────────────────────────────────
-- App clients (anon / authenticated keys) may READ but never write; the
-- fetch-offers Lambda writes with the service role key, which bypasses RLS.

alter table retailers enable row level security;
alter table offers enable row level security;

create policy "retailers readable by app clients"
  on retailers for select
  to anon, authenticated
  using (true);

create policy "offers readable by app clients"
  on offers for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies on purpose: with RLS enabled and no
-- write policies, app keys cannot modify offer data at all.

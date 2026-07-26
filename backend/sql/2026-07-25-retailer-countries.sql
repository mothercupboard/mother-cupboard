-- Saver Cupboard migration: per-country retailers + NZ budget supermarkets.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Which region's users see this retailer in the app's picker.
alter table retailers add column if not exists country text not null default 'GB';

update retailers set country = 'GB' where id in ('aldi', 'lidl', 'tesco', 'sainsburys', 'asda');

insert into retailers (id, display_name, source, enabled, country) values
  ('woolworths_nz', 'Woolworths',  'scrape', true, 'NZ'),
  ('paknsave',      'PAK''nSAVE',  'scrape', true, 'NZ')
on conflict (id) do nothing;

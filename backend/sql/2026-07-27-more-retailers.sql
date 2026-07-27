-- Saver Cupboard migration: the full supermarket sweep, 27 Jul 2026.
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- GB: enable Sainsbury's + Asda (rows exist, seeded as 'pepesto'), add Morrisons.
-- IE: add Tesco Ireland + SuperValu.
-- Parked (not added / left disabled): New World NZ & Coles AU (Kasada/Incapsula
-- bot walls need headless), PAK'nSAVE (same), Lidl (app-only offers), Waitrose
-- (no weekly loyalty-price scheme worth scraping).

update retailers set source = 'scrape', enabled = true where id = 'sainsburys';
update retailers set source = 'scrape', enabled = true where id = 'asda';

insert into retailers (id, display_name, source, enabled, country) values
  ('morrisons', 'Morrisons',      'scrape', true, 'GB'),
  ('tesco_ie',  'Tesco',          'scrape', true, 'IE'),
  ('supervalu', 'SuperValu',      'scrape', true, 'IE')
on conflict (id) do nothing;

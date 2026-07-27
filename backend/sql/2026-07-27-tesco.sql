-- Saver Cupboard migration: switch Tesco on (Clubcard Prices scraper).
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- The tesco row already exists (offers.sql seeded it disabled with
-- source='pepesto'); the new adapter scrapes Clubcard Prices buylists
-- directly, so flip the source and enable it. The fetch-offers Lambda
-- reads `enabled` as its single source of truth.

update retailers
set source = 'scrape', enabled = true
where id = 'tesco';

-- Saver Cupboard migration: cooking-ingredient flag, 27 Jul 2026.
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- With ten retailers the weekly batch is 500+ offers, many of them snacks
-- (crisps, biscuits, tea bags) that are food but never cooked with. The
-- mapping pass now also sets is_ingredient = "would this appear on a home
-- recipe's ingredient list?", and the app surfaces only those.
-- null = mapped before this migration (or mapping missed it); the app
-- treats null as included so old weeks keep working until the next run.

alter table offers add column if not exists is_ingredient boolean;

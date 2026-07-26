-- Saver Cupboard: add Aldi Ireland (IE region). Run once in Supabase SQL editor.
insert into retailers (id, display_name, source, enabled, country) values
  ('aldi_ie', 'Aldi', 'scrape', true, 'IE')
on conflict (id) do nothing;

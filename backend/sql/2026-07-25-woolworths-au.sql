-- Saver Cupboard: add Woolworths Australia (AU region). Run once in Supabase SQL editor.
insert into retailers (id, display_name, source, enabled, country) values
  ('woolworths_au', 'Woolworths', 'scrape', true, 'AU')
on conflict (id) do nothing;

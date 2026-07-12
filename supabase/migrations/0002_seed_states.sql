-- The 37 first-order divisions of Nigeria: 36 states + the Federal Capital
-- Territory. `code` is the 2-letter identifier used in membership numbers
-- (TWM-<STATE>-<LGA>-<seq>). Idempotent. LGAs and wards are loaded separately
-- from an authoritative dataset (see supabase/README.md).
insert into public.states (name, code) values
  ('Abia', 'AB'), ('Adamawa', 'AD'), ('Akwa Ibom', 'AK'), ('Anambra', 'AN'),
  ('Bauchi', 'BA'), ('Bayelsa', 'BY'), ('Benue', 'BE'), ('Borno', 'BO'),
  ('Cross River', 'CR'), ('Delta', 'DE'), ('Ebonyi', 'EB'), ('Edo', 'ED'),
  ('Ekiti', 'EK'), ('Enugu', 'EN'), ('Gombe', 'GO'), ('Imo', 'IM'),
  ('Jigawa', 'JI'), ('Kaduna', 'KD'), ('Kano', 'KN'), ('Katsina', 'KT'),
  ('Kebbi', 'KB'), ('Kogi', 'KO'), ('Kwara', 'KW'), ('Lagos', 'LA'),
  ('Nasarawa', 'NA'), ('Niger', 'NI'), ('Ogun', 'OG'), ('Ondo', 'ON'),
  ('Osun', 'OS'), ('Oyo', 'OY'), ('Plateau', 'PL'), ('Rivers', 'RI'),
  ('Sokoto', 'SO'), ('Taraba', 'TA'), ('Yobe', 'YO'), ('Zamfara', 'ZA'),
  ('Federal Capital Territory', 'FC')
on conflict (code) do nothing;

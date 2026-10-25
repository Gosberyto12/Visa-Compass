insert into public.countries (iso2, iso3, common_name, official_name, is_supported)
values
  ('TZ', 'TZA', 'Tanzania', 'United Republic of Tanzania', true),
  ('KE', 'KEN', 'Kenya', 'Republic of Kenya', true),
  ('UG', 'UGA', 'Uganda', 'Republic of Uganda', true),
  ('RW', 'RWA', 'Rwanda', 'Republic of Rwanda', true),
  ('NG', 'NGA', 'Nigeria', 'Federal Republic of Nigeria', false),
  ('GH', 'GHA', 'Ghana', 'Republic of Ghana', false),
  ('ZA', 'ZAF', 'South Africa', 'Republic of South Africa', false),
  ('GB', 'GBR', 'United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', false),
  ('US', 'USA', 'United States', 'United States of America', false),
  ('AE', 'ARE', 'United Arab Emirates', null, false),
  ('IN', 'IND', 'India', 'Republic of India', false),
  ('FR', 'FRA', 'France', 'French Republic', false),
  ('CA', 'CAN', 'Canada', null, false),
  ('AU', 'AUS', 'Australia', 'Commonwealth of Australia', false)
on conflict (iso2) do update set
  iso3 = excluded.iso3,
  common_name = excluded.common_name,
  official_name = excluded.official_name,
  is_supported = excluded.is_supported;

-- Intentionally no visa-rule fixtures: no route is represented as verified without reviewed sources.

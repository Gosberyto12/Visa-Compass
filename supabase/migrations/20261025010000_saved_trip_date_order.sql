alter table public.saved_trips
  drop constraint if exists saved_trips_check,
  drop constraint if exists saved_trips_date_order_check;

alter table public.saved_trips
  add constraint saved_trips_date_order_check
  check (departure_date is null or departure_date <= arrival_date);

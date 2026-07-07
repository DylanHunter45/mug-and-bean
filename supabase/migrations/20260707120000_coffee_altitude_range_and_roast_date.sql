-- ---------------------------------------------------------------------------
-- Coffee altitude range + per-bag roast date
--
-- Two schema gaps surfaced once the founder's real bag-label collection was
-- catalogued (the collection that also serves as the OCR ground-truth corpus):
--
--   1. Altitude is a RANGE on real labels ("1200M - 2000M"), but `coffees`
--      only had a single `altitude_meters integer`. Replace it with an explicit
--      min/max pair so a range is stored losslessly. A single-altitude label
--      ("1800M") stores the same value in both columns.
--
--   2. Roast date is printed on the bag (e.g. week-of-roast), but had no home.
--      It is a property of a PHYSICAL bag, not of the shared catalog entry, so
--      it belongs on `user_coffees` (a user's logged instance), not `coffees`.
--      Added here as a nullable column; the manual/scan entry flow populates it.
--
-- The catalog is still empty at this point (seed import runs after this
-- migration), so dropping/replacing the altitude column loses no data.
-- ---------------------------------------------------------------------------

-- --- coffees: single altitude -> min/max range -----------------------------

alter table public.coffees drop column altitude_meters;

alter table public.coffees
  add column altitude_min_meters integer,
  add column altitude_max_meters integer;

-- A range must be well-ordered when both bounds are present. Either bound may be
-- null (partial data), and a single altitude stores min = max.
alter table public.coffees
  add constraint coffees_altitude_range_ck
  check (
    altitude_min_meters is null
    or altitude_max_meters is null
    or altitude_min_meters <= altitude_max_meters
  );

comment on column public.coffees.altitude_min_meters is
  'Lower bound of growing altitude in metres; equals max for a single altitude.';
comment on column public.coffees.altitude_max_meters is
  'Upper bound of growing altitude in metres; equals min for a single altitude.';

-- --- user_coffees: per-bag roast date --------------------------------------

alter table public.user_coffees
  add column roast_date date;

comment on column public.user_coffees.roast_date is
  'Roast date printed on this physical bag (freshness); per-instance, not catalog.';

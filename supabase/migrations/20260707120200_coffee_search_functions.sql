-- ---------------------------------------------------------------------------
-- Catalog search functions (pg_trgm)
--
-- The catalog API needs fuzzy, typo-tolerant search over the shared catalog for
-- both public browsing (coffees) and the in-app scan/manual-entry autocomplete
-- (roasters). PostgREST does not expose the trigram similarity operators
-- directly, so we wrap the search in SQL functions the API calls over RPC.
--
-- Both functions are SECURITY INVOKER: they run with the caller's privileges and
-- RLS, so the existing "public read" policies on the catalog tables remain the
-- gate (no privilege escalation here). `search_path` is pinned to public +
-- extensions so the pg_trgm operators (%) and functions (similarity) resolve
-- - pg_trgm is installed into the `extensions` schema.
--
-- Ranking: rows are scored by the greatest trigram similarity across the
-- searchable fields and returned most-relevant first. A substring (ilike) match
-- is also accepted so a clean prefix like "ethiop" is never missed even when its
-- trigram similarity sits under the % threshold. `count(*) over ()` returns the
-- full filtered total alongside each page so the API can report pagination
-- without a second round trip.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- search_coffees - fuzzy search + filter + paginate the shared coffee catalog.
-- Every argument is optional; passing none returns the whole catalog, name-
-- sorted and paginated. `flavour_slugs` matches coffees carrying ANY of the
-- given tag slugs (discovery-friendly OR, not AND).
-- ===========================================================================

create or replace function public.search_coffees(
  search_query   text    default null,
  origin_filter  text    default null,
  process_filter text    default null,
  roaster_filter uuid    default null,
  flavour_slugs  text[]  default null,
  decaf_filter   boolean default null,
  result_limit   integer default 20,
  result_offset  integer default 0
)
returns table (
  id                  uuid,
  name                text,
  roaster_id          uuid,
  roaster_name        text,
  roaster_slug        text,
  origin_country      text,
  region              text,
  process             text,
  varietal            text,
  roast_level         text,
  altitude_min_meters integer,
  altitude_max_meters integer,
  tasting_notes       text,
  is_decaf            boolean,
  flavour_tags        jsonb,
  relevance           real,
  total_count         bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with matched as (
    select
      c.id,
      c.name,
      c.roaster_id,
      r.name as roaster_name,
      r.slug as roaster_slug,
      c.origin_country,
      c.region,
      c.process,
      c.varietal,
      c.roast_level,
      c.altitude_min_meters,
      c.altitude_max_meters,
      c.tasting_notes,
      c.is_decaf,
      case
        when search_query is null or search_query = '' then 0::real
        else greatest(
          similarity(c.name, search_query),
          similarity(coalesce(c.origin_country, ''), search_query),
          similarity(coalesce(c.region, ''), search_query),
          similarity(coalesce(r.name, ''), search_query)
        )
      end as relevance
    from coffees c
    left join roasters r on r.id = c.roaster_id
    where
      (
        search_query is null or search_query = ''
        or c.name ilike '%' || search_query || '%'
        or c.origin_country ilike '%' || search_query || '%'
        or c.region ilike '%' || search_query || '%'
        or r.name ilike '%' || search_query || '%'
        or c.name % search_query
        or c.origin_country % search_query
        or r.name % search_query
      )
      and (origin_filter is null or c.origin_country ilike '%' || origin_filter || '%')
      and (process_filter is null or c.process ilike '%' || process_filter || '%')
      and (roaster_filter is null or c.roaster_id = roaster_filter)
      and (decaf_filter is null or c.is_decaf = decaf_filter)
      and (
        flavour_slugs is null
        or exists (
          select 1
          from coffee_flavour_tags cft
          join flavour_tags ft on ft.id = cft.flavour_tag_id
          where cft.coffee_id = c.id
            and ft.slug = any (flavour_slugs)
        )
      )
  )
  select
    m.id,
    m.name,
    m.roaster_id,
    m.roaster_name,
    m.roaster_slug,
    m.origin_country,
    m.region,
    m.process,
    m.varietal,
    m.roast_level,
    m.altitude_min_meters,
    m.altitude_max_meters,
    m.tasting_notes,
    m.is_decaf,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', ft.name, 'slug', ft.slug, 'category', ft.category)
          order by ft.name
        )
        from coffee_flavour_tags cft
        join flavour_tags ft on ft.id = cft.flavour_tag_id
        where cft.coffee_id = m.id
      ),
      '[]'::jsonb
    ) as flavour_tags,
    m.relevance,
    count(*) over () as total_count
  from matched m
  order by m.relevance desc, m.name asc
  limit greatest(coalesce(result_limit, 20), 0)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

comment on function public.search_coffees is
  'Fuzzy (pg_trgm) search + filter + paginate the shared coffee catalog; returns each row scored by relevance with a window total_count.';

grant execute on function public.search_coffees(
  text, text, text, uuid, text[], boolean, integer, integer
) to anon, authenticated;

-- ===========================================================================
-- search_roasters - fuzzy search the roaster catalog (scan/entry autocomplete).
-- Returns each roaster with its catalog coffee_count so the picker can show how
-- established a roaster is.
-- ===========================================================================

create or replace function public.search_roasters(
  search_query text    default null,
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (
  id           uuid,
  name         text,
  slug         text,
  country      text,
  city         text,
  coffee_count bigint,
  relevance    real,
  total_count  bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with matched as (
    select
      r.id,
      r.name,
      r.slug,
      r.country,
      r.city,
      case
        when search_query is null or search_query = '' then 0::real
        else similarity(r.name, search_query)
      end as relevance
    from roasters r
    where
      search_query is null or search_query = ''
      or r.name ilike '%' || search_query || '%'
      or r.name % search_query
  )
  select
    m.id,
    m.name,
    m.slug,
    m.country,
    m.city,
    (select count(*) from coffees c where c.roaster_id = m.id) as coffee_count,
    m.relevance,
    count(*) over () as total_count
  from matched m
  order by m.relevance desc, m.name asc
  limit greatest(coalesce(result_limit, 20), 0)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

comment on function public.search_roasters is
  'Fuzzy (pg_trgm) search the roaster catalog with per-roaster coffee_count; returns each row scored by relevance with a window total_count.';

grant execute on function public.search_roasters(
  text, integer, integer
) to anon, authenticated;

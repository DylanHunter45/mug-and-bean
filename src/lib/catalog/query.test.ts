import { describe, expect, it } from "vitest";

import {
  buildPaginationMeta,
  DEFAULT_LIMIT,
  isUuid,
  MAX_LIMIT,
  mapCoffeeDetail,
  mapCoffeeSummary,
  mapRoasterSummary,
  optionalBoolean,
  optionalString,
  optionalStringList,
  parseCoffeeSearchArgs,
  parsePagination,
  type CoffeeDetailRow,
  type CoffeeSearchRow,
  type RoasterSearchRow,
} from "./query";

const qs = (s: string) => new URLSearchParams(s);

describe("parsePagination", () => {
  it("defaults to page 1 and the default limit when params are absent", () => {
    expect(parsePagination(qs(""))).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it("computes offset from page and limit", () => {
    expect(parsePagination(qs("page=2&limit=20"))).toEqual({
      page: 2,
      limit: 20,
      offset: 20,
    });
    expect(parsePagination(qs("page=3&limit=10"))).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  it("clamps limit to [1, MAX_LIMIT] and page to >= 1", () => {
    expect(parsePagination(qs("limit=9999")).limit).toBe(MAX_LIMIT);
    expect(parsePagination(qs("limit=0")).limit).toBe(1);
    expect(parsePagination(qs("page=0")).page).toBe(1);
    expect(parsePagination(qs("page=-5")).offset).toBe(0);
  });

  it("falls back to defaults for non-integer garbage", () => {
    expect(parsePagination(qs("page=abc&limit=1.5"))).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
  });
});

describe("optionalString / optionalBoolean / optionalStringList", () => {
  it("trims and nullifies empty strings", () => {
    expect(optionalString(qs("q=ethiopia"), "q")).toBe("ethiopia");
    expect(optionalString(qs("q=%20%20"), "q")).toBeNull();
    expect(optionalString(qs(""), "q")).toBeNull();
  });

  it("parses boolean-ish flags", () => {
    expect(optionalBoolean(qs("decaf=true"), "decaf")).toBe(true);
    expect(optionalBoolean(qs("decaf=1"), "decaf")).toBe(true);
    expect(optionalBoolean(qs("decaf=false"), "decaf")).toBe(false);
    expect(optionalBoolean(qs("decaf=0"), "decaf")).toBe(false);
    expect(optionalBoolean(qs("decaf=maybe"), "decaf")).toBeNull();
    expect(optionalBoolean(qs(""), "decaf")).toBeNull();
  });

  it("splits, trims, and de-duplicates a comma list", () => {
    expect(
      optionalStringList(qs("flavour=cocoa,%20citrus%20,cocoa"), "flavour"),
    ).toEqual(["cocoa", "citrus"]);
    expect(optionalStringList(qs("flavour=,,"), "flavour")).toBeNull();
    expect(optionalStringList(qs(""), "flavour")).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts canonical UUIDs and rejects other strings", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2504e0-4f89-41d3-9a0c")).toBe(false);
  });
});

describe("parseCoffeeSearchArgs", () => {
  it("maps every filter and carries the page window through", () => {
    const pagination = { page: 2, limit: 20, offset: 20 };
    const args = parseCoffeeSearchArgs(
      qs(
        "q=ethiopia&origin=Ethiopia&process=Washed&decaf=false" +
          "&roaster=3f2504e0-4f89-41d3-9a0c-0305e82c3301&flavour=cocoa,citrus",
      ),
      pagination,
    );
    expect(args).toEqual({
      search_query: "ethiopia",
      origin_filter: "Ethiopia",
      process_filter: "Washed",
      roaster_filter: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      flavour_slugs: ["cocoa", "citrus"],
      decaf_filter: false,
      result_limit: 20,
      result_offset: 20,
    });
  });

  it("drops a non-UUID roaster filter instead of passing it to the RPC", () => {
    const args = parseCoffeeSearchArgs(qs("roaster=bogus"), {
      page: 1,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
    expect(args.roaster_filter).toBeNull();
  });
});

describe("buildPaginationMeta", () => {
  it("computes totalPages by ceiling division", () => {
    expect(buildPaginationMeta(52, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 52,
      totalPages: 3,
    });
    expect(buildPaginationMeta(0, 1, 20).totalPages).toBe(0);
    expect(buildPaginationMeta(20, 1, 20).totalPages).toBe(1);
  });
});

describe("mapCoffeeSummary", () => {
  const row: CoffeeSearchRow = {
    id: "coffee-1",
    name: "Mystic Za",
    roaster_id: "roaster-1",
    roaster_name: "Kittel",
    roaster_slug: "kittel",
    origin_country: "Brazil, Ethiopia",
    region: "Nyamasheke",
    process: "Washed",
    varietal: "Bourbon",
    roast_level: "Light",
    altitude_min_meters: 1200,
    altitude_max_meters: 2000,
    tasting_notes: "cocoa, citrus",
    is_decaf: false,
    flavour_tags: [{ name: "Cocoa", slug: "cocoa", category: "chocolate" }],
    relevance: 0.56,
    total_count: 2,
  };

  it("maps snake_case DB fields to the camelCase contract", () => {
    const summary = mapCoffeeSummary(row);
    expect(summary).toMatchObject({
      id: "coffee-1",
      name: "Mystic Za",
      roaster: { id: "roaster-1", name: "Kittel", slug: "kittel" },
      originCountry: "Brazil, Ethiopia",
      altitudeMinMeters: 1200,
      altitudeMaxMeters: 2000,
      isDecaf: false,
      flavourTags: [{ name: "Cocoa", slug: "cocoa", category: "chocolate" }],
    });
    // Internal-only fields must not leak into the public contract.
    expect(summary).not.toHaveProperty("relevance");
    expect(summary).not.toHaveProperty("total_count");
  });

  it("defaults a null flavour_tags to an empty array", () => {
    expect(
      mapCoffeeSummary({ ...row, flavour_tags: null }).flavourTags,
    ).toEqual([]);
  });
});

describe("mapRoasterSummary", () => {
  it("coerces the bigint coffee_count to a number", () => {
    const row: RoasterSearchRow = {
      id: "roaster-1",
      name: "Kittel",
      slug: "kittel",
      country: "Canada",
      city: "Montreal",
      coffee_count: 3,
      relevance: 1,
      total_count: 1,
    };
    expect(mapRoasterSummary(row)).toEqual({
      id: "roaster-1",
      name: "Kittel",
      slug: "kittel",
      country: "Canada",
      city: "Montreal",
      coffeeCount: 3,
    });
  });
});

describe("mapCoffeeDetail", () => {
  const baseRow: CoffeeDetailRow = {
    id: "coffee-1",
    name: "Mystic Za",
    origin_country: "Ethiopia",
    region: "Yirgacheffe",
    process: "Washed",
    varietal: "Heirloom",
    roast_level: "Light",
    altitude_min_meters: 1800,
    altitude_max_meters: 1800,
    tasting_notes: "citrus, floral",
    is_decaf: false,
    description: "A bright washed Ethiopian.",
    bag_image_url: null,
    created_at: "2026-07-07T00:00:00Z",
    updated_at: "2026-07-07T00:00:00Z",
    roaster: {
      id: "roaster-1",
      name: "Kittel",
      slug: "kittel",
      country: "Canada",
      city: "Montreal",
      website_url: "https://example.test",
    },
    coffee_flavour_tags: [
      { flavour_tags: { name: "Orange", slug: "orange", category: "fruity" } },
      { flavour_tags: { name: "Citrus", slug: "citrus", category: "fruity" } },
      { flavour_tags: null },
    ],
  };

  it("maps the roaster block and sorts flavour tags, dropping null links", () => {
    const detail = mapCoffeeDetail(baseRow);
    expect(detail.roaster).toEqual({
      id: "roaster-1",
      name: "Kittel",
      slug: "kittel",
      country: "Canada",
      city: "Montreal",
      websiteUrl: "https://example.test",
    });
    expect(detail.flavourTags.map((t) => t.name)).toEqual(["Citrus", "Orange"]);
    expect(detail.description).toBe("A bright washed Ethiopian.");
  });

  it("returns a null-filled roaster when the coffee has no roaster", () => {
    const detail = mapCoffeeDetail({ ...baseRow, roaster: null });
    expect(detail.roaster).toEqual({
      id: null,
      name: null,
      slug: null,
      country: null,
      city: null,
      websiteUrl: null,
    });
  });
});

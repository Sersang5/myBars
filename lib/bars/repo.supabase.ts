import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityRow, MyBarRow, PlaceRow, TagRow } from "@/lib/db/types";
import type { PlaceDetails } from "@/lib/places/types";
import type { BarFields, BarsRepo } from "./repo";
import type { Bar } from "./types";

const BAR_SELECT = "*, places!inner(*), bar_tags(rating, tags(id, name)), visits(id, date, note)";

type BarJoinRow = MyBarRow & {
  places: PlaceRow;
  bar_tags: { rating: number | null; tags: { id: string; name: string } | null }[];
  visits: { id: string; date: string; note: string | null }[];
};

function fail(op: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`${op}: ${error.message}`);
}

function mapBar(row: BarJoinRow): Bar {
  const place = row.places;
  return {
    id: row.id,
    placeId: place.id,
    googlePlaceId: place.google_place_id,
    name: place.name,
    address: place.address ?? "",
    cityId: place.city_id,
    location: { lat: place.lat ?? 0, lng: place.lng ?? 0 },
    mapsUrl: place.maps_url ?? "",
    googleRating: place.google_rating === null ? null : Number(place.google_rating),
    googleRatingCount: place.google_user_rating_count ?? 0,
    status: row.status,
    ratingLocal: row.rating_local,
    ratingService: row.rating_service,
    ratingFood: row.rating_food,
    ratingOverallManual: row.rating_overall_manual,
    priceLevel: row.price_level as Bar["priceLevel"],
    notes: row.notes ?? "",
    pendingReason: row.pending_reason,
    tags: row.bar_tags
      .filter((bt) => bt.tags)
      .map((bt) => ({ tagId: bt.tags!.id, name: bt.tags!.name, rating: bt.rating })),
    visits: [...row.visits].sort((a, b) => b.date.localeCompare(a.date)),
    createdAt: row.created_at,
  };
}

function toColumns(f: Partial<BarFields>): Record<string, unknown> {
  const map: Record<keyof BarFields, string> = {
    ratingLocal: "rating_local",
    ratingService: "rating_service",
    ratingFood: "rating_food",
    ratingOverallManual: "rating_overall_manual",
    priceLevel: "price_level",
    notes: "notes",
    pendingReason: "pending_reason",
    status: "status",
  };
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(map)) {
    const value = f[key as keyof BarFields];
    if (value !== undefined) out[col] = value;
  }
  return out;
}

export function createSupabaseBarsRepo(sb: SupabaseClient): BarsRepo {
  async function listGoogleIds(status: "visited" | "pending"): Promise<Set<string>> {
    const { data, error } = await sb.from("my_bars").select("places!inner(google_place_id)").eq("status", status);
    fail("listGoogleIds", error);
    const rows = (data ?? []) as unknown as { places: { google_place_id: string } }[];
    return new Set(rows.map((r) => r.places.google_place_id));
  }

  async function barQuery(filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>) {
    const { data, error } = await filter(base());
    fail("bar query", error);
    return (data ?? []) as unknown as BarJoinRow[];
  }
  const base = () => sb.from("my_bars").select(BAR_SELECT);

  return {
    async get(googlePlaceId) {
      const { data, error } = await sb
        .from("places")
        .select("details_json, details_fetched_at")
        .eq("google_place_id", googlePlaceId)
        .maybeSingle();
      fail("places.get", error);
      if (!data?.details_json || !data.details_fetched_at) return null;
      return { details: data.details_json as PlaceDetails, fetchedAt: new Date(data.details_fetched_at) };
    },

    async put(details, fetchedAt) {
      const { error } = await sb
        .from("places")
        .update({ details_json: details, details_fetched_at: fetchedAt.toISOString() })
        .eq("google_place_id", details.googlePlaceId);
      fail("places.put", error);
    },

    async findCityByName(name) {
      // ilike treats % and _ as wildcards; escape them for a case-insensitive exact match.
      const pattern = name.replace(/[\\%_]/g, (c) => `\\${c}`);
      const { data, error } = await sb.from("cities").select("*").ilike("name", pattern).limit(1);
      fail("findCityByName", error);
      return ((data ?? [])[0] as CityRow | undefined) ?? null;
    },

    async insertCity(c) {
      const { data, error } = await sb
        .from("cities")
        .insert({ name: c.name, google_place_id: c.googlePlaceId, lat: c.location.lat, lng: c.location.lng })
        .select()
        .single();
      fail("insertCity", error);
      return data as CityRow;
    },

    async listCities() {
      const { data, error } = await sb.from("cities").select("*").order("name");
      fail("listCities", error);
      return (data ?? []) as CityRow[];
    },

    async upsertPlace(d, cityId) {
      const columns = {
        name: d.name,
        address: d.address,
        city_id: cityId,
        lat: d.location.lat,
        lng: d.location.lng,
        google_rating: d.rating,
        google_user_rating_count: d.userRatingCount,
        google_price_level: d.priceLevel,
        maps_url: d.mapsUrl,
        photo_ref: d.photoRef,
      };
      const { data: existing, error: findError } = await sb
        .from("places")
        .select("id")
        .eq("google_place_id", d.googlePlaceId)
        .maybeSingle();
      fail("upsertPlace.find", findError);

      if (existing) {
        const { data, error } = await sb.from("places").update(columns).eq("id", existing.id).select().single();
        fail("upsertPlace.update", error);
        return data as PlaceRow;
      }
      // A brand-new place was just fetched from Google, so seed the details cache.
      const { data, error } = await sb
        .from("places")
        .insert({
          google_place_id: d.googlePlaceId,
          ...columns,
          details_json: d,
          details_fetched_at: new Date().toISOString(),
        })
        .select()
        .single();
      fail("upsertPlace.insert", error);
      return data as PlaceRow;
    },

    async findBarByGooglePlaceId(googlePlaceId) {
      const rows = await barQuery((q) => q.eq("places.google_place_id", googlePlaceId).limit(1));
      return rows[0] ? mapBar(rows[0]) : null;
    },

    async insertBar(placeId, status, fields) {
      const { data, error } = await sb
        .from("my_bars")
        .insert({ ...toColumns(fields), place_id: placeId, status })
        .select("id")
        .single();
      fail("insertBar", error);
      return (data as { id: string }).id;
    },

    async updateBar(id, fields) {
      const { error } = await sb.from("my_bars").update(toColumns(fields)).eq("id", id);
      fail("updateBar", error);
    },

    async deleteBar(id) {
      const { error } = await sb.from("my_bars").delete().eq("id", id);
      fail("deleteBar", error);
    },

    async listBars(cityId, status) {
      const rows = await barQuery((q) => q.eq("status", status).eq("places.city_id", cityId));
      return rows.map(mapBar);
    },

    listAllVisitedGooglePlaceIds: () => listGoogleIds("visited"),
    listPendingGooglePlaceIds: () => listGoogleIds("pending"),

    async getBar(id) {
      const rows = await barQuery((q) => q.eq("id", id).limit(1));
      return rows[0] ? mapBar(rows[0]) : null;
    },

    async upsertTag(name) {
      const find = async () => {
        const { data, error } = await sb.from("tags").select("*").eq("name", name).maybeSingle();
        fail("upsertTag.find", error);
        return data as TagRow | null;
      };
      const existing = await find();
      if (existing) return existing;
      const { data, error } = await sb.from("tags").insert({ name }).select().single();
      if (error) {
        // Lost a race against a concurrent insert of the same tag.
        const raced = await find();
        if (raced) return raced;
        fail("upsertTag.insert", error);
      }
      return data as TagRow;
    },

    async listTags() {
      const { data, error } = await sb.from("tags").select("*").order("name");
      fail("listTags", error);
      return (data ?? []) as TagRow[];
    },

    async setBarTags(barId, tags) {
      const { error: delError } = await sb.from("bar_tags").delete().eq("my_bar_id", barId);
      fail("setBarTags.delete", delError);
      if (tags.length === 0) return;
      const { error } = await sb
        .from("bar_tags")
        .insert(tags.map((t) => ({ my_bar_id: barId, tag_id: t.tagId, rating: t.rating })));
      fail("setBarTags.insert", error);
    },

    async addVisit(barId, date, note) {
      const { error } = await sb.from("visits").insert({ my_bar_id: barId, date, note });
      fail("addVisit", error);
    },
  };
}

export type BarStatus = "visited" | "pending";

export interface CityRow {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  google_place_id: string;
  lat: number | null;
  lng: number | null;
}

export interface PlaceRow {
  id: string;
  user_id: string;
  created_at: string;
  google_place_id: string;
  name: string;
  address: string | null;
  city_id: string | null;
  lat: number | null;
  lng: number | null;
  google_rating: number | null;
  google_user_rating_count: number | null;
  google_price_level: number | null;
  maps_url: string | null;
  photo_ref: string | null;
  details_json: unknown | null;
  details_fetched_at: string | null;
}

export interface MyBarRow {
  id: string;
  user_id: string;
  created_at: string;
  place_id: string;
  status: BarStatus;
  rating_local: number | null;
  rating_service: number | null;
  rating_food: number | null;
  rating_overall_manual: number | null;
  price_level: number | null;
  notes: string | null;
  pending_reason: string | null;
  updated_at: string;
}

export interface VisitRow {
  id: string;
  user_id: string;
  created_at: string;
  my_bar_id: string;
  date: string;
  note: string | null;
}

export interface TagRow {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
}

export interface BarTagRow {
  my_bar_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
  rating: number | null;
}

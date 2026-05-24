/** صف منطقة شحن كما يُعاد من API / قاعدة البيانات */
export type ShippingZoneRow = {
  id: string;
  name: string;
  cities: string[];
  base_fee_egp: number;
  free_shipping_threshold_egp: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  /** Map placement — null when zone exists in DB but is not placed on the map */
  center_lat?: number | null;
  center_lng?: number | null;
  radius_km?: number | null;
  map_color?: string | null;
};

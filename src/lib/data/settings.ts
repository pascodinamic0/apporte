import { DEFAULT_FEES, DEFAULT_ZONES, type FeeSettings, type Zone } from "../fees";
import { getServiceClient } from "../supabase/server";

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const g = globalThis as unknown as { __apporteFees?: FeeSettings; __apporteZones?: Zone[] };

export async function getFeeSettings(): Promise<FeeSettings> {
  if (!configured()) return g.__apporteFees ?? DEFAULT_FEES;
  const { data, error } = await getServiceClient().from("app_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_FEES;
  return {
    commissionPct: Number(data.commission_pct),
    riderSharePct: Number(data.rider_share_pct),
    vatPct: Number(data.vat_pct),
  };
}

export async function updateFeeSettings(s: FeeSettings, by: string): Promise<FeeSettings> {
  if (!configured()) {
    g.__apporteFees = s;
    return s;
  }
  const { error } = await getServiceClient()
    .from("app_settings")
    .upsert({
      id: 1,
      commission_pct: s.commissionPct,
      rider_share_pct: s.riderSharePct,
      vat_pct: s.vatPct,
      updated_at: new Date().toISOString(),
      updated_by: by,
    });
  if (error) throw error;
  return s;
}

function mapZone(z: any): Zone {
  return {
    id: z.id,
    name: z.name,
    deliveryFeeUsd: Number(z.delivery_fee_usd),
    active: !!z.active,
    sortOrder: Number(z.sort_order ?? 0),
  };
}

export async function listZones(): Promise<Zone[]> {
  if (!configured()) return g.__apporteZones ?? DEFAULT_ZONES;
  const { data, error } = await getServiceClient().from("zones").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data || []).map(mapZone);
}

export async function activeZones(): Promise<Zone[]> {
  return (await listZones()).filter((z) => z.active);
}

export async function upsertZone(z: { id?: string; name: string; deliveryFeeUsd: number; active: boolean }): Promise<Zone> {
  const id = z.id || "zone_" + z.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!configured()) {
    const zones = [...(g.__apporteZones ?? DEFAULT_ZONES)];
    const i = zones.findIndex((x) => x.id === id);
    const next = { id, name: z.name, deliveryFeeUsd: z.deliveryFeeUsd, active: z.active, sortOrder: i >= 0 ? zones[i].sortOrder : zones.length + 1 };
    if (i >= 0) zones[i] = next;
    else zones.push(next);
    g.__apporteZones = zones;
    return next;
  }
  const supabase = getServiceClient();
  const existing = await supabase.from("zones").select("sort_order").eq("id", id).maybeSingle();
  let sort = existing.data?.sort_order;
  if (sort == null) {
    const { count } = await supabase.from("zones").select("id", { count: "exact", head: true });
    sort = (count ?? 0) + 1;
  }
  const { data, error } = await supabase
    .from("zones")
    .upsert({ id, name: z.name, delivery_fee_usd: z.deliveryFeeUsd, active: z.active, sort_order: sort, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return mapZone(data);
}

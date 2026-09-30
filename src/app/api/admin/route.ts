import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { listRiders } from "@/src/lib/data/db";
import {
  createRestaurant,
  createRider,
  listRestaurantsAdmin,
  reassignRider,
  riderEarnings,
  searchOrdersAdmin,
  setRefundFlag,
  updateRestaurant,
  updateRider,
  cancelOrder,
  type AdminOrderFilter,
} from "@/src/lib/data/ops";
import { addSupportNote } from "@/src/lib/data/db";
import { getFeeSettings, listZones, updateFeeSettings, upsertZone } from "@/src/lib/data/settings";
import { validateFeeSettings } from "@/src/lib/fees";
import { DEFAULT_HOURS } from "@/src/lib/hours";

const FILTERS = ["active", "new", "kitchen", "delivery", "delivered", "cancelled", "refund", "all"] as const;

function slimOrder(o: Awaited<ReturnType<typeof searchOrdersAdmin>>[number]) {
  const { pin: _pin, ...rest } = o;
  return rest;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const sp = req.nextUrl.searchParams;
  const view = sp.get("view") || "orders";
  if (view === "settings") {
    const [fees, zones] = await Promise.all([getFeeSettings(), listZones()]);
    return NextResponse.json({ fees, zones }, { headers: { "Cache-Control": "no-store" } });
  }
  if (view === "people") {
    const [restaurants, riders] = await Promise.all([listRestaurantsAdmin(), listRiders()]);
    const earn = await riderEarnings(riders.map((r) => r.id));
    return NextResponse.json(
      {
        restaurants,
        riders: riders.map((r) => ({ ...r, earnings: earn[r.id] })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const status = (FILTERS as readonly string[]).includes(sp.get("f") || "") ? (sp.get("f") as AdminOrderFilter["status"]) : "active";
  const [orders, restaurants, riders] = await Promise.all([
    searchOrdersAdmin({ status, q: sp.get("q") || "", restaurantId: sp.get("restaurant") || undefined, limit: 80 }),
    listRestaurantsAdmin(),
    listRiders(),
  ]);
  return NextResponse.json(
    {
      orders: orders.map(slimOrder),
      restaurants: restaurants.map((r) => ({ id: r.id, name: r.name })),
      riders: riders.map((r) => ({ id: r.id, name: r.name, status: r.status, suspended: !!r.suspended })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const action = String((body as { action?: unknown }).action || "");
  try {
    if (action === "cancel") {
      const id = String(body.orderId || "");
      const reason = String(body.reason || "").trim();
      if (!id || reason.length < 2) return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
      await cancelOrder(id, `admin:${user.id}`, reason.slice(0, 200));
    } else if (action === "reassign") {
      const id = String(body.orderId || "");
      const riderId = body.riderId == null || body.riderId === "" ? null : String(body.riderId);
      if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      await reassignRider(id, riderId);
    } else if (action === "note") {
      const id = String(body.orderId || "");
      const note = String(body.note || "").trim();
      if (!id || note.length < 1 || note.length > 500) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      await addSupportNote(id, note, user.id);
    } else if (action === "refund") {
      const id = String(body.orderId || "");
      if (!id || typeof body.flag !== "boolean") return NextResponse.json({ error: "bad_request" }, { status: 400 });
      await setRefundFlag(id, body.flag, typeof body.note === "string" ? body.note.slice(0, 300) : undefined);
    } else if (action === "restaurant_save") {
      const name = String(body.name || "").trim();
      const cuisine = String(body.cuisine || "").trim();
      const zone = String(body.zone || "Gombe").trim();
      const eta = Number(body.etaMinutes);
      const lat = Number(body.latitude);
      const lng = Number(body.longitude);
      if (name.length < 2 || cuisine.length < 2 || !Number.isFinite(eta) || eta < 5 || eta > 120) {
        return NextResponse.json({ error: "bad_request", reason: "invalid_restaurant" }, { status: 400 });
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "bad_request", reason: "invalid_pin" }, { status: 400 });
      const input = {
        name: name.slice(0, 80),
        cuisine: cuisine.slice(0, 40),
        zone: zone.slice(0, 40),
        etaMinutes: Math.round(eta),
        latitude: lat,
        longitude: lng,
        description: body.description ? String(body.description).slice(0, 300) : null,
        phone: body.phone ? String(body.phone).slice(0, 20) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 500) : null,
        commissionPct: body.commissionPct === "" || body.commissionPct == null ? null : Number(body.commissionPct),
        hours: DEFAULT_HOURS,
      };
      if (input.commissionPct != null && (!Number.isFinite(input.commissionPct) || input.commissionPct < 0 || input.commissionPct > 100)) {
        return NextResponse.json({ error: "bad_request", reason: "invalid_commission" }, { status: 400 });
      }
      const saved = body.id ? await updateRestaurant(String(body.id), input) : await createRestaurant(input);
      return NextResponse.json({ ok: true, restaurant: saved });
    } else if (action === "restaurant_suspend") {
      const id = String(body.id || "");
      if (!id || typeof body.suspended !== "boolean") return NextResponse.json({ error: "bad_request" }, { status: 400 });
      const saved = await updateRestaurant(id, { suspended: body.suspended });
      return NextResponse.json({ ok: true, restaurant: saved });
    } else if (action === "rider_create") {
      const name = String(body.name || "").trim();
      if (name.length < 2) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      const rider = await createRider({ name: name.slice(0, 80), phone: body.phone ? String(body.phone).slice(0, 20) : null });
      return NextResponse.json({ ok: true, rider });
    } else if (action === "rider_update") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      const rider = await updateRider(id, {
        name: body.name ? String(body.name).trim().slice(0, 80) : undefined,
        phone: body.phone !== undefined ? String(body.phone || "").slice(0, 20) : undefined,
        suspended: typeof body.suspended === "boolean" ? body.suspended : undefined,
      });
      return NextResponse.json({ ok: true, rider });
    } else if (action === "fees") {
      const v = validateFeeSettings(body);
      if (!v.ok) return NextResponse.json({ error: "bad_request", reason: v.reason }, { status: 400 });
      const fees = await updateFeeSettings(v.data, user.id);
      return NextResponse.json({ ok: true, fees });
    } else if (action === "zone") {
      const name = String(body.name || "").trim();
      const fee = Number(body.deliveryFeeUsd);
      if (name.length < 2 || name.length > 40 || !Number.isFinite(fee) || fee < 0 || fee > 50) {
        return NextResponse.json({ error: "bad_request", reason: "invalid_zone" }, { status: 400 });
      }
      const zone = await upsertZone({
        id: body.id ? String(body.id) : undefined,
        name,
        deliveryFeeUsd: Math.round(fee * 100) / 100,
        active: !!body.active,
      });
      return NextResponse.json({ ok: true, zone });
    } else {
      return NextResponse.json({ error: "bad_request", reason: "unknown_action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (["invalid_state", "rider_busy", "rider_suspended", "rider_not_found", "not_found"].includes(msg)) {
      return NextResponse.json({ error: "conflict", reason: msg }, { status: 409 });
    }
    console.error("admin action failed", action, msg);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

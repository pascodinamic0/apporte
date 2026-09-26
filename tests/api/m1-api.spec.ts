/**
 * API / server-action security tests against a running deployment.
 *   BASE_URL=https://<preview> VERCEL_OIDC_TOKEN=... npm run test:api
 * Uses the demo login (/api/demo/login). Creates at most one order for the
 * demo merchant's restaurant and cancels it at the end (via the admin API).
 */
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OIDC = process.env.VERCEL_OIDC_TOKEN;
const extraHTTPHeaders: Record<string, string> = OIDC ? { "x-vercel-trusted-oidc-idp-token": OIDC } : {};

async function as(userId: string | null): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders });
  if (userId) {
    const r = await ctx.post("/api/demo/login", { data: { userId } });
    expect(r.ok(), `demo login ${userId}`).toBeTruthy();
  }
  return ctx;
}

const validOrder = {
  restaurantId: "rest_kfc_gombe",
  items: [{ kind: "food", menuItemId: "mi_kfc_1", quantity: 1 }],
  address: "Test automatique QA, Boulevard du 30 Juin, Gombe",
  addressNotes: "QA automatique, ne pas livrer",
  zone: "Gombe",
  paymentMethod: "Cash on delivery",
  customerPhone: "+243812345678",
};

test.describe.configure({ mode: "serial" });

test.describe("POST /api/orders validation", () => {
  test("invalid payment method -> 400 (not 500)", async () => {
    const c = await as("u_customer");
    const r = await c.post("/api/orders", { data: { ...validOrder, paymentMethod: "Bitcoin" } });
    expect(r.status()).toBe(400);
    expect(await r.json()).toMatchObject({ reason: "invalid_payment_method" });
  });
  test("Mobile Money -> 400 payment_method_unavailable", async () => {
    const c = await as("u_customer");
    const r = await c.post("/api/orders", { data: { ...validOrder, paymentMethod: "Mobile Money" } });
    expect(r.status()).toBe(400);
    expect(await r.json()).toMatchObject({ reason: "payment_method_unavailable" });
  });
  test("invalid or missing phone -> 400 invalid_phone", async () => {
    const c = await as("u_customer");
    for (const customerPhone of ["12345", "+243000000000", undefined]) {
      const r = await c.post("/api/orders", { data: { ...validOrder, customerPhone } });
      expect(r.status()).toBe(400);
      expect(await r.json()).toMatchObject({ reason: "invalid_phone" });
    }
  });
  test("malformed JSON -> 400, anonymous -> 401, merchant -> 403, unserved zone -> 400", async () => {
    const c = await as("u_customer");
    const bad = await c.post("/api/orders", { headers: { "content-type": "application/json" }, data: "{nope" });
    expect(bad.status()).toBe(400);
    const zone = await c.post("/api/orders", { data: { ...validOrder, zone: "Limete" } });
    expect(zone.status()).toBe(400);
    const anon = await as(null);
    expect((await anon.post("/api/orders", { data: validOrder })).status()).toBe(401);
    const m = await as("u_merchant");
    expect((await m.post("/api/orders", { data: validOrder })).status()).toBe(403);
  });
});

test.describe("merchant advance-order authorization", () => {
  let orderId = "";
  let actionId = "";

  test.beforeAll(async () => {
    // Find the server action id for advanceOrder in the merchant page's JS.
    const m = await as("u_merchant");
    const html = await (await m.get("/merchant")).text();
    const chunks = Array.from(new Set(Array.from(html.matchAll(/\/_next\/static\/[^"']+?\.js/g)).map((x) => x[0])));
    for (const src of chunks) {
      const js = await (await m.get(src)).text();
      const hit = js.match(/createServerReference\)\("([0-9a-f]{40,})"[^)]*?"advanceOrder"\)/) || js.match(/"([0-9a-f]{40,})"[^"]{0,120}"advanceOrder"/);
      if (hit) {
        actionId = hit[1];
        break;
      }
    }
    const c = await as("u_customer");
    const r = await c.post("/api/orders", { data: validOrder });
    expect(r.status(), await r.text()).toBe(200);
    orderId = (await r.json()).order.id;
  });

  test.afterAll(async () => {
    if (!orderId) return;
    const a = await as("u_admin");
    await a.patch(`/api/orders/${orderId}`, { data: { action: "update_status", status: "cancelled" } });
  });

  async function statusOf(): Promise<string> {
    const m = await as("u_merchant");
    const r = await m.get(`/api/orders/${orderId}`);
    return (await r.json()).order.status;
  }

  async function callAction(ctx: APIRequestContext, action: string) {
    return ctx.post("/merchant", {
      headers: { "Next-Action": actionId, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component" },
      data: JSON.stringify([orderId, action]),
    });
  }

  test("PATCH as customer / rider / anonymous is refused", async () => {
    for (const [who, code] of [["u_customer", 403], ["u_rider", 403], [null, 401]] as const) {
      const c = await as(who);
      const r = await c.patch(`/api/orders/${orderId}`, { data: { action: "merchant_accept" } });
      expect(r.status(), String(who)).toBe(code);
    }
    expect(await statusOf()).toBe("placed");
  });

  test("replaying the server action without a merchant session does not change the order", async () => {
    test.skip(!actionId, "server action id not found in client bundle");
    for (const who of [null, "u_customer", "u_rider", "u_admin"]) {
      const c = await as(who);
      const r = await callAction(c, "merchant_accept");
      expect(r.status(), `${who}: ${r.status()}`).toBeLessThan(500);
      const body = await r.text();
      expect(body).not.toContain('"ok":true');
    }
    expect(await statusOf()).toBe("placed");
  });

  test("the owning merchant can advance, but cannot skip steps", async () => {
    test.skip(!actionId, "server action id not found in client bundle");
    const m = await as("u_merchant");
    const skip = await callAction(m, "merchant_ready");
    expect(await skip.text()).toContain("invalid_state");
    expect(await statusOf()).toBe("placed");
    const ok = await callAction(m, "merchant_accept");
    expect(await ok.text()).toContain('"ok":true');
    expect(await statusOf()).toBe("restaurant_accepted");
    // PATCH replay of the same step -> 409
    const again = await m.patch(`/api/orders/${orderId}`, { data: { action: "merchant_accept" } });
    expect(again.status()).toBe(409);
  });
});

test.describe("other endpoints", () => {
  test("menu price validation and ownership", async () => {
    const m = await as("u_merchant");
    expect((await m.patch("/api/menu/mi_kfc_1", { data: { priceUsd: "" } })).status()).toBe(400);
    expect((await m.patch("/api/menu/mi_kfc_1", { data: { priceUsd: -2 } })).status()).toBe(400);
    expect((await m.patch("/api/menu/mi_pizza_1", { data: { available: true } })).status()).toBe(403);
    const c = await as("u_customer");
    expect((await c.patch("/api/menu/mi_kfc_1", { data: { available: false } })).status()).toBe(403);
  });
  test("rider status only accepts online/offline, rider endpoints need a rider", async () => {
    const r = await as("u_rider");
    expect((await r.patch("/api/riders/rider_1/status", { data: { status: "busy" } })).status()).toBe(400);
    const c = await as("u_customer");
    expect((await c.patch("/api/riders/rider_1/status", { data: { status: "offline" } })).status()).toBe(403);
    expect((await c.get("/api/rider/me")).status()).toBe(403);
    expect((await c.post("/api/dispatch/offer", { data: { orderId: "ord_x", action: "accept" } })).status()).toBe(403);
  });
  test("unknown page returns the French 404", async () => {
    const c = await as(null);
    const r = await c.get("/cette-page-nexiste-pas");
    expect(r.status()).toBe(404);
    expect(await r.text()).toContain("Cette page n’existe pas");
  });
  test("robots.txt and sitemap.xml", async () => {
    const c = await as(null);
    const robots = await (await c.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    const sm = await c.get("/sitemap.xml");
    expect(sm.status()).toBe(200);
    expect(await sm.text()).toContain("/restaurant/");
  });
});

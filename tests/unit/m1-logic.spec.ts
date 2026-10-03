/**
 * Pure logic tests (no browser, no server): merchant authorization guard,
 * DRC phone validation, order payload validation and menu price parsing.
 * Run: npm run test:unit
 */
import { test, expect } from "@playwright/test";
import { checkMerchantAction, checkMerchantDecline } from "../../src/lib/orderGuard";
import { normalizeDrcPhone, formatDrcPhone } from "../../src/lib/phone";
import { validateCreateOrder } from "../../src/lib/validation";
import { parseMenuPrice } from "../../src/lib/price";
import { computeBreakdown, DEFAULT_FEES, DEFAULT_ZONES, zoneFee } from "../../src/lib/fees";
import { deliveryLegKm, quoteDeliveryFeeUsd } from "../../src/lib/geo";

const merchant = { role: "merchant" as const, merchantId: "rest_kfc_gombe" };
const placedKfc = { restaurantId: "rest_kfc_gombe", status: "placed" as const };

test.describe("checkMerchantAction (merchant server action + PATCH guard)", () => {
  test("rejects anonymous callers with 401", () => {
    expect(checkMerchantAction(null, placedKfc, "merchant_accept")).toEqual({ ok: false, status: 401, error: "unauthorized" });
    expect(checkMerchantAction(undefined, placedKfc, "merchant_accept")).toMatchObject({ status: 401 });
  });
  test("rejects non-merchant roles with 403", () => {
    for (const role of ["customer", "rider", "admin"] as const) {
      expect(checkMerchantAction({ role, merchantId: undefined }, placedKfc, "merchant_accept")).toMatchObject({ ok: false, status: 403 });
    }
    // a customer that somehow carries a merchantId is still refused
    expect(checkMerchantAction({ role: "customer", merchantId: "rest_kfc_gombe" }, placedKfc, "merchant_accept")).toMatchObject({ status: 403 });
  });
  test("rejects a merchant acting on another restaurant's order with 403", () => {
    expect(checkMerchantAction(merchant, { restaurantId: "rest_pizza", status: "placed" }, "merchant_accept")).toMatchObject({ status: 403 });
    expect(checkMerchantAction(merchant, { restaurantId: undefined, status: "placed" }, "merchant_accept")).toMatchObject({ status: 403 });
  });
  test("404 when the order does not exist, 400 for unknown actions", () => {
    expect(checkMerchantAction(merchant, null, "merchant_accept")).toMatchObject({ status: 404 });
    expect(checkMerchantAction(merchant, placedKfc, "delivered")).toMatchObject({ status: 400, error: "unknown_action" });
    expect(checkMerchantAction(merchant, placedKfc, "__proto__")).toMatchObject({ status: 400 });
  });
  test("enforces the state machine (409 on skipped or replayed steps)", () => {
    expect(checkMerchantAction(merchant, placedKfc, "merchant_ready")).toMatchObject({ status: 409, error: "invalid_state" });
    expect(checkMerchantAction(merchant, { ...placedKfc, status: "delivered" }, "merchant_accept")).toMatchObject({ status: 409 });
    expect(checkMerchantAction(merchant, { ...placedKfc, status: "restaurant_accepted" }, "merchant_accept")).toMatchObject({ status: 409 });
  });
  test("allows the owning merchant through each valid step", () => {
    expect(checkMerchantAction(merchant, placedKfc, "merchant_accept")).toEqual({ ok: true });
    expect(checkMerchantAction(merchant, { ...placedKfc, status: "restaurant_accepted" }, "merchant_preparing")).toEqual({ ok: true });
    expect(checkMerchantAction(merchant, { ...placedKfc, status: "preparing" }, "merchant_ready")).toEqual({ ok: true });
  });
});

test.describe("checkMerchantDecline", () => {
  test("only the owning merchant can refuse a new order", () => {
    expect(checkMerchantDecline(null, placedKfc)).toMatchObject({ status: 401 });
    for (const role of ["customer", "rider", "admin"] as const) {
      expect(checkMerchantDecline({ role, merchantId: role === "admin" ? undefined : "rest_kfc_gombe" }, placedKfc)).toMatchObject({ status: 403 });
    }
    expect(checkMerchantDecline({ role: "merchant", merchantId: "rest_other" }, placedKfc)).toMatchObject({ status: 403 });
    expect(checkMerchantDecline(merchant, null)).toMatchObject({ status: 404 });
    expect(checkMerchantDecline(merchant, { ...placedKfc, status: "preparing" })).toMatchObject({ status: 409, error: "invalid_state" });
    expect(checkMerchantDecline(merchant, { ...placedKfc, status: "restaurant_accepted" })).toMatchObject({ status: 409 });
    expect(checkMerchantDecline(merchant, { ...placedKfc, status: "delivered" })).toMatchObject({ status: 409 });
    expect(checkMerchantDecline(merchant, placedKfc)).toEqual({ ok: true });
    expect(checkMerchantDecline(merchant, { ...placedKfc, paymentStatus: "unpaid" })).toEqual({ ok: true });
    expect(checkMerchantDecline(merchant, { ...placedKfc, paymentStatus: "paid" })).toMatchObject({ status: 409, error: "paid_order" });
  });
});

test.describe("normalizeDrcPhone", () => {
  test("accepts the usual Congolese formats", () => {
    for (const input of ["+243 81 234 5678", "+243812345678", "00243812345678", "243812345678", "0812345678", "812345678", "+243 (0)97-123.4567".replace("(0)", ""), "0991234567", "0851234567"]) {
      expect(normalizeDrcPhone(input), input).toMatch(/^\+243[89]\d{8}$/);
    }
    expect(normalizeDrcPhone("0812345678")).toBe("+243812345678");
    expect(formatDrcPhone("+243812345678")).toBe("+243 81 234 5678");
  });
  test("rejects invalid numbers", () => {
    for (const input of ["", "   ", "12345", "+243000000000", "0712345678", "+33612345678", "+2438123456789", "08123456", "abc0812345678", "+243 81 234 567x", "81+2345678", null, undefined, 812345678]) {
      expect(normalizeDrcPhone(input as unknown), String(input)).toBeNull();
    }
  });
});

test.describe("validateCreateOrder", () => {
  const good = {
    restaurantId: "rest_kfc_gombe",
    items: [{ kind: "food", menuItemId: "mi_kfc_1", quantity: 2 }],
    address: "Avenue du Commerce 12, Gombe",
    addressNotes: "Immeuble bleu, 2e étage",
    zone: "Gombe",
    paymentMethod: "Cash on delivery",
    customerPhone: "0812345678",
  };
  test("accepts a valid cash order and normalizes the phone", () => {
    const r = validateCreateOrder(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.customerPhone).toBe("+243812345678");
  });
  test("invalid payment method -> invalid_payment_method (API answers 400)", () => {
    for (const pm of ["Bitcoin", "", 42, null, "cash"]) {
      expect(validateCreateOrder({ ...good, paymentMethod: pm })).toMatchObject({ ok: false, reason: "invalid_payment_method", field: "paymentMethod" });
    }
  });
  test("Mobile Money is not live yet -> payment_method_unavailable", () => {
    expect(validateCreateOrder({ ...good, paymentMethod: "Mobile Money" })).toMatchObject({ ok: false, reason: "payment_method_unavailable" });
  });
  test("missing or invalid phone is refused", () => {
    expect(validateCreateOrder({ ...good, customerPhone: undefined })).toMatchObject({ ok: false, reason: "invalid_phone" });
    expect(validateCreateOrder({ ...good, customerPhone: "243000000000" })).toMatchObject({ ok: false, reason: "invalid_phone" });
  });
  test("unserved zone, empty cart, bad quantities and short address are refused", () => {
    // A real zone name is accepted here; the server refuses it if the zone is inactive.
    expect(validateCreateOrder({ ...good, zone: "Limete" }).ok).toBe(true);
    expect(validateCreateOrder({ ...good, zone: "??" })).toMatchObject({ ok: false, reason: "zone_not_served" });
    expect(validateCreateOrder({ ...good, items: [] })).toMatchObject({ ok: false, reason: "missing_items" });
    expect(validateCreateOrder({ ...good, items: [{ kind: "food", menuItemId: "mi_kfc_1", quantity: 0 }] })).toMatchObject({ ok: false, reason: "invalid_items" });
    expect(validateCreateOrder({ ...good, items: [{ kind: "food", menuItemId: "mi_kfc_1", quantity: 1.5 }] })).toMatchObject({ ok: false, reason: "invalid_items" });
    expect(validateCreateOrder({ ...good, address: "ici" })).toMatchObject({ ok: false, reason: "invalid_address" });
    expect(validateCreateOrder("nope")).toMatchObject({ ok: false });
  });
});

test.describe("quoteDeliveryFeeUsd", () => {
  test("prices the delivery leg, with a floor for very short hops", () => {
    expect(quoteDeliveryFeeUsd(0)).toBe(2);
    expect(quoteDeliveryFeeUsd(0.5)).toBe(2);
    expect(quoteDeliveryFeeUsd(1.25)).toBe(2.5);
    expect(quoteDeliveryFeeUsd(2)).toBe(3.1);
    expect(quoteDeliveryFeeUsd(Number.NaN)).toBe(2);
  });
  test("uses the distance from pickup to the center of Gombe", () => {
    const km = deliveryLegKm(-4.3156, 15.3126);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(5);
    expect(quoteDeliveryFeeUsd(km)).toBeGreaterThanOrEqual(2);
  });
});

test.describe("parseMenuPrice", () => {
  test("accepts sane prices, including a French decimal comma", () => {
    expect(parseMenuPrice("12.5")).toBe(12.5);
    expect(parseMenuPrice("12,50")).toBe(12.5);
    expect(parseMenuPrice(8)).toBe(8);
  });
  test("rejects empty, zero, negative, absurd and malformed values", () => {
    for (const v of ["", " ", "0", "-3", "abc", "1e3x", "12.345", "100000", null, undefined, NaN]) {
      expect(parseMenuPrice(v as unknown), String(v)).toBeNull();
    }
  });
});

import { parseWhatsappNumber } from "../../src/lib/contact";
import { stepDispatchQueue } from "../../src/lib/dispatch";
import { mobileMoneyProvider, selectWithdrawable } from "../../src/lib/payouts";

test.describe("stepDispatchQueue", () => {
  const now = 1_000_000;
  const online = new Set(["near", "watching", "far"]);
  const watching = new Set(["watching"]);
  const queue = { riderIds: ["near", "watching", "far"], currentIndex: 0, expireAt: now + 45_000 };

  test("gives the course immediately to the rider who has the dashboard open", () => {
    const step = stepDispatchQueue(queue, "watching", {
      now,
      online,
      declined: false,
      present: (id) => watching.has(id),
    });
    expect(step.offer).toBe(true);
    expect(step.currentIndex).toBe(1);
    expect(step.closed).toBe(false);
  });

  test("keeps the course with a rider who is already looking at it", () => {
    const step = stepDispatchQueue(queue, "watching", {
      now,
      online,
      declined: false,
      present: (id) => id === "near" || id === "watching",
    });
    expect(step.offer).toBe(false);
    expect(step.currentIndex).toBe(0);
    expect(step.changed).toBe(false);
  });

  test("returns the course to the rider who currently holds it", () => {
    const step = stepDispatchQueue(queue, "near", {
      now,
      online,
      declined: false,
      present: (id) => id === "near",
    });
    expect(step.offer).toBe(true);
    expect(step.currentIndex).toBe(0);
  });
});
test.describe("selectWithdrawable", () => {
  const delivered = { id: "a", status: "delivered", deliveryFeeUsd: 2.99, riderPaidAt: undefined as number | undefined };
  test("sums unpaid courses and skips ones already in a withdrawal or already paid", () => {
    const second = { id: "b", status: "delivered", deliveryFeeUsd: 2.99 };
    const paid = { id: "c", status: "delivered", deliveryFeeUsd: 2.99, riderPaidAt: 1 };
    const cancelled = { id: "d", status: "cancelled", deliveryFeeUsd: 2.99 };
    const result = selectWithdrawable([delivered, second, paid, cancelled], ["b"]);
    expect(result.orderIds).toEqual(["a"]);
    expect(result.amountUsd).toBe(2.09);
  });
  test("reads the Mobile Money network from the number", () => {
    expect(mobileMoneyProvider("0812345678")?.provider).toBe("mpesa");
    expect(mobileMoneyProvider("+243 97 123 4567")?.provider).toBe("airtel");
    expect(mobileMoneyProvider("0841234567")?.label).toBe("Orange Money");
    expect(mobileMoneyProvider("0901234567")?.provider).toBe("africell");
    expect(mobileMoneyProvider("0712345678")).toBeNull();
  });
});

test.describe("parseWhatsappNumber (NEXT_PUBLIC_SUPPORT_WHATSAPP)", () => {
  test("accepts valid numbers, hides the button otherwise", () => {
    expect(parseWhatsappNumber("+243 81 234 5678")).toBe("243812345678");
    expect(parseWhatsappNumber("00243812345678")).toBe("243812345678");
    expect(parseWhatsappNumber("+33 6 12 34 56 78")).toBe("33612345678");
    for (const v of ["", undefined, null, "+243 81 234 56789", "243000000000", "abc"]) {
      expect(parseWhatsappNumber(v as string), String(v)).toBeNull();
    }
  });
});


test.describe("fee settings", () => {
  test("defaults match the accepted grid and an inactive zone has no fee", () => {
    expect(DEFAULT_FEES).toEqual({ commissionPct: 15, riderSharePct: 80, vatPct: 16 });
    const b = computeBreakdown(10, 2, DEFAULT_FEES);
    expect(b.commissionUsd).toBe(1.5);
    expect(b.riderEarningUsd).toBe(1.6);
    expect(b.deliveryFeeUsd).toBe(2);
    expect(b.vatUsd).toBeCloseTo((12 * 16) / 116, 2);
    expect(zoneFee(DEFAULT_ZONES, "Gombe")).toBe(2);
    expect(zoneFee(DEFAULT_ZONES, "Limete")).toBeNull();
  });
});

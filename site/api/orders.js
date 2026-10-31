/* /api/orders
   GET  → { open, soldOut, square, wait, today }   whether the truck is taking online orders right
                             now, what's sold out today, (when Square is set up) what the
                             page needs to show the card field, and (while open) how many
                             orders are in the queue and about how long a new one takes, and
                             today's spot + closing time when set on the board
   POST → places a pickup order and returns its order number. Every online order is
          paid up front: the card (or Apple Pay / Google Pay) is charged through Square
          first, and the order is saved, shown on the board, alerted and emailed only
          once Square confirms the payment. There is no pay-at-the-truck option online,
          so if Square isn't set up, online ordering stays closed. */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured, cmd } = require("./_lib/store");
const { buildOrder, orderingState, underLimit, saveOrder, getOrder, waitEstimate } = require("./_lib/orders");
const { sendConfirmation, sendAlert } = require("./_lib/email");
const square = require("./_lib/square");
const { reviewToken } = require("./_lib/reviews");

const TIPS = [0, 10, 15, 20]; // percent

// The confirmation screen's "Rate your order" link needs the order's signed review token.
const withReview = (order) => ({ ...order, reviewToken: reviewToken(order) });

module.exports = async function handler(req, res) {
  try {
    if (!configured()) return send(res, 200, { open: false, soldOut: [] });

    if (req.method === "GET") {
      const state = await orderingState();
      const { soldOut, today } = state;
      // No Square, no online orders: every order has to be paid before it comes through.
      const open = state.open && square.squareConfigured();
      // The estimate is a bonus: if it fails, ordering still works without it.
      const wait = open ? await waitEstimate().catch(() => null) : null;
      return send(res, 200, { open, soldOut, square: square.publicConfig(), wait, today });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Please order from eatkravekulture.com." });

    const body = await readJson(req);
    // Hidden field only bots fill in: pretend it worked, save nothing.
    if (body && body.website) return send(res, 200, { ok: true, order: { number: "0000", items: [], total: 0 } });

    const state = await orderingState();
    if (!state.open || !square.squareConfigured()) {
      return send(res, 409, { error: "We're not taking online orders right now. Check Instagram for today's spot and hours.", open: false });
    }
    const { order, error, soldOut, field } = buildOrder(body, state.soldOut, state.today && state.today.closeAt);
    if (error) return send(res, soldOut ? 409 : 400, { error, soldOut, field });

    // Counts only orders that would go through, so fixing a typo never locks anyone out.
    // Card attempts count too, which also slows down anyone testing stolen cards.
    if (!(await underLimit("rl:order:" + clientIp(req), 8, 900))) {
      return send(res, 429, { error: "That's a lot of orders in a few minutes. Please call the truck instead." });
    }

    // Pay first, always. Nothing is saved (so nothing reaches the board, the alerts, the
    // emails or order tracking) unless Square says the payment went through.
    return await payAndSave(res, body, order, state.alertEmail);
  } catch (e) {
    console.error("[orders]", e);
    return send(res, 503, { error: "Online ordering is having trouble. Please order at the window." });
  }
};

async function payAndSave(res, body, order, alertEmail) {
  const token = typeof body.token === "string" ? body.token : "";
  const key = typeof body.payKey === "string" ? body.payKey : "";
  if (!token || token.length > 500) return send(res, 400, { error: "Please enter your card details." });
  if (!/^[A-Za-z0-9-]{16,45}$/.test(key)) return send(res, 400, { error: "Something went wrong. Please refresh the page and try again." });
  const tipPct = Number(body.tip) || 0;
  if (!TIPS.includes(tipPct)) return send(res, 400, { error: "Please pick a tip from the list." });

  // One payment per checkout: the page sends the same payKey if it retries, so a
  // double tap or a dropped connection never makes a second order or a second charge.
  const lock = "paykey:" + key;
  if ((await cmd("SET", lock, "pending", "NX", "EX", 3600)) !== "OK") {
    const number = await cmd("GET", lock);
    const existing = number && number !== "pending" ? await getOrder(number) : null;
    if (existing) return send(res, 201, { ok: true, order: withReview(existing), emailed: false });
    return send(res, 409, { error: "Your payment is still going through. Wait a moment before trying again." });
  }

  const foodCents = Math.round(order.total * 100);
  const tipCents = Math.round((foodCents * tipPct) / 100);
  const result = await square.charge({
    token,
    cents: foodCents + tipCents,
    idempotencyKey: key,
    email: order.email,
    note: "Krave Kulture pickup for " + order.name + ": " + order.items.map((l) => l.qty + "x " + l.name + (l.flavor ? " (" + l.flavor + ")" : "")).join(", "),
  });
  if (result.error) {
    await cmd("DEL", lock);
    return send(res, 402, { error: result.error, declined: Boolean(result.declined) });
  }

  order.tip = tipCents / 100;
  order.paid = { ...result.payment, at: new Date().toISOString() };
  if (square.SANDBOX) order.test = true;

  let saved;
  try {
    saved = await saveOrder(order);
  } catch (e) {
    // Money taken but no order: give it straight back.
    console.error("[orders] save failed after payment " + result.payment.id, e);
    await square.refund(result.payment.id, foodCents + tipCents, "Order could not be saved");
    await cmd("DEL", lock).catch(() => {});
    return send(res, 503, { error: "We couldn't save your order, so we refunded your card right away. Please order at the window." });
  }
  await cmd("SET", lock, saved.number, "EX", 86400);
  const [emailed] = await Promise.all([sendConfirmation(saved), sendAlert(saved, alertEmail)]);
  return send(res, 201, { ok: true, order: withReview(saved), emailed });
}

/* /api/orders
   GET  → { open }   whether the truck is taking online orders right now
   POST → places a pickup order (pay at the truck) and returns its order number */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const { buildOrder, isOrderingOn, underLimit, saveOrder } = require("./_lib/orders");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) return send(res, 200, { open: false });

    if (req.method === "GET") return send(res, 200, { open: await isOrderingOn() });

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Please order from eatkravekulture.com." });

    const body = await readJson(req);
    // Hidden field only bots fill in: pretend it worked, save nothing.
    if (body && body.website) return send(res, 200, { ok: true, order: { number: "0000", items: [], total: 0 } });

    if (!(await isOrderingOn())) {
      return send(res, 409, { error: "We're not taking online orders right now. Check Instagram for today's spot and hours.", open: false });
    }
    const { order, error } = buildOrder(body);
    if (error) return send(res, 400, { error });

    // Counts only orders that would go through, so fixing a typo never locks anyone out.
    if (!(await underLimit("rl:order:" + clientIp(req), 8, 900))) {
      return send(res, 429, { error: "That's a lot of orders in a few minutes. Please call the truck instead." });
    }

    const saved = await saveOrder(order);
    return send(res, 201, { ok: true, order: saved });
  } catch (e) {
    console.error("[orders]", e);
    return send(res, 503, { error: "Online ordering is having trouble. Please order at the window." });
  }
};

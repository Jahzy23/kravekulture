/* /api/track — lets a customer find their own order without the order number.
   POST { name, last4 }        → today's orders under that name whose phone ends in last4
   POST { number, name, last4 } → just that order (the confirmation screen polls this)
   Both need the last 4 digits of the phone used on the order, so nobody can look up
   someone else's order by name alone. */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const { underLimit, findOrders } = require("./_lib/orders");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Forbidden" });
    if (!configured()) return send(res, 503, { error: "Order lookup isn't available right now. Ask at the window." });

    const body = (await readJson(req)) || {};
    const name = String(body.name || "").trim();
    const last4 = String(body.last4 || "").replace(/\D/g, "");
    if (name.length < 2) return send(res, 400, { error: "Type the name you ordered under." });
    if (last4.length !== 4) return send(res, 400, { error: "Type the last 4 digits of the phone number you ordered with." });

    if (!(await underLimit("rl:track:" + clientIp(req), 60, 900))) {
      return send(res, 429, { error: "Too many lookups. Wait a few minutes, or ask at the window." });
    }

    const orders = await findOrders(name, last4, body.number ? String(body.number) : null);
    return send(res, 200, { orders });
  } catch (e) {
    console.error("[track]", e);
    return send(res, 503, { error: "Order lookup is having trouble. Ask at the window." });
  }
};

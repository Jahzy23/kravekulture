/* /api/admin — the order board behind admin.html. Everything but "login" needs the
   admin cookie.
   GET  → { orders, open }
   POST { action: "login", password } | { action: "logout" }
        { action: "complete" | "reopen", number }
        { action: "ordering", open: true | false } */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const auth = require("./_lib/auth");
const { isOrderingOn, setOrdering, underLimit, listOrders, setStatus } = require("./_lib/orders");

module.exports = async function handler(req, res) {
  try {
    if (!auth.passwordConfigured()) return send(res, 503, { error: "Set ADMIN_PASSWORD (8+ characters) in Vercel, then redeploy." });
    if (!configured()) return send(res, 503, { error: "Connect the Upstash Redis store in Vercel, then redeploy." });

    if (req.method === "GET") {
      if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
      const [orders, open] = await Promise.all([listOrders(), isOrderingOn()]);
      return send(res, 200, { orders, open });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Forbidden" });

    const body = (await readJson(req)) || {};

    if (body.action === "login") {
      if (!(await underLimit("rl:login:" + clientIp(req), 10, 900))) {
        return send(res, 429, { error: "Too many tries. Wait 15 minutes and try again." });
      }
      if (!auth.checkPassword(String(body.password || ""))) return send(res, 401, { error: "Wrong password." });
      auth.signIn(req, res);
      return send(res, 200, { ok: true });
    }

    if (body.action === "logout") {
      auth.signOut(req, res);
      return send(res, 200, { ok: true });
    }

    if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });

    if (body.action === "complete" || body.action === "reopen") {
      const order = await setStatus(body.number, body.action === "complete" ? "done" : "new");
      if (!order) return send(res, 404, { error: "Order not found." });
      return send(res, 200, { ok: true, order });
    }

    if (body.action === "ordering") {
      return send(res, 200, { ok: true, open: await setOrdering(Boolean(body.open)) });
    }

    return send(res, 400, { error: "Unknown action." });
  } catch (e) {
    console.error("[admin]", e);
    return send(res, 503, { error: "Storage is having trouble. Try again in a minute." });
  }
};

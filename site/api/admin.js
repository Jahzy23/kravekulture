/* /api/admin — the order board behind admin.html. Everything but "login" needs the
   admin cookie.
   GET  → { orders, open, soldOut, items, alertEmail, emailReady, today }
   POST { action: "login", password } | { action: "logout" }
        { action: "ready" | "complete" | "reopen", number }   ("ready" emails the customer once)
        { action: "ordering", open: true | false }
        { action: "soldout", name, out: true | false } | { action: "soldout-clear" }
        { action: "alertemail", email }   ("" turns alert emails off)
        { action: "today", where, mapUrl, closeAt }   (empty where + no closeAt clears it) */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const auth = require("./_lib/auth");
const { catalog, setToday, orderingState, setOrdering, setSoldOut, clearSoldOut, setAlertEmail, underLimit, listOrders, getOrder, setStatus } = require("./_lib/orders");
const { emailConfigured, sendAlertTest, sendReady } = require("./_lib/email");

// Everything the board can mark sold out, in menu order.
const menuItems = () => Array.from(catalog().values()).map((i) => ({ name: i.name, section: i.section }));

module.exports = async function handler(req, res) {
  try {
    if (!auth.passwordConfigured()) return send(res, 503, { error: "Set ADMIN_PASSWORD (8+ characters) in Vercel, then redeploy." });
    if (!configured()) return send(res, 503, { error: "Connect the Upstash Redis store in Vercel, then redeploy." });

    if (req.method === "GET") {
      if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
      const [orders, state] = await Promise.all([listOrders(), orderingState()]);
      return send(res, 200, { orders, ...state, items: menuItems(), emailReady: emailConfigured() });
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

    if (body.action === "ready") {
      const before = await getOrder(body.number);
      if (!before) return send(res, 404, { error: "Order not found." });
      const emailed = !before.readyEmailedAt && (await sendReady(before));
      const order = await setStatus(body.number, "ready", emailed ? { readyEmailedAt: new Date().toISOString() } : null);
      if (!order) return send(res, 404, { error: "Order not found." });
      return send(res, 200, { ok: true, order, emailed });
    }

    if (body.action === "complete" || body.action === "reopen") {
      const order = await setStatus(body.number, body.action === "complete" ? "done" : "new");
      if (!order) return send(res, 404, { error: "Order not found." });
      return send(res, 200, { ok: true, order });
    }

    if (body.action === "ordering") {
      return send(res, 200, { ok: true, open: await setOrdering(Boolean(body.open)) });
    }

    if (body.action === "soldout") {
      const soldOut = await setSoldOut(String(body.name || ""), Boolean(body.out));
      if (!soldOut) return send(res, 404, { error: "That item isn't on the menu anymore. Refresh the page." });
      return send(res, 200, { ok: true, soldOut });
    }

    if (body.action === "today") {
      const r = await setToday(body);
      if (r.error) return send(res, 400, { error: r.error });
      return send(res, 200, { ok: true, today: r.today });
    }

    if (body.action === "soldout-clear") {
      return send(res, 200, { ok: true, soldOut: await clearSoldOut() });
    }

    if (body.action === "alertemail") {
      const email = await setAlertEmail(body.email);
      if (email === null) return send(res, 400, { error: "That email address doesn't look right." });
      const tested = email ? await sendAlertTest(email) : false;
      return send(res, 200, { ok: true, alertEmail: email, tested });
    }

    return send(res, 400, { error: "Unknown action." });
  } catch (e) {
    console.error("[admin]", e);
    return send(res, 503, { error: "Storage is having trouble. Try again in a minute." });
  }
};

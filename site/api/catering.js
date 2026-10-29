/* /api/catering — catering and event requests.
   POST { name, phone, email?, date, time?, location, guests, type?, notes? }
        → saves the request and emails the truck. Anyone can send one.
   GET  → { requests }                                  admin cookie needed
   POST { action: "handled" | "reopen", id }  → { ok, request }   admin cookie needed */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const auth = require("./_lib/auth");
const { underLimit } = require("./_lib/orders");
const { buildRequest, saveRequest, listRequests, setRequestStatus, sendAlert } = require("./_lib/catering");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
      if (!configured()) return send(res, 503, { error: "Connect the Upstash Redis store in Vercel, then redeploy." });
      return send(res, 200, { requests: await listRequests() });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Please send your request from eatkravekulture.com." });
    if (!configured()) return send(res, 503, { error: "The catering form isn't working right now. Please call or DM us on Instagram." });

    const body = (await readJson(req)) || {};

    if (body.action === "handled" || body.action === "reopen") {
      if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
      const request = await setRequestStatus(body.id, body.action === "handled" ? "done" : "new");
      if (!request) return send(res, 404, { error: "Request not found." });
      return send(res, 200, { ok: true, request });
    }

    // Hidden field only bots fill in: pretend it worked, save nothing.
    if (body.website) return send(res, 201, { ok: true });

    const { request, error } = buildRequest(body);
    if (error) return send(res, 400, { error });

    if (!(await underLimit("rl:catering:" + clientIp(req), 5, 3600))) {
      return send(res, 429, { error: "We already got your request. If something changed, call or DM us." });
    }

    const saved = await saveRequest(request);
    await sendAlert(saved);
    return send(res, 201, { ok: true });
  } catch (e) {
    console.error("[catering]", e);
    return send(res, 503, { error: "The catering form is having trouble. Please call or DM us on Instagram." });
  }
};

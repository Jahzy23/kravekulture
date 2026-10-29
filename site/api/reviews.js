/* /api/reviews — customer reviews.
   GET                       → { rating, count, reviews }   approved reviews, for the menu page
   GET ?all=1                → { reviews }                   every review, admin cookie needed
   POST { action: "check",  number, token | last4 }          → { order, reviewed }
   POST { action: "submit", number, token | last4, stars, text?, name? } → { ok }
   POST { action: "approve" | "hide" | "pending", id }       → { ok, review }   admin cookie needed */
"use strict";

const { send, readJson, clientIp, sameOrigin } = require("./_lib/http");
const { configured } = require("./_lib/store");
const auth = require("./_lib/auth");
const { underLimit } = require("./_lib/orders");
const reviews = require("./_lib/reviews");

const STATUS_FOR = { approve: "approved", hide: "hidden", pending: "pending" };

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const all = /[?&]all=1\b/.test(req.url || "");
      if (all) {
        if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
        if (!configured()) return send(res, 503, { error: "Connect the Upstash Redis store in Vercel, then redeploy." });
        return send(res, 200, { reviews: await reviews.listReviews() });
      }
      if (!configured()) return send(res, 200, { rating: null, count: 0, reviews: [] });
      // Same answer for every visitor: let Vercel's CDN serve it for a few minutes.
      res.setHeader("Vercel-CDN-Cache-Control", "max-age=300, stale-while-revalidate=3600");
      return send(res, 200, await reviews.publicReviews());
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: "Please leave your review on eatkravekulture.com." });
    if (!configured()) return send(res, 503, { error: "Reviews aren't working right now. Tell us at the window!" });

    const body = (await readJson(req)) || {};

    if (STATUS_FOR[body.action]) {
      if (!auth.isSignedIn(req)) return send(res, 401, { error: "Please sign in." });
      const review = await reviews.setReviewStatus(body.id, STATUS_FOR[body.action]);
      if (!review) return send(res, 404, { error: "Review not found." });
      return send(res, 200, { ok: true, review });
    }

    if (body.action !== "check" && body.action !== "submit") return send(res, 400, { error: "Unknown action." });

    // Hidden field only bots fill in: pretend it worked, save nothing.
    if (body.website) return send(res, 201, { ok: true });

    if (!(await underLimit("rl:review:" + clientIp(req), 30, 3600))) {
      return send(res, 429, { error: "Too many tries. Wait a little and try again." });
    }

    const proof = await reviews.proveOrder(body);
    if (proof.error) return send(res, proof.status, { error: proof.error, needPhone: Boolean(proof.needPhone) });
    const order = proof.order;

    if (body.action === "check") {
      return send(res, 200, { order: reviews.orderSummary(order), reviewed: await reviews.hasReview(order) });
    }

    const { review, error } = reviews.buildReview(body, order);
    if (error) return send(res, 400, { error });
    if (!(await reviews.saveReview(review))) return send(res, 409, { error: "You already reviewed this order. Thank you!" });
    return send(res, 201, { ok: true });
  } catch (e) {
    console.error("[reviews]", e);
    return send(res, 503, { error: "Reviews are having trouble. Try again in a minute." });
  }
};

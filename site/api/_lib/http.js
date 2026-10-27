/* Small request/response helpers shared by the API functions. They only use plain
   Node (statusCode/setHeader/end), so they work the same on Vercel and locally. */
"use strict";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

// Vercel parses JSON bodies into req.body; fall back to reading the stream ourselves.
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) return null;
  }
  try { return JSON.parse(raw || "{}"); } catch (e) { return null; }
}

function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || "unknown";
}

// Browsers send Origin on POST. Refuse cross-site posts so another site cannot
// submit orders (or admin actions) on a visitor's behalf.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers["x-forwarded-host"] || new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

module.exports = { send, readJson, clientIp, sameOrigin };

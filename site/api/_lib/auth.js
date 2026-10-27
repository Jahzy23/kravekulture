/* Admin sign-in. The only secret is the ADMIN_PASSWORD env var set in Vercel.
   Signing in sets an HttpOnly cookie holding an expiry time plus an HMAC of it keyed
   by the password, so changing the password signs every device out. */
"use strict";

const crypto = require("crypto");

const COOKIE = "kk_admin";
const SESSION_DAYS = 30;

const password = () => process.env.ADMIN_PASSWORD || "";
const key = () => "kk-admin|" + password();
const sign = (payload) => crypto.createHmac("sha256", key()).update(payload).digest("base64url");

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function passwordConfigured() {
  return password().length >= 8;
}

function checkPassword(attempt) {
  return passwordConfigured() && safeEqual(attempt, password());
}

function readCookie(req) {
  const header = String(req.headers.cookie || "");
  const match = header.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  return match ? match.slice(COOKIE.length + 1) : "";
}

function isSignedIn(req) {
  if (!passwordConfigured()) return false;
  const [exp, sig] = readCookie(req).split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

function cookieFlags(req) {
  // Secure everywhere except plain-http localhost testing.
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(req.headers.host || ""));
  return "; Path=/api; HttpOnly; SameSite=Strict" + (local ? "" : "; Secure");
}

function signIn(req, res) {
  const exp = String(Date.now() + SESSION_DAYS * 864e5);
  res.setHeader("Set-Cookie", COOKIE + "=" + exp + "." + sign(exp) + cookieFlags(req) + "; Max-Age=" + SESSION_DAYS * 86400);
}

function signOut(req, res) {
  res.setHeader("Set-Cookie", COOKIE + "=" + cookieFlags(req) + "; Max-Age=0");
}

module.exports = { passwordConfigured, checkPassword, isSignedIn, signIn, signOut };

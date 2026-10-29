/* Catering requests: checking the form, saving, listing, and the email to the truck.
   Redis layout:
     catering:<id>   JSON of one request, expires after KEEP_DAYS
     catering        sorted set of request ids, scored by time sent
   The alert goes to CATERING_EMAIL (Vercel env) through Resend, with Reply-To set to
   the customer so answering the email reaches them. Without it, requests still show
   on the admin board. */
"use strict";

const crypto = require("crypto");
const { cmd, pipe } = require("./store");

const KEEP_DAYS = 365;
const KEY = process.env.RESEND_API_KEY || "";
const TO = process.env.CATERING_EMAIL || "";
const FROM = process.env.EMAIL_FROM || "Krave Kulture <orders@eatkravekulture.com>";
const SITE = "https://eatkravekulture.com";
const TYPES = ["Birthday", "Wedding", "Graduation", "Corporate", "Church", "Block party", "Other"];

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanNotes = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// "2026-11-14" → "Saturday, November 14, 2026" (dates are plain calendar days, no timezone)
function prettyDate(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Today in Miami, as YYYY-MM-DD, so a request for "today" late in the evening still counts.
function todayMiami() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Turns what the browser sent into a request, or returns { error }.
function buildRequest(body) {
  if (!body || typeof body !== "object") return { error: "Something went wrong. Please try again." };
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 20);
  const email = clean(body.email, 120).toLowerCase();
  const date = clean(body.date, 10);
  const time = clean(body.time, 40);
  const location = clean(body.location, 160);
  const guests = Number(body.guests);
  const type = TYPES.includes(body.type) ? body.type : "";
  const notes = cleanNotes(body.notes, 1000);
  const digits = phone.replace(/\D/g, "");

  if (name.length < 2) return { error: "Please add your name." };
  if (digits.length < 10 || digits.length > 11) return { error: "Please add a phone number we can reach you on (10 digits)." };
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return { error: "That email address doesn't look right. Fix it, or leave it empty." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + "T00:00:00Z"))) return { error: "Please pick the date of your event." };
  const today = todayMiami();
  if (date < today) return { error: "That date has already passed. Please pick an upcoming date." };
  if (date > String(Number(today.slice(0, 4)) + 2) + today.slice(4)) return { error: "Please pick a date within the next two years." };
  if (location.length < 3) return { error: "Please tell us where the event is (an address or the area)." };
  if (!Number.isInteger(guests) || guests < 1 || guests > 5000) return { error: "Please add about how many guests you're expecting." };

  return { request: { name, phone, email: email || undefined, date, time, location, guests, type, notes } };
}

async function saveRequest(request) {
  const now = Date.now();
  const id = now.toString(36) + crypto.randomBytes(3).toString("hex");
  const record = { id, createdAt: new Date(now).toISOString(), status: "new", ...request };
  await pipe([
    ["SET", "catering:" + id, JSON.stringify(record), "EX", KEEP_DAYS * 86400],
    ["ZADD", "catering", now, id],
    ["ZREMRANGEBYSCORE", "catering", "-inf", now - KEEP_DAYS * 864e5],
  ]);
  return record;
}

async function listRequests(limit) {
  const ids = await cmd("ZREVRANGE", "catering", 0, (limit || 300) - 1);
  if (!ids || !ids.length) return [];
  const values = await cmd("MGET", ...ids.map((id) => "catering:" + id));
  const out = [];
  values.forEach((v) => {
    if (!v) return;
    try { out.push(JSON.parse(v)); } catch (e) { /* skip a damaged entry */ }
  });
  return out;
}

async function setRequestStatus(id, status) {
  if (!/^[a-z0-9]{8,20}$/.test(String(id))) return null;
  const key = "catering:" + id;
  const raw = await cmd("GET", key);
  if (!raw) return null;
  const record = JSON.parse(raw);
  record.status = status;
  if (status === "done") record.handledAt = new Date().toISOString();
  else delete record.handledAt;
  await cmd("SET", key, JSON.stringify(record), "KEEPTTL");
  return record;
}

function buildAlert(r) {
  const when = prettyDate(r.date) + (r.time ? ", " + r.time : "");
  const rows = [
    ["Name", r.name],
    ["Phone", r.phone],
    ["Email", r.email || ""],
    ["Date", when],
    ["Where", r.location],
    ["Guests", String(r.guests)],
    ["Event", r.type || ""],
  ].filter((row) => row[1]);
  const text = [
    "New catering request from " + r.name + ".",
    "",
    ...rows.map((row) => row[0] + ": " + row[1]),
    r.notes ? "\nNotes:\n" + r.notes : "",
    "",
    r.email ? "Reply to this email to answer " + r.name + " directly." : "Call or text " + r.name + " to follow up.",
    "All requests: " + SITE + "/admin.html",
  ].filter((l) => l !== "").join("\n");
  const tel = r.phone.replace(/[^\d+]/g, "");
  const html =
    '<!doctype html><html><body style="margin:0;background:#fdfbf5;font-family:Arial,Helvetica,sans-serif;color:#111">' +
    '<div style="max-width:520px;margin:0 auto;padding:24px 16px">' +
    '<div style="background:#1f47cc;color:#fff;padding:14px 20px;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:1px">New catering request</div>' +
    '<div style="background:#fff;border:3px solid #111;border-top:0;padding:18px 20px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:15px">' +
    rows.map((row) =>
      '<tr><td style="padding:7px 12px 7px 0;border-bottom:1px solid #e5e1d6;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:1px;color:#55534e;white-space:nowrap;vertical-align:top">' + esc(row[0]) +
      '</td><td style="padding:7px 0;border-bottom:1px solid #e5e1d6">' +
      (row[0] === "Phone" ? '<a href="tel:' + esc(tel) + '" style="color:#1f47cc">' + esc(row[1]) + "</a>"
        : row[0] === "Email" ? '<a href="mailto:' + esc(row[1]) + '" style="color:#1f47cc">' + esc(row[1]) + "</a>"
        : esc(row[1])) +
      "</td></tr>"
    ).join("") +
    "</table>" +
    (r.notes ? '<p style="margin:16px 0 0;background:#ffc72c;padding:10px 12px;white-space:pre-wrap">' + esc(r.notes) + "</p>" : "") +
    '<p style="margin:18px 0 0;font-size:14px;color:#55534e">' + (r.email ? "Reply to this email to answer " + esc(r.name) + " directly. " : "") +
    '<a href="' + SITE + '/admin.html" style="color:#1f47cc">See all requests</a></p>' +
    "</div></div></body></html>";
  return { subject: "Catering request: " + r.name + ", " + r.guests + " guests, " + prettyDate(r.date), text, html };
}

// Never throws: the request is already saved, the email is a heads-up.
async function sendAlert(r) {
  if (!KEY || !TO) return false;
  const { subject, text, html } = buildAlert(r);
  const payload = { from: FROM, to: TO.split(",").map((s) => s.trim()).filter(Boolean), subject, text, html };
  if (r.email) payload.reply_to = r.email;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[catering email] Resend said", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[catering email]", e && e.message);
    return false;
  }
}

module.exports = { TYPES, buildRequest, saveRequest, listRequests, setRequestStatus, buildAlert, sendAlert, prettyDate };

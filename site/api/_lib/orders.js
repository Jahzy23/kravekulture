/* Orders: pricing from menu-data.js, order numbers, saving and listing.
   Redis layout:
     order:<number>     JSON of one order, expires after KEEP_DAYS
     orders             sorted set of order numbers, scored by time placed
     settings:ordering  "on" | "off" (missing = off) — the admin "Taking orders" switch
     settings:soldout   set of item names marked sold out on the order board
     settings:alertemail  where to email each new order (empty = no alert emails) */
"use strict";

const crypto = require("crypto");
const { cmd, pipe } = require("./store");
const { MENU } = require("../../menu-data.js");

const KEEP_DAYS = 60;
const MAX_QTY = 20; // per line
const MAX_LINES = 25;

// Everything that can be ordered: items with a number price that are not sold out,
// either in menu-data.js or (when soldOut is given) on the order board.
function catalog(soldOut) {
  const items = new Map();
  MENU.forEach((section) => {
    const flavors = section.choices && section.choices.options && section.choices.options.length
      ? section.choices.options.slice()
      : null;
    (section.items || []).forEach((item) => {
      const taggedOut = String(item.tag || "").toLowerCase() === "sold out";
      if (typeof item.price !== "number" || taggedOut || (soldOut && soldOut.includes(item.name))) return;
      items.set(item.name, { name: item.name, section: section.title, price: item.price, flavors });
    });
  });
  return items;
}

// Items marked sold out on the order board, limited to names still on the menu so a
// renamed or removed item never lingers.
async function getSoldOut() {
  const names = (await cmd("SMEMBERS", "settings:soldout")) || [];
  const menu = catalog();
  return names.filter((n) => menu.has(n));
}

async function setSoldOut(name, out) {
  if (!catalog().has(name)) return null;
  await cmd(out ? "SADD" : "SREM", "settings:soldout", name);
  return getSoldOut();
}

async function clearSoldOut() {
  await cmd("DEL", "settings:soldout");
  return [];
}

// The ordering switch, the sold-out list and the alert address in one round trip.
// alertEmail is private: never send it to customers.
async function orderingState() {
  const [on, names, alertEmail] = await pipe([["GET", "settings:ordering"], ["SMEMBERS", "settings:soldout"], ["GET", "settings:alertemail"]]);
  const menu = catalog();
  return { open: on === "on", soldOut: (names || []).filter((n) => menu.has(n)), alertEmail: alertEmail || "" };
}

async function getAlertEmail() {
  return (await cmd("GET", "settings:alertemail")) || "";
}

async function setAlertEmail(email) {
  const addr = String(email || "").trim().toLowerCase().slice(0, 120);
  if (addr && !/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/.test(addr)) return null;
  if (addr) await cmd("SET", "settings:alertemail", addr);
  else await cmd("DEL", "settings:alertemail");
  return addr;
}

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// Turns what the browser sent into a priced order, or returns { error }.
// Prices always come from menu-data.js, never from the browser.
function buildOrder(body, soldOut) {
  if (!body || typeof body !== "object") return { error: "Something went wrong. Please try again." };
  const name = clean(body.name, 60);
  const phone = clean(body.phone, 20);
  const email = clean(body.email, 120).toLowerCase();
  const notes = clean(body.notes, 300);
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2) return { error: "Please add your name so we can call it out at the window." };
  if (digits.length < 10 || digits.length > 11) return { error: "Please add a phone number we can reach you on (10 digits)." };
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return { error: "That email address doesn't look right. Fix it, or leave it empty." };
  if (!Array.isArray(body.items) || !body.items.length) return { error: "Your order is empty." };
  if (body.items.length > MAX_LINES) return { error: "That's a big order! Please call the truck for catering." };

  const menu = catalog();
  const lines = new Map();
  for (const raw of body.items) {
    if (raw && soldOut && soldOut.includes(raw.name)) {
      return { error: "Sorry, the " + raw.name + " just sold out. Take it off your order to keep going.", soldOut };
    }
    const item = menu.get(raw && raw.name);
    if (!item) return { error: "Something on your order is no longer on the menu. Please refresh the page." };
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: "Please pick between 1 and " + MAX_QTY + " of each item." };
    let flavor = null;
    if (item.flavors) {
      flavor = item.flavors.includes(raw.flavor) ? raw.flavor : null;
      if (!flavor) return { error: "Please pick a flavor for your " + item.section.toLowerCase() + "." };
    }
    const key = item.name + "|" + (flavor || "");
    const prev = lines.get(key);
    const total = (prev ? prev.qty : 0) + qty;
    if (total > MAX_QTY) return { error: "Please pick between 1 and " + MAX_QTY + " of each item." };
    lines.set(key, { name: item.name, flavor, qty: total, price: item.price });
  }

  const items = Array.from(lines.values()).map((l) => ({ ...l, lineTotal: l.price * l.qty }));
  const total = items.reduce((sum, l) => sum + l.lineTotal, 0);
  return { order: { name, phone, email: email || undefined, notes, items, total } };
}

async function isOrderingOn() {
  return (await cmd("GET", "settings:ordering")) === "on";
}

async function setOrdering(on) {
  await cmd("SET", "settings:ordering", on ? "on" : "off");
  return on;
}

// Fixed-window limiter: true while this key has made fewer than `max` hits in `seconds`.
async function underLimit(key, max, seconds) {
  const [count] = await pipe([["INCR", key], ["EXPIRE", key, seconds, "NX"]]);
  return count <= max;
}

// Saves the order under a random 4-digit number (5 digits if 4 keep colliding),
// short and easy to say at the window.
async function saveOrder(order) {
  const now = Date.now();
  for (let attempt = 0; attempt < 30; attempt++) {
    const number = attempt < 20 ? String(crypto.randomInt(1000, 10000)) : String(crypto.randomInt(10000, 100000));
    const record = { number, createdAt: new Date(now).toISOString(), status: "new", ...order };
    const ok = await cmd("SET", "order:" + number, JSON.stringify(record), "NX", "EX", KEEP_DAYS * 86400);
    if (ok === "OK") {
      await pipe([
        ["ZADD", "orders", now, number],
        ["ZREMRANGEBYSCORE", "orders", "-inf", now - KEEP_DAYS * 864e5],
      ]);
      return record;
    }
  }
  throw new Error("Could not find a free order number");
}

async function listOrders(limit) {
  const numbers = await cmd("ZREVRANGE", "orders", 0, (limit || 300) - 1);
  if (!numbers || !numbers.length) return [];
  const values = await cmd("MGET", ...numbers.map((n) => "order:" + n));
  const orders = [];
  values.forEach((v) => {
    if (!v) return;
    try { orders.push(JSON.parse(v)); } catch (e) { /* skip a damaged entry */ }
  });
  return orders;
}

// Customer lookup: orders from the last LOOKUP_HOURS placed under this name (first name
// is enough) with a phone ending in last4. Returns only what the customer already knows.
const LOOKUP_HOURS = 36;
const normName = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

function nameMatches(stored, typed) {
  const a = normName(stored);
  const b = normName(typed);
  if (!a || !b) return false;
  return a === b || a.split(" ")[0] === b.split(" ")[0];
}

async function findOrders(name, last4, number) {
  const since = Date.now() - LOOKUP_HOURS * 3600e3;
  return (await listOrders(300))
    .filter((o) => Date.parse(o.createdAt) >= since)
    .filter((o) => !number || o.number === number)
    .filter((o) => String(o.phone || "").replace(/\D/g, "").endsWith(last4) && nameMatches(o.name, name))
    .map((o) => ({
      number: o.number,
      status: o.status,
      createdAt: o.createdAt,
      readyAt: o.readyAt || null,
      completedAt: o.completedAt || null,
      name: o.name,
      items: o.items,
      total: o.total,
      tip: o.tip || 0,
      paid: Boolean(o.paid),
    }));
}

// Wait estimate for a new order: orders not yet marked done, placed in the last
// WAIT_WINDOW_HOURS (so a forgotten order from yesterday never inflates it).
// About BASE_MINUTES to cook any order, plus PER_ORDER_MINUTES for each one ahead.
const WAIT_WINDOW_HOURS = 4;
const BASE_MINUTES = 10;
const PER_ORDER_MINUTES = 4;
const MAX_MINUTES = 90;

async function waitEstimate() {
  const now = Date.now();
  const numbers = await cmd("ZRANGEBYSCORE", "orders", now - WAIT_WINDOW_HOURS * 3600e3, "+inf");
  let ahead = 0;
  if (numbers && numbers.length) {
    const values = await cmd("MGET", ...numbers.map((n) => "order:" + n));
    values.forEach((v) => {
      if (!v) return;
      try { if (JSON.parse(v).status !== "done") ahead += 1; } catch (e) { /* skip a damaged entry */ }
    });
  }
  // Rounded up to 5 minutes: "about 25" reads better than "about 22".
  const minutes = Math.ceil((BASE_MINUTES + PER_ORDER_MINUTES * ahead) / 5) * 5;
  return { ahead, minutes: Math.min(MAX_MINUTES, minutes) };
}

async function getOrder(number) {
  if (!/^\d{4,5}$/.test(String(number))) return null;
  const raw = await cmd("GET", "order:" + number);
  return raw ? JSON.parse(raw) : null;
}

// status: "new" (cooking) → "ready" (customer told to come get it) → "done" (picked up).
// Reopening goes back to "new". readyEmailedAt marks a sent "ready" email, so a second
// tap never emails twice.
async function setStatus(number, status, extra) {
  if (!/^\d{4,5}$/.test(String(number))) return null;
  const key = "order:" + number;
  const raw = await cmd("GET", key);
  if (!raw) return null;
  const order = JSON.parse(raw);
  order.status = status;
  if (status === "ready") order.readyAt = order.readyAt || new Date().toISOString();
  if (status === "done") order.completedAt = new Date().toISOString();
  else delete order.completedAt;
  if (status === "new") delete order.readyAt;
  Object.assign(order, extra || {});
  await cmd("SET", key, JSON.stringify(order), "KEEPTTL");
  return order;
}

module.exports = { catalog, buildOrder, isOrderingOn, setOrdering, orderingState, getSoldOut, setSoldOut, clearSoldOut, getAlertEmail, setAlertEmail, underLimit, saveOrder, getOrder, listOrders, findOrders, setStatus, waitEstimate };

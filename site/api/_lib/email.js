/* Order confirmation email, sent through Resend's REST API with plain fetch.
   Needs RESEND_API_KEY (a send-only key for eatkravekulture.com) in Vercel. Never
   throws: if email is not set up or Resend is down, the order still goes through. */
"use strict";

const { LOCATION, SPOT, spotIsFresh } = require("../../menu-data.js");
const { reviewToken } = require("./reviews");

const KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "Krave Kulture <orders@eatkravekulture.com>";
const SITE = "https://eatkravekulture.com";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "$" + (Number.isInteger(n) ? n : Number(n).toFixed(2));
const lineLabel = (l) => l.qty + " × " + l.name + (l.flavor ? " (" + l.flavor + ")" : "");

// VISA → Visa, MASTERCARD → Mastercard, AMERICAN_EXPRESS → American Express
const cardName = (brand) => String(brand).toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function emailConfigured() {
  return Boolean(KEY);
}

function build(order) {
  const spot = spotIsFresh(SPOT) ? SPOT.where + (SPOT.when ? ", " + SPOT.when : "") : "";
  const phone = LOCATION.phone || "";
  const token = reviewToken(order);
  const reviewUrl = SITE + "/review.html?o=" + order.number + (token ? "&t=" + token : "");
  const paid = order.paid;
  const charged = order.total + (order.tip || 0);
  const how = paid
    ? "It's paid. Show this number at the window and grab your food."
    : "Show this number at the window and pay at the truck when you pick up.";
  const totalLabel = paid ? "Paid" + (paid.brand && paid.last4 ? " with " + cardName(paid.brand) + " ending " + paid.last4 : "") : "Total, pay at the truck";
  const text = [
    "Thanks, " + order.name + "! Your Krave Kulture order is in.",
    "",
    "Order number: #" + order.number,
    how,
    "",
    ...order.items.map((l) => lineLabel(l) + "  " + money(l.lineTotal)),
    order.tip ? "Tip  " + money(order.tip) : "",
    totalLabel + ": " + money(charged),
    paid && paid.receiptUrl ? "Card receipt: " + paid.receiptUrl : "",
    order.notes ? "\nYour note: " + order.notes : "",
    spot ? "\nPick up at: " + spot : "",
    "",
    "Lost this email? Find your order at " + SITE + "/track.html with your name and the last 4 digits of your phone.",
    phone ? "Need to change something? Call the truck: " + phone : "",
    "\nAfter you eat, tell us how it was: " + reviewUrl,
    "",
    "Krave it. Taste it. Live the Kulture.",
  ].filter((l) => l !== "").join("\n");

  const rows = order.items.map((l) =>
    '<tr><td style="padding:8px 0;border-bottom:1px solid #e5e1d6;font-weight:700;text-transform:uppercase">' + esc(lineLabel(l)) +
    '</td><td style="padding:8px 0;border-bottom:1px solid #e5e1d6;text-align:right">' + esc(money(l.lineTotal)) + "</td></tr>"
  ).join("") + (order.tip
    ? '<tr><td style="padding:8px 0;border-bottom:1px solid #e5e1d6;font-weight:700;text-transform:uppercase">Tip, thank you!</td><td style="padding:8px 0;border-bottom:1px solid #e5e1d6;text-align:right">' + esc(money(order.tip)) + "</td></tr>"
    : "");

  const html =
    '<!doctype html><html><body style="margin:0;background:#fdfbf5;font-family:Arial,Helvetica,sans-serif;color:#111">' +
    '<div style="max-width:520px;margin:0 auto;padding:24px 16px">' +
    '<div style="background:#d92b1f;padding:16px 20px;text-align:center">' +
    '<img src="' + SITE + '/images/email/logo.png" width="80" height="80" alt="Krave Kulture" style="display:block;margin:0 auto;border:0;width:80px;height:80px">' +
    "</div>" +
    '<div style="background:#fff;border:3px solid #111;border-top:0;padding:22px 20px">' +
    '<p style="margin:0 0 6px;font-size:16px">Thanks, ' + esc(order.name) + "! Your order is in.</p>" +
    '<p style="margin:14px 0 2px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#55534e">Order number</p>' +
    '<p style="margin:0 0 12px;font-size:56px;line-height:1;font-weight:900;color:#d92b1f">#' + esc(order.number) + "</p>" +
    '<p style="margin:0 0 16px;font-size:16px">' + (paid ? "<b>It's paid.</b> Show this number at the window and grab your food." : "Show this number at the window. <b>Pay at the truck</b> when you pick up.") + "</p>" +
    '<table style="width:100%;border-collapse:collapse;border-top:3px solid #111;font-size:15px">' + rows +
    '<tr><td style="padding:12px 0 0;font-weight:700;text-transform:uppercase">' + esc(totalLabel) + '</td><td style="padding:12px 0 0;text-align:right;font-size:20px;font-weight:900">' + esc(money(charged)) + "</td></tr></table>" +
    (paid && paid.receiptUrl ? '<p style="margin:10px 0 0;font-size:14px"><a href="' + esc(paid.receiptUrl) + '" style="color:#1f47cc">View your card receipt</a></p>' : "") +
    (order.notes ? '<p style="margin:16px 0 0;background:#ffc72c;padding:8px 10px;font-weight:700">Your note: ' + esc(order.notes) + "</p>" : "") +
    (spot ? '<p style="margin:16px 0 0;font-size:15px"><b>Pick up at:</b> ' + esc(spot) + "</p>" : "") +
    '<p style="margin:20px 0 0;font-size:14px;color:#55534e">Lost this email? <a href="' + SITE + '/track.html" style="color:#1f47cc">Find your order</a> with your name and the last 4 digits of your phone.' +
    (phone ? ' Need to change something? <a href="tel:' + esc(phone.replace(/[^\d+]/g, "")) + '" style="color:#1f47cc">Call the truck</a>.' : "") + "</p>" +
    '<p style="margin:16px 0 0;font-size:15px"><b>After you eat,</b> tell us how it was. <a href="' + esc(reviewUrl) + '" style="color:#d92b1f;font-weight:700">Rate your order</a></p>' +
    "</div>" +
    '<p style="margin:14px 0 0;font-size:12px;color:#55534e;text-align:center">Krave it. Taste it. Live the Kulture. · <a href="' + SITE + '" style="color:#55534e">eatkravekulture.com</a></p>' +
    "</div></body></html>";

  return { subject: "Your Krave Kulture order #" + order.number, text, html };
}

async function sendConfirmation(order) {
  if (!KEY || !order.email) return false;
  const { subject, text, html } = build(order);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [order.email], subject, text, html }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[email] Resend said", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email]", e && e.message);
    return false;
  }
}

module.exports = { emailConfigured, sendConfirmation, build };

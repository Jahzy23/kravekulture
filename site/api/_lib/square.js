/* Card payments through Square's Payments API, with plain fetch (no npm packages).
   The browser turns the card into a one-time token with Square's Web Payments SDK;
   only that token reaches this server, never the card number.
   Needs, in Vercel:
     SQUARE_APPLICATION_ID   public, the browser uses it to show the card field
     SQUARE_LOCATION_ID      public, which Square location the money goes to
     SQUARE_ACCESS_TOKEN     secret, mark it Sensitive
     SQUARE_ENVIRONMENT      "sandbox" (test cards, no real money) or "production"
   With any of them missing, online payment is off and orders are pay at the truck. */
"use strict";

const APP_ID = process.env.SQUARE_APPLICATION_ID || "";
const LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";
const TOKEN = process.env.SQUARE_ACCESS_TOKEN || "";
const SANDBOX = String(process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() !== "production";
const API = SANDBOX ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
const VERSION = "2025-01-23";

function squareConfigured() {
  return Boolean(APP_ID && LOCATION_ID && TOKEN);
}

// What the order page needs to load the card field. Nothing secret.
function publicConfig() {
  if (!squareConfigured()) return null;
  return { appId: APP_ID, locationId: LOCATION_ID, sandbox: SANDBOX };
}

async function call(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + TOKEN,
      "Content-Type": "application/json",
      "Square-Version": VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Square's card error codes → what we tell the customer.
const DECLINES = {
  CARD_DECLINED: "Your card was declined. Try another card.",
  GENERIC_DECLINE: "Your card was declined. Try another card.",
  INSUFFICIENT_FUNDS: "Your card was declined for insufficient funds. Try another card.",
  CVV_FAILURE: "The security code (CVV) didn't match. Check it and try again.",
  VERIFY_CVV_FAILURE: "The security code (CVV) didn't match. Check it and try again.",
  ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card. Check it and try again.",
  VERIFY_AVS_FAILURE: "The ZIP code didn't match your card. Check it and try again.",
  INVALID_POSTAL_CODE: "The ZIP code didn't match your card. Check it and try again.",
  INVALID_EXPIRATION: "The expiration date isn't right. Check it and try again.",
  CARD_EXPIRED: "That card has expired. Try another card.",
  INVALID_CARD: "That card number isn't valid. Check it, or try another card.",
  CARD_NOT_SUPPORTED: "That kind of card isn't supported. Try another card.",
  TRANSACTION_LIMIT: "Your bank declined this amount. Try another card.",
  INVALID_ACCOUNT: "Your card was declined. Try another card.",
  CARD_DECLINED_VERIFICATION_REQUIRED: "Your bank needs to verify this payment. Try another card.",
};

// Charges `cents` to the card token. Resolves to { payment } once Square says the
// money is captured (status COMPLETED), or { error, declined } otherwise.
// The same idempotencyKey always gives back the same payment, so a retry never charges twice.
async function charge({ token, cents, idempotencyKey, note, email }) {
  const { ok, status, data } = await call("/v2/payments", {
    source_id: token,
    idempotency_key: idempotencyKey,
    amount_money: { amount: cents, currency: "USD" },
    location_id: LOCATION_ID,
    autocomplete: true,
    note: String(note || "").slice(0, 500),
    buyer_email_address: email || undefined,
  });
  const payment = data && data.payment;
  if (ok && payment && payment.status === "COMPLETED") {
    const card = (payment.card_details && payment.card_details.card) || {};
    return {
      payment: {
        id: payment.id,
        amount: payment.amount_money.amount / 100,
        brand: card.card_brand || null,
        last4: card.last_4 || null,
        receiptUrl: payment.receipt_url || null,
      },
    };
  }
  const first = (data && data.errors && data.errors[0]) || {};
  if (DECLINES[first.code]) return { error: DECLINES[first.code], declined: true };
  console.error("[square] payment failed", status, JSON.stringify(data && data.errors).slice(0, 500));
  return { error: "We couldn't take the payment. You were not charged. Please try again, or pick pay at the truck." };
}

// Gives the money back, used if the order can't be saved after the card was charged.
async function refund(paymentId, cents, reason) {
  try {
    const { ok, data } = await call("/v2/refunds", {
      idempotency_key: "refund-" + paymentId,
      payment_id: paymentId,
      amount_money: { amount: cents, currency: "USD" },
      reason: String(reason || "").slice(0, 192),
    });
    if (!ok) console.error("[square] refund failed", JSON.stringify(data && data.errors).slice(0, 500));
    return ok;
  } catch (e) {
    console.error("[square] refund failed", e && e.message);
    return false;
  }
}

module.exports = { squareConfigured, publicConfig, charge, refund, SANDBOX };

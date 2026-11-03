/* Checks a set of Square credentials before they go into Vercel: that the access token
   works, that the location belongs to that same account and can take cards, and that
   the application ID matches the environment. Read-only, charges nothing.

   SQUARE_ACCESS_TOKEN=... SQUARE_LOCATION_ID=... SQUARE_APPLICATION_ID=... \
   SQUARE_ENVIRONMENT=production node check-square.js

   Leave SQUARE_LOCATION_ID out to list every location on the account and pick one. */
"use strict";

const env = (name) => String(process.env[name] || "").trim();
const TOKEN = env("SQUARE_ACCESS_TOKEN");
const LOCATION_ID = env("SQUARE_LOCATION_ID");
const APP_ID = env("SQUARE_APPLICATION_ID");
const ENVIRONMENT = (env("SQUARE_ENVIRONMENT") || "sandbox").toLowerCase();
const SANDBOX = ENVIRONMENT !== "production";
const API = SANDBOX ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

let problems = 0;
const ok = (msg) => console.log("  ok   " + msg);
const bad = (msg) => { problems++; console.log("  FAIL " + msg); };

async function get(path) {
  const res = await fetch(API + path, {
    headers: { Authorization: "Bearer " + TOKEN, "Square-Version": "2025-01-23" },
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function describe(loc) {
  const cards = (loc.capabilities || []).includes("CREDIT_CARD_PROCESSING");
  return `${loc.id}  "${loc.name}"  ${loc.status}  ${loc.currency}  cards: ${cards ? "yes" : "NO"}`;
}

(async () => {
  console.log(`Square ${SANDBOX ? "SANDBOX (test cards, no real money)" : "PRODUCTION (real money)"}\n`);
  if (ENVIRONMENT !== "sandbox" && ENVIRONMENT !== "production") bad(`SQUARE_ENVIRONMENT is "${ENVIRONMENT}", use "sandbox" or "production"`);

  if (!APP_ID) bad("SQUARE_APPLICATION_ID is empty");
  else if (APP_ID.startsWith("sandbox-") !== SANDBOX) bad(`SQUARE_APPLICATION_ID looks like a ${SANDBOX ? "production" : "sandbox"} ID, but the environment is ${ENVIRONMENT}`);
  else ok(`application ID ${APP_ID} matches ${ENVIRONMENT}`);

  if (!TOKEN) { bad("SQUARE_ACCESS_TOKEN is empty"); return finish(); }

  const merchant = await get("/v2/merchants/me");
  if (!merchant.ok) {
    bad(`access token rejected (${merchant.status}). Wrong token, or a ${SANDBOX ? "production" : "sandbox"} token used against ${ENVIRONMENT}`);
    return finish();
  }
  const m = merchant.data.merchant || {};
  ok(`access token works: account "${m.business_name}" (${m.id}), ${m.country}, ${m.currency}`);
  if (m.currency && m.currency !== "USD") bad(`account currency is ${m.currency}; the site charges USD`);

  const all = await get("/v2/locations");
  const locations = (all.data && all.data.locations) || [];

  if (!LOCATION_ID) {
    bad("SQUARE_LOCATION_ID is empty. Locations on this account:");
    locations.forEach((l) => console.log("         " + describe(l)));
    return finish();
  }

  const loc = locations.find((l) => l.id === LOCATION_ID);
  if (!loc) {
    bad(`location ${LOCATION_ID} is not on this account. Locations on this account:`);
    locations.forEach((l) => console.log("         " + describe(l)));
    return finish();
  }
  if (loc.status !== "ACTIVE") bad(`location "${loc.name}" is ${loc.status}`);
  else if (!(loc.capabilities || []).includes("CREDIT_CARD_PROCESSING")) bad(`location "${loc.name}" can't process cards yet (finish account verification in Square)`);
  else ok(`location ${describe(loc)}`);

  finish();
})().catch((e) => { bad("couldn't reach Square: " + ((e && e.cause && e.cause.message) || (e && e.message))); finish(); });

function finish() {
  console.log(problems
    ? `\n${problems} problem(s). Fix them before putting these values in Vercel.`
    : "\nAll good. Put these four values in Vercel and redeploy.");
  process.exitCode = problems ? 1 : 0;
}

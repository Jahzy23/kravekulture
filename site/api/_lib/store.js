/* Tiny Redis client for the order API. Talks to Upstash Redis over its REST API with
   plain fetch, so the site needs no npm packages. Vercel's Upstash integration sets
   KV_REST_API_URL + KV_REST_API_TOKEN (older setups: UPSTASH_REDIS_REST_URL/_TOKEN). */
"use strict";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

function configured() {
  return Boolean(URL_ && TOKEN);
}

class StoreError extends Error {}

async function call(path, body) {
  if (!configured()) throw new StoreError("Order storage is not set up");
  const res = await fetch(URL_.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new StoreError("Storage request failed (" + res.status + ")");
  return data;
}

// One command: cmd("SET", "k", "v") → result
async function cmd(...args) {
  const data = await call("/", args.map(String));
  if (data.error) throw new StoreError(data.error);
  return data.result;
}

// Several commands in one round trip: pipe([["GET","a"],["GET","b"]]) → [resultA, resultB]
async function pipe(commands) {
  if (!commands.length) return [];
  const data = await call("/pipeline", commands.map((c) => c.map(String)));
  return data.map((d) => {
    if (d.error) throw new StoreError(d.error);
    return d.result;
  });
}

module.exports = { configured, cmd, pipe, StoreError };

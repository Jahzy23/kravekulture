/* Krave Kulture — rate your order (review.html). The confirmation screen and email link
   here with ?o=<order number>&t=<signed token>; without the token the customer types the
   order number and the last 4 digits of their phone. Posts to /api/reviews. */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, children) => {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  };

  const params = new URLSearchParams(location.search);
  // Who is reviewing: { number, token } from the link, or { number, last4 } typed in.
  let proof = { number: (params.get("o") || "").replace(/\D/g, ""), token: params.get("t") || "" };

  async function api(body) {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  function showError(box, msg) {
    box.textContent = msg || "";
    box.hidden = !msg;
  }

  function step(name) {
    $("[data-loading]").hidden = name !== "loading";
    $("[data-find-form]").hidden = name !== "find";
    $("[data-review-form]").hidden = name !== "review";
    $("[data-review-done]").hidden = name !== "done";
  }

  function done(title, text) {
    $("[data-done-title]").textContent = title;
    $("[data-done-text]").textContent = text;
    step("done");
    $("[data-review-done]").focus();
  }

  async function check() {
    step("loading");
    let r;
    try {
      r = await api({ action: "check", ...proof });
    } catch (e) {
      r = { status: 0, data: { error: "We couldn't reach the truck. Check your connection and try again." } };
    }
    if (r.status === 200) {
      if (r.data.reviewed) return done("Already reviewed", "You already reviewed order #" + r.data.order.number + ". Thank you!");
      const o = r.data.order;
      const box = $("[data-review-order]");
      box.textContent = "";
      box.appendChild(el("p", { class: "label", text: "Order #" + o.number }));
      box.appendChild(el("p", { class: "review-order-items", text: o.items.join(", ") }));
      const form = $("[data-review-form]");
      if (!form.name.value) form.name.value = o.name;
      step("review");
      return;
    }
    // A bad or old link falls back to typing the order number and phone digits.
    const form = $("[data-find-form]");
    if (proof.number) form.number.value = proof.number;
    proof = { number: proof.number };
    step("find");
    showError($("[data-find-error]"), r.data.error || "Something went wrong. Try again.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));

    $("[data-find-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const number = form.number.value.replace(/\D/g, "");
      const last4 = form.last4.value.replace(/\D/g, "");
      const err = $("[data-find-error]");
      if (number.length < 4) { form.number.focus(); return showError(err, "Type your order number. It's on your receipt screen and in your email."); }
      if (last4.length !== 4) { form.last4.focus(); return showError(err, "Type the last 4 digits of the phone you ordered with."); }
      showError(err, "");
      proof = { number, last4 };
      check();
    });

    $("[data-review-form]").addEventListener("change", (e) => {
      if (e.target.name === "stars") showError($("[data-review-error]"), "");
    });

    $("[data-review-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const err = $("[data-review-error]");
      const picked = form.querySelector('input[name="stars"]:checked');
      if (!picked) return showError(err, "Tap the stars to rate your order.");
      const stars = Number(picked.value);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      showError(err, "");
      let r;
      try {
        r = await api({
          action: "submit", ...proof, stars,
          text: form.text.value, name: form.name.value.trim(), website: form.website.value,
        });
      } catch (x) {
        r = { status: 0, data: { error: "We couldn't reach the truck. Check your connection and try again." } };
      }
      btn.disabled = false;
      if (r.status === 201) {
        const google = typeof REVIEWS !== "undefined" && /^https:\/\//.test(REVIEWS.googleUrl || "") ? REVIEWS.googleUrl : "";
        if (google && stars >= 4) {
          $("[data-google-link]").href = google;
          $("[data-google]").hidden = false;
        }
        return done("Thank you!", stars >= 4
          ? "Your review is in. It shows on our menu page once the truck checks it."
          : "Your review is in. Thanks for being straight with us. We read every one and we'll do better.");
      }
      if (r.status === 409) return done("Already reviewed", r.data.error);
      showError(err, r.data.error || "Something went wrong. Try again.");
    });

    if (proof.number && proof.token) check();
    else {
      if (proof.number) $("[data-find-form]").number.value = proof.number;
      step("find");
    }
  });
})();

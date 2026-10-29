/* Krave Kulture — checkout demo. A clickable mockup of paying online at checkout.
   Nothing is sent anywhere and no card is charged; the card box stands in for the
   processor's embedded field (Stripe Payment Element or Square Web Payments). */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const money = (n) => "$" + n.toFixed(2);
  const TAX = 0.07; // Miami-Dade sales tax

  const price = (name) => {
    for (const s of typeof MENU !== "undefined" ? MENU : []) {
      const hit = (s.items || []).find((i) => i.name === name);
      if (hit && typeof hit.price === "number") return hit.price;
    }
    return 0;
  };
  const cart = [
    { name: "Griot Dinner", qty: 1 },
    { name: "6 Pieces", flavor: "Honey Hot", qty: 1, label: "6 Pc Wings" },
    { name: "Kravelade", qty: 2 },
  ].map((l) => Object.assign(l, { price: price(l.name) }));

  let tipRate = 0;
  let pickup = "asap";

  const subtotal = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
  const totals = () => {
    const sub = subtotal();
    const tax = Math.round(sub * TAX * 100) / 100;
    const tip = Math.round(sub * tipRate * 100) / 100;
    return { sub, tax, tip, total: sub + tax + tip };
  };
  const label = (l) => (l.label || l.name) + (l.flavor ? " (" + l.flavor + ")" : "");

  function renderCart() {
    const list = $("[data-cart]");
    list.textContent = "";
    cart.forEach((l, i) => {
      const li = document.createElement("li");
      li.className = "cart-line";
      li.innerHTML = '<span class="cart-name"></span><span class="qty"><button type="button" data-i="' + i + '" data-d="-1">−</button><b></b><button type="button" data-i="' + i + '" data-d="1">+</button></span><span class="cart-price"></span>';
      $(".cart-name", li).textContent = label(l);
      $(".qty b", li).textContent = l.qty;
      $(".cart-price", li).textContent = money(l.price * l.qty);
      list.appendChild(li);
    });
    renderSums();
  }

  function renderSums() {
    const t = totals();
    const rows = [["Subtotal", t.sub], ["Tax (7%)", t.tax]];
    if (t.tip) rows.push(["Tip", t.tip]);
    $$("[data-sums]").forEach((dl) => {
      dl.textContent = "";
      rows.concat([["Total", t.total]]).forEach(([k, v], i, all) => {
        const wrap = document.createElement("div");
        if (i === all.length - 1) wrap.className = "sum-total";
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = money(v);
        wrap.append(dt, dd);
        dl.appendChild(wrap);
      });
    });
    $("[data-pay-total]").textContent = money(t.total);
    const items = $("[data-confirm-items]");
    items.textContent = "";
    cart.forEach((l) => {
      const li = document.createElement("li");
      li.innerHTML = "<span></span><span></span>";
      li.firstChild.textContent = l.qty + " × " + label(l);
      li.lastChild.textContent = money(l.price * l.qty);
      items.appendChild(li);
    });
  }

  const clock = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  function slots() {
    const d = new Date();
    d.setMinutes(Math.ceil((d.getMinutes() + 30) / 15) * 15, 0, 0);
    return [0, 1, 2, 3].map((k) => new Date(d.getTime() + k * 15 * 60e3));
  }

  function chips(host, options, current, onPick) {
    host.textContent = "";
    options.forEach(([value, text]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = text;
      b.setAttribute("aria-pressed", String(value === current));
      b.addEventListener("click", () => {
        $$(".chip", host).forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        onPick(value);
      });
      host.appendChild(b);
    });
  }

  function readyAt() {
    if (pickup !== "asap") return pickup;
    return clock(new Date(Date.now() + 20 * 60e3));
  }

  function go(step) {
    step = Math.min(4, Math.max(1, Number(step) || 1));
    $$("[data-step]").forEach((s) => (s.hidden = s.getAttribute("data-step") !== String(step)));
    $$("[data-step-dot]").forEach((d) => {
      const n = Number(d.getAttribute("data-step-dot"));
      d.dataset.state = n < step ? "done" : n === step ? "now" : "next";
      if (n === step) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
    });
    if (step === 4) {
      $("[data-ready]").textContent = readyAt();
      $("[data-email-echo]").textContent = $("#d-email").value || "your email";
    }
    window.scrollTo(0, 0);
  }

  function pay() {
    const err = $("[data-pay-error]");
    const digits = $("[data-cardnum]").value.replace(/\D/g, "");
    if (digits === "4000000000000002") {
      err.textContent = "Your card was declined. Try another card or Apple Pay.";
      err.hidden = false;
      return;
    }
    if (digits.length < 15) {
      err.textContent = "Your card number is incomplete.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const btn = $("button.btn[data-pay]");
    btn.disabled = true;
    btn.textContent = "Processing…";
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = 'Pay <span data-pay-total></span>';
      renderSums();
      go(4);
    }, 900);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof SPOT !== "undefined" && typeof spotIsFresh === "function" && spotIsFresh(SPOT)) {
      $("[data-where]").textContent = SPOT.where + (SPOT.when ? ", " + SPOT.when : "");
    }
    renderCart();
    chips($("[data-times]"), [["asap", "ASAP · about 20 min"]].concat(slots().map((d) => [clock(d), clock(d)])), "asap", (v) => (pickup = v));
    const q = new URLSearchParams(location.search);
    tipRate = (Number(q.get("tip")) || 0) / 100;
    chips($("[data-tips]"), [[0, "No tip"], [0.1, "10%"], [0.15, "15%"], [0.2, "20%"]], tipRate, (v) => { tipRate = v; renderSums(); });
    renderSums();

    $("[data-cart]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      const l = cart[Number(b.dataset.i)];
      l.qty = Math.max(1, Math.min(20, l.qty + Number(b.dataset.d)));
      renderCart();
    });
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $$("[data-pay]").forEach((b) => b.addEventListener("click", pay));
    $("[data-restart]").addEventListener("click", () => go(1));
    $("[data-cardnum]").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
    });
    $("[data-exp]").addEventListener("input", (e) => {
      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
      e.target.value = d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : d;
    });

    go(q.get("step") || 1);
  });
})();

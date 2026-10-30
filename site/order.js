/* Krave Kulture — order ahead page. Builds the order list from menu-data.js, keeps the
   cart in this tab, and sends the order to /api/orders. Prices shown here are for the
   customer; the server prices the order again from the same menu-data.js. */
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
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const money = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(2));
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    local(k, v) {
      try {
        if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
        if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
      } catch (e) { return null; }
    },
  };

  const MAX_QTY = 20;
  let open = false;
  let sending = false;
  // Square card field, set up once /api/orders says payments are on.
  let card = null;
  // Apple Pay / Google Pay, when the device and Square support them.
  let paymentRequest = null;
  const wallets = {};
  let payKey = null; // one per checkout attempt; reused only to retry after a dropped connection
  // cart: [{ name, flavor, qty, price }]
  let cart = store.get("kk_cart") || [];
  // Saved on this phone after an order, unless the customer unticks "Remember me":
  // kk_me = { name, phone, email }, kk_reorder = { items: [{ name, flavor, qty }], at }.
  const REORDER_DAYS = 120;

  const orderable = new Map(); // name → { price, flavors }
  let soldOutNow = new Set(); // marked sold out on the order board today

  function renderMenu() {
    const host = $("#order-menu");
    if (typeof MENU === "undefined" || !MENU.length) {
      host.appendChild(el("div", { class: "wrap empty" }, ["Menu coming soon.", el("small", { text: "Order at the window today." })]));
      return;
    }
    MENU.forEach((section) => {
      const board = ["red", "blue", "gold", "black"].includes(section.board) ? section.board : "red";
      const flavors = section.choices && section.choices.options && section.choices.options.length ? section.choices.options : null;
      const id = "o-" + slug(section.title);
      const list = el("ul", { class: "price-board order-board" });
      (section.items || []).forEach((item) => {
        const soldOut = String(item.tag || "").toLowerCase() === "sold out";
        const canOrder = typeof item.price === "number" && !soldOut;
        if (canOrder) orderable.set(item.name, { price: item.price, flavors });
        const rowId = id + "-" + slug(item.name);
        let select = null;
        if (canOrder && flavors) {
          select = el("select", { class: "flavor", id: rowId + "-flavor", "aria-label": "Flavor for " + item.name },
            [el("option", { value: "", text: "Pick a flavor" })].concat(flavors.map((f) => el("option", { value: f, text: f }))));
        }
        const add = canOrder
          ? el("button", { type: "button", class: "add", "data-add": item.name, "aria-label": "Add " + item.name + " to your order" }, ["Add"])
          : el("span", { class: "add-off", text: soldOut ? "Sold out" : "Ask at window" });
        const out = canOrder ? el("span", { class: "add-off", "data-out": item.name, text: "Sold out", hidden: "" }) : null;
        const li = el("li", { class: "row order-row", "data-tag": item.tag ? String(item.tag).toLowerCase() : null, "data-item": canOrder ? item.name : null }, [
          el("span", { class: "row-name" }, [
            el("span", { text: item.name }),
            item.tag ? el("span", { class: "sticker", "data-kind": String(item.tag).toLowerCase(), text: item.tag }) : null,
          ]),
          typeof item.price === "number" ? el("span", { class: "row-price" }, [el("small", { text: "$" }), String(item.price)]) : null,
          item.desc ? el("p", { class: "row-desc", text: item.desc }) : null,
          el("div", { class: "row-act" }, [select, add, out, el("span", { class: "in-cart", "data-in-cart": item.name, "aria-live": "polite" })]),
        ]);
        list.appendChild(li);
      });
      host.appendChild(el("section", { class: "stall", id, "aria-labelledby": id + "-title" }, [
        el("div", { class: "board board-" + board }, [
          el("div", { class: "wrap" }, [
            el("div", { class: "board-head" }, [
              el("h2", { class: "display board-title", id: id + "-title", text: section.title }),
              section.kreyol ? el("span", { class: "board-kreyol", text: section.kreyol }) : null,
            ]),
            section.note ? el("p", { class: "board-note", text: section.note }) : null,
          ]),
        ]),
        el("div", { class: "wrap stall-body no-plate" }, [list]),
      ]));
    });

    host.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (!btn || !open) return;
      const name = btn.getAttribute("data-add");
      if (soldOutNow.has(name)) return;
      const info = orderable.get(name);
      let flavor = null;
      if (info.flavors) {
        const select = btn.parentNode.querySelector("select");
        flavor = select.value;
        if (!flavor) {
          select.classList.add("need");
          select.focus();
          return;
        }
        select.classList.remove("need");
      }
      addToCart(name, flavor, 1);
      btn.classList.remove("added");
      void btn.offsetWidth; // restart the little pop
      btn.classList.add("added");
    });
    host.addEventListener("change", (e) => {
      if (e.target.matches("select.flavor")) e.target.classList.remove("need");
    });
  }

  // Items switched off on the order board: strike them through, swap Add for "Sold out",
  // and take them out of the cart. Returns the names that had to leave the cart.
  function applySoldOut(names) {
    soldOutNow = new Set(names || []);
    document.querySelectorAll("[data-item]").forEach((li) => {
      const name = li.getAttribute("data-item");
      const out = soldOutNow.has(name);
      if (li.dataset.orig === undefined) li.dataset.orig = li.dataset.tag || "";
      if (out || li.dataset.orig) li.dataset.tag = out ? "sold out" : li.dataset.orig;
      else delete li.dataset.tag;
      const own = li.querySelector(".sticker:not([data-out-sticker])");
      if (own) own.hidden = out;
      const flag = li.querySelector("[data-out-sticker]");
      if (out && !flag) li.querySelector(".row-name").appendChild(el("span", { class: "sticker", "data-kind": "sold out", "data-out-sticker": "", text: "sold out" }));
      if (!out && flag) flag.remove();
      li.querySelector("[data-add]").hidden = out;
      li.querySelector("[data-out]").hidden = !out;
      const select = li.querySelector("select.flavor");
      if (select) select.hidden = out;
    });
    const gone = Array.from(new Set(cart.filter((l) => soldOutNow.has(l.name)).map((l) => l.name)));
    if (gone.length) {
      syncCart();
      store.set("kk_cart", cart);
      renderCart();
    }
    renderReorder();
    return gone;
  }

  // Drop anything the menu no longer sells (or re-prices it) after a menu edit.
  function syncCart() {
    cart = cart.filter((l) => {
      const info = orderable.get(l.name);
      if (!info || soldOutNow.has(l.name)) return false;
      if (info.flavors && !info.flavors.includes(l.flavor)) return false;
      l.price = info.price;
      return l.qty > 0;
    });
  }

  function addToCart(name, flavor, delta) {
    const line = cart.find((l) => l.name === name && (l.flavor || null) === (flavor || null));
    if (line) line.qty = Math.max(0, Math.min(MAX_QTY, line.qty + delta));
    else if (delta > 0) cart.push({ name, flavor: flavor || null, qty: Math.min(MAX_QTY, delta), price: orderable.get(name).price });
    cart = cart.filter((l) => l.qty > 0);
    store.set("kk_cart", cart);
    renderCart();
  }

  const lineLabel = (l) => l.name + (l.flavor ? " (" + l.flavor + ")" : "");
  const cartTotal = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
  const payingByCard = () => squareOn && ($("input[name=pay]:checked") || {}).value === "card";
  const tipPct = () => (payingByCard() ? Number(($("input[name=tip]:checked") || {}).value) || 0 : 0);
  const tipCents = () => Math.round((Math.round(cartTotal() * 100) * tipPct()) / 100);
  const chargeTotal = () => (Math.round(cartTotal() * 100) + tipCents()) / 100;
  const cents = (n) => "$" + n.toFixed(2);
  const cartCount = () => cart.reduce((s, l) => s + l.qty, 0);

  function renderCart() {
    const list = $("[data-cart]");
    list.textContent = "";
    cart.forEach((l) => {
      list.appendChild(el("li", { class: "cart-line" }, [
        el("span", { class: "cart-name", text: lineLabel(l) }),
        el("span", { class: "qty" }, [
          el("button", { type: "button", "data-step": "-1", "data-name": l.name, "data-flavor": l.flavor || "", "aria-label": "One less " + lineLabel(l) }, ["−"]),
          el("b", { "aria-label": l.qty + " of " + lineLabel(l), text: String(l.qty) }),
          el("button", { type: "button", "data-step": "1", "data-name": l.name, "data-flavor": l.flavor || "", "aria-label": "One more " + lineLabel(l), disabled: l.qty >= MAX_QTY ? "" : null }, ["+"]),
        ]),
        el("span", { class: "cart-price", text: money(l.price * l.qty) }),
      ]));
    });
    const empty = !cart.length;
    $("[data-cart-empty]").hidden = !empty;
    $("[data-cart-total]").hidden = empty;
    renderPayTotals();

    const bar = $("[data-cart-bar]");
    bar.hidden = empty;
    $("[data-cart-bar-count]").textContent = cartCount() + (cartCount() === 1 ? " item" : " items");
    $("[data-cart-bar-total]").textContent = money(cartTotal());

    // "2 in order" next to each Add button.
    document.querySelectorAll("[data-in-cart]").forEach((n) => {
      const q = cart.filter((l) => l.name === n.getAttribute("data-in-cart")).reduce((s, l) => s + l.qty, 0);
      n.textContent = q ? q + " in order" : "";
    });
  }

  // Total line and button label follow the pay choice and tip.
  function renderPayTotals() {
    const byCard = payingByCard();
    $("[data-cart-total-label]").textContent = byCard ? (tipPct() ? "Total with " + cents(tipCents() / 100) + " tip" : "Total") : "Total, pay at the truck";
    $("[data-cart-total-value]").textContent = byCard ? cents(chargeTotal()) : money(cartTotal());
    $("[data-pay-card]").hidden = !byCard;
    if (!sending) $("[data-submit]").textContent = byCard ? "Pay " + cents(chargeTotal()) + " · place order" : "Place order · pay at the truck";
    // Keep the Apple Pay / Google Pay sheet showing the same total we charge.
    if (paymentRequest && cart.length) {
      try { paymentRequest.update({ total: { amount: chargeTotal().toFixed(2), label: "Krave Kulture" } }); } catch (e) { /* sheet not open */ }
    }
  }

  const SQUARE_STYLE = {
    ".input-container": { borderColor: "#111111", borderWidth: "3px", borderRadius: "0px" },
    ".input-container.is-focus": { borderColor: "#1f47cc" },
    ".input-container.is-error": { borderColor: "#d92b1f" },
    ".message-text": { color: "#55534e" },
    ".message-text.is-error": { color: "#d92b1f" },
    ".message-icon.is-error": { color: "#d92b1f" },
    input: { backgroundColor: "#ffffff", color: "#111111", fontSize: "18px" },
    "input::placeholder": { color: "#55534e" },
    "input.is-error": { color: "#d92b1f" },
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  // Loads Square's card field. If anything fails, the page quietly stays pay at the truck.
  let squareOn = false;
  async function setupSquare(cfg) {
    if (squareOn || !cfg || !cfg.appId || !cfg.locationId) return;
    squareOn = true;
    $("[data-pay-pick]").hidden = false;
    $("[data-test-note]").hidden = !cfg.sandbox;
    $("[data-pay-card]").hidden = false;
    try {
      await loadScript(cfg.sandbox ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js");
      const payments = window.Square.payments(cfg.appId, cfg.locationId);
      const c = await payments.card({ style: SQUARE_STYLE });
      const loading = $("[data-card-loading]");
      if (loading) loading.remove();
      await c.attach("#card-container");
      card = c;
      setupWallets(payments);
      $("[data-pay-tag]").textContent = "Pay online or at the truck.";
      $("[data-pay-band]").textContent = "Pay online or at the truck";
      $("[data-pay-how]").textContent = "Add what you want, tell us your name and number, and we start cooking. Pay online now, or at the window when you pick up.";
    } catch (e) {
      console.error("[krave] Square card form failed:", e);
      squareOn = false;
      $("[data-pay-pick]").hidden = true;
      $("[data-pay-card]").hidden = true;
    }
    renderPayTotals();
  }

  // Wallet buttons sit above the card box. Each one quietly stays hidden if this
  // device, browser or the Square account doesn't support it (Apple Pay also needs
  // the domain verified in Square).
  async function setupWallets(payments) {
    try {
      paymentRequest = payments.paymentRequest({
        countryCode: "US",
        currencyCode: "USD",
        total: { amount: (chargeTotal() || 1).toFixed(2), label: "Krave Kulture" },
      });
    } catch (e) {
      console.error("[krave] payment request failed:", e);
      return;
    }
    try {
      wallets.apple = await payments.applePay(paymentRequest);
      $("[data-apple-pay]").hidden = false;
    } catch (e) { /* not Safari with Apple Pay, or domain not verified yet */ }
    try {
      const g = await payments.googlePay(paymentRequest);
      await g.attach("#google-pay-button", { buttonColor: "black", buttonSizeMode: "fill", buttonType: "long" });
      wallets.google = g;
      $("[data-google-pay]").hidden = false;
    } catch (e) { /* Google Pay not available here */ }
    $("[data-wallets]").hidden = !(wallets.apple || wallets.google);
  }

  function setOpen(isOpen, message) {
    open = isOpen;
    document.body.dataset.ordering = isOpen ? "open" : "closed";
    const status = $("[data-order-status]");
    status.textContent = message || (isOpen
      ? "We're taking orders now. Order here, pick up at the truck."
      : "We're not taking online orders right now. Check Instagram for today's spot, or order at the window.");
    document.querySelectorAll("[data-add], select.flavor").forEach((b) => (b.disabled = !isOpen));
    $("[data-submit]").disabled = !isOpen;
    renderReorder();
  }

  // ---- Reorder + remembered details ----

  function savedReorder() {
    const r = store.local("kk_reorder");
    if (!r || !Array.isArray(r.items) || !r.items.length) return null;
    if (!(Date.now() - Number(r.at) < REORDER_DAYS * 864e5)) return null;
    return r;
  }

  // Splits the last order into what can be ordered right now and what can't
  // (sold out today, off the menu, or a flavor we stopped making).
  function reorderLines(r) {
    const ok = [];
    const missing = [];
    r.items.forEach((l) => {
      const info = orderable.get(l.name);
      const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(l.qty)) || 1));
      if (!info || soldOutNow.has(l.name) || (info.flavors && !info.flavors.includes(l.flavor))) missing.push(lineLabel(l));
      else ok.push({ name: l.name, flavor: info.flavors ? l.flavor : null, qty, price: info.price });
    });
    return { ok, missing };
  }

  function renderReorder() {
    const box = $("[data-reorder]");
    if (!box) return;
    const r = savedReorder();
    const lines = r ? reorderLines(r) : { ok: [], missing: [] };
    if (!lines.ok.length) { box.hidden = true; return; }
    const total = lines.ok.reduce((s, l) => s + l.price * l.qty, 0);
    $("[data-reorder-items]", box).textContent = lines.ok.map((l) => l.qty + " × " + lineLabel(l)).join(", ");
    const note = $("[data-reorder-note]", box);
    note.textContent = lines.missing.length ? lines.missing.join(", ") + (lines.missing.length > 1 ? " aren't available right now, so we'll leave them off." : " isn't available right now, so we'll leave it off.") : "";
    note.hidden = !lines.missing.length;
    const btn = $("[data-reorder-btn]", box);
    btn.textContent = "Reorder · " + money(total);
    btn.disabled = !open;
    box.hidden = false;
  }

  function reorder() {
    const r = savedReorder();
    if (!r || !open) return;
    const lines = reorderLines(r);
    if (!lines.ok.length) return renderReorder();
    cart = lines.ok;
    store.set("kk_cart", cart);
    renderCart();
    showError("");
    const form = $("[data-order-form]");
    const ready = form.name.value.trim() && form.phone.value.trim();
    // Show the filled cart. With details remembered the pay button is next; otherwise
    // the first empty box gets focus.
    $("#checkout").scrollIntoView({ behavior: "smooth", block: "start" });
    const target = ready ? $("[data-submit]") : !form.name.value.trim() ? form.name : form.phone;
    target.focus({ preventScroll: true });
  }

  function prefillMe() {
    const me = store.local("kk_me");
    const form = $("[data-order-form]");
    if (!me || !form) return;
    if (me.name && !form.name.value) form.name.value = me.name;
    if (me.phone && !form.phone.value) form.phone.value = me.phone;
    if (me.email && !form.email.value) form.email.value = me.email;
    $("[data-forget]").hidden = false;
  }

  function forgetMe() {
    store.local("kk_me", null);
    store.local("kk_reorder", null);
    const form = $("[data-order-form]");
    ["name", "phone", "email"].forEach((k) => (form[k].value = ""));
    $("[data-forget]").hidden = true;
    renderReorder();
    form.name.focus();
  }

  function rememberMe(form, order) {
    if (!form.remember.checked) {
      store.local("kk_me", null);
      store.local("kk_reorder", null);
      return;
    }
    store.local("kk_me", { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim() });
    store.local("kk_reorder", { items: (order.items || []).map((l) => ({ name: l.name, flavor: l.flavor || null, qty: l.qty })), at: Date.now() });
  }

  async function checkOpen() {
    try {
      const res = await fetch("/api/orders", { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await res.json();
      const gone = applySoldOut(data && data.soldOut);
      setOpen(Boolean(data && data.open));
      renderWait(data && data.open ? data.wait : null);
      if (gone.length) showError(soldOutMessage(gone));
      if (data && data.open && data.square) setupSquare(data.square);
    } catch (e) {
      setOpen(false, "Online ordering isn't available right now. Order at the window.");
      renderWait(null);
    }
  }

  // "Ready in about 15–20 min" from how many orders are on the board right now.
  function renderWait(wait) {
    const ok = wait && Number.isFinite(wait.minutes) && Number.isFinite(wait.ahead);
    const text = !ok ? "" : "Ready in about " + wait.minutes + "–" + (wait.minutes + 5) + " min. " + (wait.ahead
      ? wait.ahead + (wait.ahead === 1 ? " order" : " orders") + " ahead of you."
      : "No line right now.");
    document.querySelectorAll("[data-wait]").forEach((n) => {
      n.hidden = !ok;
      const t = $("[data-wait-text]", n);
      if (t) t.textContent = text;
    });
  }

  // Keep the estimate current while someone is building their order.
  async function refreshWait() {
    if (document.visibilityState !== "visible" || $("#order-flow").hidden || !open) return;
    try {
      const res = await fetch("/api/orders", { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await res.json();
      renderWait(data && data.open ? data.wait : null);
    } catch (e) { /* keep the last estimate */ }
  }

  const soldOutMessage = (names) => "Sorry, " + names.join(" and ") + (names.length > 1 ? " just sold out and were" : " just sold out and was") + " taken off your order.";

  function showError(msg) {
    const box = $("[data-form-error]");
    box.textContent = msg;
    box.hidden = !msg;
  }

  // `wallet` is Apple Pay or Google Pay when one of their buttons was tapped. Apple
  // requires tokenize() to start right away in the tap, so nothing before it awaits.
  async function submit(e, wallet) {
    e.preventDefault();
    if (sending) return;
    const form = $("[data-order-form]");
    showError("");
    if (!open) return showError("We're not taking online orders right now.");
    if (!cart.length) return showError("Your order is empty. Tap Add on something above.");
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    if (name.length < 2) { form.name.focus(); return showError("Please add your name so we can call it out at the window."); }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) { form.phone.focus(); return showError("Please add a phone number we can reach you on (10 digits)."); }
    const email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) { form.email.focus(); return showError("That email address doesn't look right. Fix it, or leave it empty."); }

    const byCard = Boolean(wallet) || payingByCard();
    if (byCard && !card) return showError("The card form is still loading. Give it a second and tap Pay again.");
    const method = wallet || card;
    let token = null;
    sending = true;
    const btn = $("[data-submit]");
    btn.disabled = true;
    btn.textContent = byCard ? "Paying…" : "Sending…";
    try {
      if (byCard) {
        const result = await method.tokenize();
        if (result.status !== "OK") {
          // Closing the Apple Pay / Google Pay sheet is not an error.
          if (wallet) return;
          const msg = result.errors && result.errors[0] && result.errors[0].message;
          showError(msg ? "Check your card: " + msg : "Please check your card details.");
          return;
        }
        token = result.token;
        if (!payKey) payKey = newKey();
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name, phone,
          email: form.email.value.trim(),
          notes: form.notes.value.trim(),
          website: form.website.value,
          items: cart.map((l) => ({ name: l.name, flavor: l.flavor, qty: l.qty })),
          pay: byCard ? "card" : "truck",
          token, payKey: byCard ? payKey : undefined,
          tip: tipPct(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      // A real answer came back (yes or no), so the next try is a new payment.
      payKey = null;
      if (!res.ok || !data.ok) {
        if (data && data.open === false) setOpen(false);
        if (data && data.soldOut) {
          const gone = applySoldOut(data.soldOut);
          if (gone.length) return showError(soldOutMessage(gone) + " Check your order and send it again.");
        }
        showError((data && data.error) || "Something went wrong. Please try again, or order at the window.");
        return;
      }
      cart = [];
      store.set("kk_cart", cart);
      data.order.emailed = Boolean(data.emailed);
      store.local("kk_last_order", data.order);
      rememberMe(form, data.order);
      showConfirm(data.order);
    } catch (err) {
      showError(byCard
        ? "We couldn't reach the payment system. Check your connection and tap Pay again. You won't be charged twice."
        : "We couldn't reach the truck's ordering system. Check your connection and try again.");
    } finally {
      sending = false;
      btn.disabled = !open;
      renderPayTotals();
    }
  }

  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "kk-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
  }

  function showConfirm(order) {
    $("[data-confirm-number]").textContent = order.number;
    $("[data-confirm-total]").textContent = money(order.total);
    const paid = order.paid;
    $("[data-confirm-lead]").hidden = Boolean(paid);
    $("[data-confirm-paid]").hidden = !paid;
    if (paid) {
      const brand = paid.brand ? String(paid.brand).toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "card";
      $("[data-confirm-paid-text]").textContent = cents(paid.amount) + " on your " + brand + (paid.last4 ? " ending " + paid.last4 : "") + (order.tip ? ", including a " + cents(order.tip) + " tip. Thank you!" : ".");
    }
    const list = $("[data-confirm-items]");
    list.textContent = "";
    (order.items || []).forEach((l) => list.appendChild(el("li", {}, [
      el("span", { text: l.qty + " × " + lineLabel(l) }),
      el("span", { text: money(l.lineTotal) }),
    ])));
    const placed = new Date(order.createdAt);
    $("[data-confirm-when]").textContent = isNaN(placed) ? "" : "Placed " + placed.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) + " for " + order.name + ".";
    $("#order-flow").hidden = true;
    $("[data-cart-bar]").hidden = true;
    setConfirmStatus(order.status);
    const mailed = $("[data-confirm-emailed]");
    mailed.hidden = !order.emailed;
    mailed.textContent = order.emailed ? "We emailed your order number to " + order.email + ". Don't see it in a minute? Check your spam and trash folders." : "";
    const review = $("[data-review]");
    $("[data-review-link]", review).href = "review.html?o=" + encodeURIComponent(order.number) + (order.reviewToken ? "&t=" + encodeURIComponent(order.reviewToken) : "");
    review.hidden = false;
    const box = $("#confirm");
    box.hidden = false;
    window.scrollTo(0, 0);
    box.focus({ preventScroll: true });
    watchStatus(order);
  }

  const STATUS_TEXT = { new: "Received. We're on it.", done: "Done. Thanks for ordering!" };
  function setConfirmStatus(status) {
    const n = $("[data-confirm-status]");
    n.dataset.state = status === "done" ? "done" : "new";
    n.textContent = STATUS_TEXT[n.dataset.state];
  }

  // Keep the status on the confirmation screen fresh (every 30s while the page is open,
  // until the truck marks the order done).
  let statusTimer = null;
  function watchStatus(order) {
    clearInterval(statusTimer);
    if (!order.phone || order.status === "done") return;
    const check = async () => {
      if (document.visibilityState !== "visible" || $("#confirm").hidden) return;
      try {
        const res = await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ number: order.number, name: order.name, last4: String(order.phone).replace(/\D/g, "").slice(-4) }),
        });
        const data = await res.json();
        const found = data && data.orders && data.orders[0];
        if (!found) return;
        setConfirmStatus(found.status);
        order.status = found.status;
        store.local("kk_last_order", order);
        if (found.status === "done") clearInterval(statusTimer);
      } catch (e) { /* try again next tick */ }
    };
    check();
    statusTimer = setInterval(check, 30000);
  }

  function newOrder() {
    clearInterval(statusTimer);
    store.local("kk_last_order", null);
    $("#confirm").hidden = true;
    $("#order-flow").hidden = false;
    prefillMe();
    renderCart();
    renderReorder();
    checkOpen();
    window.scrollTo(0, 0);
  }

  function renderPickup() {
    const host = $("[data-spot]");
    if (typeof SPOT === "undefined" || typeof spotIsFresh !== "function" || !spotIsFresh(SPOT)) { host.remove(); return; }
    $("[data-spot-where]", host).textContent = SPOT.where;
    if (SPOT.when) $("[data-spot-when]", host).textContent = SPOT.when;
    else { $("[data-spot-when]", host).remove(); $("[data-spot-sep]", host).remove(); }
    host.hidden = false;
  }

  function renderBits() {
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
    if (typeof LOCATION === "undefined") return;
    document.querySelectorAll("[data-city]").forEach((n) => (n.textContent = LOCATION.city));
    const a = $("[data-phone-link]");
    if (a && LOCATION.phone) a.href = "tel:" + LOCATION.phone.replace(/[^\d+]/g, "");
    else if (a) a.parentNode.remove();
  }

  document.addEventListener("DOMContentLoaded", () => {
    [renderMenu, renderPickup, renderBits].forEach((step) => {
      try { step(); } catch (e) { console.error("[krave] " + step.name + " failed:", e); }
    });
    syncCart();
    store.set("kk_cart", cart);
    prefillMe();
    renderCart();
    setOpen(false, "Checking if we're taking orders…");

    $("[data-cart]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (b) addToCart(b.getAttribute("data-name"), b.getAttribute("data-flavor") || null, Number(b.getAttribute("data-step")));
    });
    $("[data-order-form]").addEventListener("submit", submit);
    $("[data-apple-pay]").addEventListener("click", (e) => wallets.apple && submit(e, wallets.apple));
    $("#google-pay-button").addEventListener("click", (e) => wallets.google && submit(e, wallets.google));
    $("[data-order-form]").addEventListener("change", (e) => {
      if (e.target.name === "pay" || e.target.name === "tip") renderPayTotals();
    });
    $("[data-new-order]").addEventListener("click", newOrder);
    $("[data-reorder-btn]").addEventListener("click", reorder);
    $("[data-forget-btn]").addEventListener("click", forgetMe);

    // Opening the order page always starts a fresh order. Only a reload of the
    // confirmation itself (within 24 hours) shows that order again.
    const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    const last = store.local("kk_last_order");
    if (nav && nav.type === "reload" && last && last.number && Date.now() - Date.parse(last.createdAt) < 24 * 3600e3) showConfirm(last);
    checkOpen();
    setInterval(refreshWait, 60000);
  });
})();

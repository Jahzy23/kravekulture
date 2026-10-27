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
  // cart: [{ name, flavor, qty, price }]
  let cart = store.get("kk_cart") || [];

  const orderable = new Map(); // name → { price, flavors }

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
        const li = el("li", { class: "row order-row", "data-tag": item.tag ? String(item.tag).toLowerCase() : null }, [
          el("span", { class: "row-name" }, [
            el("span", { text: item.name }),
            item.tag ? el("span", { class: "sticker", "data-kind": String(item.tag).toLowerCase(), text: item.tag }) : null,
          ]),
          typeof item.price === "number" ? el("span", { class: "row-price" }, [el("small", { text: "$" }), String(item.price)]) : null,
          item.desc ? el("p", { class: "row-desc", text: item.desc }) : null,
          el("div", { class: "row-act" }, [select, add, el("span", { class: "in-cart", "data-in-cart": item.name, "aria-live": "polite" })]),
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

  // Drop anything the menu no longer sells (or re-prices it) after a menu edit.
  function syncCart() {
    cart = cart.filter((l) => {
      const info = orderable.get(l.name);
      if (!info) return false;
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
    $("[data-cart-total-value]").textContent = money(cartTotal());

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

  function setOpen(isOpen, message) {
    open = isOpen;
    document.body.dataset.ordering = isOpen ? "open" : "closed";
    const status = $("[data-order-status]");
    status.textContent = message || (isOpen
      ? "We're taking orders now. Order here, pick up at the truck."
      : "We're not taking online orders right now. Check Instagram for today's spot, or order at the window.");
    document.querySelectorAll("[data-add], select.flavor").forEach((b) => (b.disabled = !isOpen));
    $("[data-submit]").disabled = !isOpen;
  }

  async function checkOpen() {
    try {
      const res = await fetch("/api/orders", { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await res.json();
      setOpen(Boolean(data && data.open));
    } catch (e) {
      setOpen(false, "Online ordering isn't available right now. Order at the window.");
    }
  }

  function showError(msg) {
    const box = $("[data-form-error]");
    box.textContent = msg;
    box.hidden = !msg;
  }

  async function submit(e) {
    e.preventDefault();
    if (sending) return;
    const form = e.target;
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

    sending = true;
    const btn = $("[data-submit]");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name, phone,
          email: form.email.value.trim(),
          notes: form.notes.value.trim(),
          website: form.website.value,
          items: cart.map((l) => ({ name: l.name, flavor: l.flavor, qty: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data && data.open === false) setOpen(false);
        showError((data && data.error) || "Something went wrong. Please try again, or order at the window.");
        return;
      }
      cart = [];
      store.set("kk_cart", cart);
      data.order.emailed = Boolean(data.emailed);
      store.local("kk_last_order", data.order);
      showConfirm(data.order);
    } catch (err) {
      showError("We couldn't reach the truck's ordering system. Check your connection and try again.");
    } finally {
      sending = false;
      btn.textContent = label;
      btn.disabled = !open;
    }
  }

  function showConfirm(order) {
    $("[data-confirm-number]").textContent = order.number;
    $("[data-confirm-total]").textContent = money(order.total);
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
    renderCart();
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
    renderCart();
    setOpen(false, "Checking if we're taking orders…");

    $("[data-cart]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (b) addToCart(b.getAttribute("data-name"), b.getAttribute("data-flavor") || null, Number(b.getAttribute("data-step")));
    });
    $("[data-order-form]").addEventListener("submit", submit);
    $("[data-new-order]").addEventListener("click", newOrder);

    // Opening the order page always starts a fresh order. Only a reload of the
    // confirmation itself (within 24 hours) shows that order again.
    const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    const last = store.local("kk_last_order");
    if (nav && nav.type === "reload" && last && last.number && Date.now() - Date.parse(last.createdAt) < 24 * 3600e3) showConfirm(last);
    checkOpen();
  });
})();

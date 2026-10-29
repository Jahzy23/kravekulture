/* Krave Kulture — find your order (track.html). Looks orders up by name + last 4 digits
   of the phone through /api/track, so a customer who lost their number can get it back. */
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
  const money = (n) => "$" + (Number.isInteger(n) ? n : Number(n).toFixed(2));
  const STATUS = { new: "Received. We're on it.", done: "Done. Thanks for ordering!" };

  function showError(msg) {
    const box = $("[data-track-error]");
    box.textContent = msg || "";
    box.hidden = !msg;
  }

  function render(orders) {
    const host = $("[data-track-results]");
    host.textContent = "";
    if (!orders.length) {
      host.appendChild(el("p", { class: "track-none", text: "No orders found for that name and phone from today or yesterday. Check the spelling, or ask at the window." }));
      return;
    }
    orders.forEach((o) => {
      const placed = new Date(o.createdAt);
      host.appendChild(el("article", { class: "track-card", "data-state": o.status === "done" ? "done" : "new" }, [
        el("p", { class: "label", text: "Order number" }),
        el("p", { class: "confirm-number display", text: "#" + o.number }),
        el("p", { class: "confirm-status", "data-state": o.status === "done" ? "done" : "new", text: STATUS[o.status === "done" ? "done" : "new"] }),
        el("ul", { class: "confirm-items" }, (o.items || []).map((l) => el("li", {}, [
          el("span", { text: l.qty + " × " + l.name + (l.flavor ? " (" + l.flavor + ")" : "") }),
          el("span", { text: money(l.lineTotal) }),
        ]))),
        el("p", { class: "confirm-small", text: (o.paid ? "Paid online: " + money(o.total + (o.tip || 0)) : "Pay at the truck: " + money(o.total)) + ". Placed " + (isNaN(placed) ? "" : placed.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })) + " for " + o.name + "." }),
      ]));
    });
  }

  async function lookup(e) {
    e.preventDefault();
    const form = e.target;
    showError("");
    const name = form.name.value.trim();
    const last4 = form.last4.value.replace(/\D/g, "");
    if (name.length < 2) { form.name.focus(); return showError("Type the name you ordered under."); }
    if (last4.length !== 4) { form.last4.focus(); return showError("Type the last 4 digits of your phone number."); }
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, last4 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showError(data.error || "Something went wrong. Ask at the window.");
      render(data.orders || []);
      const first = $("[data-track-results] .track-card, [data-track-results] .track-none");
      if (first) first.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      showError("We couldn't reach the truck's ordering system. Check your connection and try again.");
    } finally {
      btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
    const a = $("[data-phone-link]");
    if (a && typeof LOCATION !== "undefined" && LOCATION.phone) a.href = "tel:" + LOCATION.phone.replace(/[^\d+]/g, "");
    else if (a) a.replaceWith(document.createTextNode("ask"));
    $("[data-track-form]").addEventListener("submit", lookup);

    // Ordered on this phone? Fill the form in for them.
    try {
      const last = JSON.parse(localStorage.getItem("kk_last_order") || "null");
      if (last && last.name) {
        const form = $("[data-track-form]");
        form.name.value = last.name;
        form.last4.value = String(last.phone || "").replace(/\D/g, "").slice(-4);
      }
    } catch (e) { /* storage blocked */ }
  });
})();

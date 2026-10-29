/* Krave Kulture — customer reviews on the order board (admin.html). Lists reviews from
   /api/reviews?all=1 and approves or hides them. Only approved reviews show on the menu
   page. Uses the same admin sign-in as the board: it shows itself whenever the board is
   showing. */
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
  const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  const REFRESH_MS = 60000;
  // What each tab's buttons do: [label, action, button style]
  const ACTIONS = {
    pending: [["Approve", "approve", "btn"], ["Hide", "hide", "btn btn-white"]],
    approved: [["Take down", "hide", "btn btn-white"]],
    hidden: [["Approve", "approve", "btn btn-white"]],
  };

  let reviews = [];
  let tab = "pending";
  let timer = null;

  async function api(method, body) {
    const res = await fetch("/api/reviews" + (method === "GET" ? "?all=1" : ""), {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  function render() {
    const counts = { pending: 0, approved: 0, hidden: 0 };
    reviews.forEach((r) => (counts[r.status] = (counts[r.status] || 0) + 1));
    Object.keys(counts).forEach((k) => ($('[data-rev-count="' + k + '"]').textContent = counts[k]));

    const shown = reviews.filter((r) => r.status === tab);
    const list = $("[data-rev-list]");
    list.textContent = "";
    shown.forEach((r) => {
      const written = new Date(r.createdAt);
      list.appendChild(el("li", { class: "ticket review-ticket" + (r.status === "hidden" ? " is-done" : "") }, [
        el("div", { class: "ticket-top" }, [
          el("span", { class: "ticket-number display", text: stars(r.stars), "aria-label": r.stars + " stars" }),
          el("span", { class: "ticket-time", text: written.toLocaleDateString([], { month: "short", day: "numeric" }) }),
        ]),
        el("p", { class: "ticket-who" }, [el("b", { text: r.name }), "Order #" + r.number]),
        r.text ? el("p", { class: "ticket-notes", text: r.text }) : el("p", { class: "admin-note", text: "Stars only, no comment." }),
        r.items && r.items.length ? el("p", { class: "admin-note", text: "Ordered: " + r.items.join(", ") }) : null,
        el("div", { class: "ticket-foot" }, ACTIONS[r.status].map(([label, action, cls]) =>
          el("button", { type: "button", class: cls, "data-rev-action": action, "data-id": r.id }, [label]))),
      ]));
    });
    $("[data-rev-empty]").hidden = shown.length > 0;
  }

  async function load() {
    clearTimeout(timer);
    if ($("[data-board]").hidden) {
      $("[data-reviews]").hidden = true;
      return;
    }
    try {
      const r = await api("GET");
      if (r.status === 200) {
        reviews = r.data.reviews || [];
        $("[data-reviews]").hidden = false;
        render();
      } else if (r.status === 401) {
        $("[data-reviews]").hidden = true;
      }
    } catch (e) { /* offline: try again on the next tick */ }
    timer = setTimeout(load, REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // The board shows after sign-in and hides on sign-out; follow it.
    new MutationObserver(load).observe($("[data-board]"), { attributes: true, attributeFilter: ["hidden"] });

    document.querySelectorAll("[data-rev-tab]").forEach((b) => b.addEventListener("click", () => {
      tab = b.getAttribute("data-rev-tab");
      document.querySelectorAll("[data-rev-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      render();
    }));

    $("[data-rev-list]").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-rev-action]");
      if (!b) return;
      b.disabled = true;
      const r = await api("POST", { action: b.getAttribute("data-rev-action"), id: b.getAttribute("data-id") });
      if (r.status === 200) {
        reviews = reviews.map((x) => (x.id === r.data.review.id ? r.data.review : x));
        render();
      } else {
        b.disabled = false;
        alert(r.data.error || "Couldn't update that review.");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") load();
    });
  });
})();

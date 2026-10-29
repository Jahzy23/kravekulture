/* Krave Kulture — catering requests on the order board (admin.html). Lists requests from
   /api/catering under the orders, and marks them handled. Uses the same admin sign-in as
   the board: it shows itself whenever the board is showing. */
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
  const REFRESH_MS = 60000;

  let requests = [];
  let tab = "new";
  let timer = null;

  // "2026-11-14" → "Sat, Nov 14, 2026"
  function prettyDate(ymd) {
    const [y, m, d] = String(ymd).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  async function api(method, body) {
    const res = await fetch("/api/catering", {
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
    const counts = { new: 0, done: 0 };
    requests.forEach((r) => (counts[r.status === "done" ? "done" : "new"] += 1));
    Object.keys(counts).forEach((k) => ($('[data-cat-count="' + k + '"]').textContent = counts[k]));

    // Open requests: soonest event first. Handled: newest request first.
    const shown = requests.filter((r) => (tab === "done" ? r.status === "done" : r.status !== "done"));
    if (tab === "new") shown.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const list = $("[data-cat-list]");
    list.textContent = "";
    shown.forEach((r) => {
      const done = r.status === "done";
      const tel = String(r.phone || "").replace(/[^\d+]/g, "");
      const sent = new Date(r.createdAt);
      list.appendChild(el("li", { class: "ticket catering-ticket" + (done ? " is-done" : "") }, [
        el("div", { class: "ticket-top" }, [
          el("span", { class: "ticket-number display", text: prettyDate(r.date) }),
          el("span", { class: "ticket-time", text: "Sent " + sent.toLocaleDateString([], { month: "short", day: "numeric" }) }),
        ]),
        el("p", { class: "ticket-who" }, [
          el("b", { text: r.name }),
          tel ? el("a", { href: "tel:" + tel, text: r.phone }) : null,
          r.email ? el("a", { class: "ticket-email", href: "mailto:" + r.email, text: r.email }) : null,
        ]),
        el("ul", { class: "ticket-items" }, [
          el("li", {}, [el("b", { text: "Guests" }), el("span", { text: String(r.guests) })]),
          r.type ? el("li", {}, [el("b", { text: "Event" }), el("span", { text: r.type })]) : null,
          r.time ? el("li", {}, [el("b", { text: "Time" }), el("span", { text: r.time })]) : null,
          el("li", {}, [el("b", { text: "Where" }), el("span", { text: r.location })]),
        ]),
        r.notes ? el("p", { class: "ticket-notes", text: r.notes }) : null,
        el("div", { class: "ticket-foot" }, [
          el("span", { class: "ticket-total", text: done ? "Handled" : "Needs a reply" }),
          el("button", { type: "button", class: done ? "btn btn-white" : "btn", "data-cat-action": done ? "reopen" : "handled", "data-id": r.id },
            [done ? "Reopen" : "Mark handled"]),
        ]),
      ]));
    });
    $("[data-cat-empty]").hidden = shown.length > 0;
  }

  async function load() {
    clearTimeout(timer);
    if ($("[data-board]").hidden) {
      $("[data-catering]").hidden = true;
      return;
    }
    try {
      const r = await api("GET");
      if (r.status === 200) {
        requests = r.data.requests || [];
        $("[data-catering]").hidden = false;
        render();
      } else if (r.status === 401) {
        $("[data-catering]").hidden = true;
      }
    } catch (e) { /* offline: try again on the next tick */ }
    timer = setTimeout(load, REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // The board shows after sign-in and hides on sign-out; follow it.
    new MutationObserver(load).observe($("[data-board]"), { attributes: true, attributeFilter: ["hidden"] });

    document.querySelectorAll("[data-cat-tab]").forEach((b) => b.addEventListener("click", () => {
      tab = b.getAttribute("data-cat-tab");
      document.querySelectorAll("[data-cat-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      render();
    }));

    $("[data-cat-list]").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-cat-action]");
      if (!b) return;
      b.disabled = true;
      const r = await api("POST", { action: b.getAttribute("data-cat-action"), id: b.getAttribute("data-id") });
      if (r.status === 200) {
        requests = requests.map((x) => (x.id === r.data.request.id ? r.data.request : x));
        render();
      } else {
        b.disabled = false;
        alert(r.data.error || "Couldn't update that request.");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") load();
    });
  });
})();

/* Krave Kulture — order board (admin.html). Signs in against /api/admin, lists orders,
   marks them done, and flips the "Taking orders" switch. Refreshes every 15 seconds and
   beeps when a new order lands. */
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
  const REFRESH_MS = 15000;

  let orders = [];
  let tab = "new";
  let seen = null; // order numbers already shown, to spot new ones
  let timer = null;
  let audio = null;

  async function api(method, body) {
    const res = await fetch("/api/admin", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  function show(view, message) {
    $("[data-login]").hidden = view !== "login";
    $("[data-board]").hidden = view !== "board";
    $("[data-tools]").hidden = view !== "board";
    const setup = $("[data-setup-error]");
    setup.hidden = view !== "setup";
    setup.textContent = view === "setup" ? message : "";
    if (view !== "board") clearInterval(timer);
  }

  function ago(iso) {
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    const d = new Date(iso);
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return new Date().toDateString() === d.toDateString() ? time : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ", " + time;
  }

  function render() {
    const counts = { new: 0, done: 0, all: orders.length };
    orders.forEach((o) => (counts[o.status === "done" ? "done" : "new"] += 1));
    Object.keys(counts).forEach((k) => ($('[data-count="' + k + '"]').textContent = counts[k]));
    document.title = (counts.new ? "(" + counts.new + ") " : "") + "Orders - Krave Kulture";

    const list = $("[data-tickets]");
    list.textContent = "";
    // Open orders oldest first (the next one to cook is on top); others newest first.
    const shown = orders.filter((o) => tab === "all" || (tab === "done" ? o.status === "done" : o.status !== "done"));
    if (tab === "new") shown.reverse();
    shown.forEach((o) => {
      const done = o.status === "done";
      const tel = String(o.phone || "").replace(/[^\d+]/g, "");
      list.appendChild(el("li", { class: "ticket" + (done ? " is-done" : ""), "data-number": o.number }, [
        el("div", { class: "ticket-top" }, [
          el("span", { class: "ticket-number display", text: "#" + o.number }),
          el("span", { class: "ticket-time", text: ago(o.createdAt) }),
        ]),
        el("p", { class: "ticket-who" }, [
          el("b", { text: o.name }),
          tel ? el("a", { href: "tel:" + tel, text: o.phone }) : null,
        ]),
        el("ul", { class: "ticket-items" }, (o.items || []).map((l) =>
          el("li", {}, [
            el("span", {}, [el("b", { text: l.qty + "×" }), " " + l.name + (l.flavor ? " — " + l.flavor : "")]),
            el("span", { text: money(l.lineTotal) }),
          ])
        )),
        o.notes ? el("p", { class: "ticket-notes", text: "Note: " + o.notes }) : null,
        el("div", { class: "ticket-foot" }, [
          el("span", { class: "ticket-total" }, ["Due at truck ", el("b", { text: money(o.total) })]),
          el("button", { type: "button", class: done ? "btn btn-white" : "btn", "data-action": done ? "reopen" : "complete", "data-num": o.number },
            [done ? "Reopen" : "Mark complete"]),
        ]),
      ]));
    });
    $("[data-empty]").hidden = shown.length > 0;
  }

  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22].forEach((t) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, audio.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.18);
        osc.connect(gain).connect(audio.destination);
        osc.start(audio.currentTime + t);
        osc.stop(audio.currentTime + t + 0.2);
      });
    } catch (e) { /* no sound available */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  function setSwitch(open) {
    $("[data-ordering]").checked = open;
    $("[data-ordering-label]").textContent = open ? "Taking orders" : "Not taking orders";
    document.body.dataset.ordering = open ? "open" : "closed";
  }

  async function load() {
    let r;
    try {
      r = await api("GET");
    } catch (e) {
      $("[data-updated]").textContent = "Can't reach the server. Retrying…";
      return;
    }
    if (r.status === 401) return show("login");
    if (r.status !== 200) return show("setup", r.data.error || "Something went wrong.");
    const fresh = r.data.orders || [];
    if (seen) {
      const isNew = fresh.some((o) => !seen.has(o.number) && o.status !== "done");
      if (isNew) beep();
    }
    seen = new Set(fresh.map((o) => o.number));
    orders = fresh;
    setSwitch(Boolean(r.data.open));
    show("board");
    render();
    $("[data-updated]").textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) + ". Refreshes on its own.";
    clearInterval(timer);
    timer = setInterval(load, REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("[data-login]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("[data-login-error]");
      err.hidden = true;
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (x) { /* unlock sound on this tap */ }
      const r = await api("POST", { action: "login", password: e.target.password.value });
      if (r.status === 200) {
        e.target.password.value = "";
        return load();
      }
      err.textContent = r.data.error || "Couldn't sign in.";
      err.hidden = false;
    });

    $("[data-logout]").addEventListener("click", async () => {
      await api("POST", { action: "logout" });
      seen = null;
      show("login");
    });

    $("[data-ordering]").addEventListener("change", async (e) => {
      const want = e.target.checked;
      const ok = window.confirm(want ? "Start taking online orders?" : "Stop taking online orders? Customers will see that ordering is closed.");
      if (!ok) { e.target.checked = !want; return; }
      const r = await api("POST", { action: "ordering", open: want });
      if (r.status === 200) setSwitch(Boolean(r.data.open));
      else { e.target.checked = !want; alert(r.data.error || "Couldn't change that. Try again."); }
    });

    $("[data-tickets]").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-action]");
      if (!b) return;
      b.disabled = true;
      const r = await api("POST", { action: b.getAttribute("data-action"), number: b.getAttribute("data-num") });
      if (r.status === 200) {
        orders = orders.map((o) => (o.number === r.data.order.number ? r.data.order : o));
        render();
      } else {
        b.disabled = false;
        if (r.status === 401) show("login");
        else alert(r.data.error || "Couldn't update that order.");
      }
    });

    document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      tab = b.getAttribute("data-tab");
      document.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      render();
    }));

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !$("[data-board]").hidden) load();
    });

    load();
  });
})();

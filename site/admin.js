/* Krave Kulture — order board (admin.html). Signs in against /api/admin, lists orders,
   marks them done, flips the "Taking orders" switch and per-item sold-out switches.
   Refreshes every 15 seconds. When a new order lands it chimes (again every few seconds
   until someone taps Got it), shows a banner and a notification, and keeps the screen
   awake while the board is open. */
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

  const CHIME_EVERY_MS = 6000;
  const CHIME_FOR_MS = 3 * 60000; // stop nagging after 3 minutes

  let orders = [];
  let items = []; // [{ name, section }] everything that can be marked sold out
  let soldOut = [];
  let alertEmail = "";
  let emailReady = false;
  let tab = "new";
  let seen = null; // order numbers already shown, to spot new ones
  let timer = null;
  let audio = null;
  let pending = []; // new orders nobody has tapped Got it on yet
  let chimeTimer = null;
  let chimeUntil = 0;
  let wakeLock = null;

  const prefs = {
    get(k) { try { return localStorage.getItem("kk_admin_" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("kk_admin_" + k, v); } catch (e) { /* private mode */ } },
  };
  const muted = () => prefs.get("muted") === "1";
  const canNotify = () => "Notification" in window;

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
    const counts = { new: 0, done: 0, all: orders.length, stock: soldOut.length };
    orders.forEach((o) => (counts[o.status === "done" ? "done" : "new"] += 1));
    Object.keys(counts).forEach((k) => ($('[data-count="' + k + '"]').textContent = counts[k]));
    document.title = (pending.length ? "\u{1F514} NEW ORDER " : "") + (counts.new ? "(" + counts.new + ") " : "") + "Orders - Krave Kulture";

    updateAlertsButton();
    const orderTab = tab === "new" || tab === "done" || tab === "all";
    document.querySelectorAll("[data-orders-only]").forEach((n) => (n.hidden = !orderTab));
    document.querySelectorAll("[data-panel]").forEach((n) => (n.hidden = n.getAttribute("data-panel") !== tab));
    if (tab === "stock") { $("[data-empty]").hidden = true; return renderStock(); }
    if (tab === "alerts") { $("[data-empty]").hidden = true; return renderAlerts(); }

    const list = $("[data-tickets]");
    list.textContent = "";
    // Open orders oldest first (the next one to cook is on top); others newest first.
    // Search: any word of the name, the order number, or phone digits. While searching,
    // look across every tab so an order marked done by mistake still turns up.
    const q = $("[data-search]").value.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const matches = (o) => {
      if (!q) return true;
      const words = String(o.name || "").toLowerCase();
      if (words.includes(q.replace(/^#/, ""))) return true;
      if (qDigits && (String(o.number).startsWith(qDigits) || String(o.phone || "").replace(/\D/g, "").includes(qDigits))) return true;
      return false;
    };
    const shown = orders.filter((o) => (q ? true : tab === "all" || (tab === "done" ? o.status === "done" : o.status !== "done")) && matches(o));
    if (tab === "new" && !q) shown.reverse();
    shown.forEach((o) => {
      const done = o.status === "done";
      const tel = String(o.phone || "").replace(/[^\d+]/g, "");
      list.appendChild(el("li", { class: "ticket" + (done ? " is-done" : ""), "data-number": o.number }, [
        el("div", { class: "ticket-top" }, [
          el("span", { class: "ticket-number display", text: "#" + o.number }),
          el("span", { class: "ticket-pay", "data-paid": o.paid ? "yes" : "no", "data-test": o.test ? "yes" : null, text: o.paid ? "Paid" : "Unpaid" }),
          el("span", { class: "ticket-time", text: ago(o.createdAt) }),
        ]),
        el("p", { class: "ticket-who" }, [
          el("b", { text: o.name }),
          tel ? el("a", { href: "tel:" + tel, text: o.phone }) : null,
          o.email ? el("span", { class: "ticket-email", text: o.email }) : null,
        ]),
        el("ul", { class: "ticket-items" }, (o.items || []).map((l) =>
          el("li", {}, [
            el("span", {}, [el("b", { text: l.qty + "×" }), " " + l.name + (l.flavor ? " — " + l.flavor : "")]),
            el("span", { text: money(l.lineTotal) }),
          ])
        )),
        o.tip ? el("p", { class: "ticket-tip", text: "Tip " + money(o.tip) }) : null,
        o.notes ? el("p", { class: "ticket-notes", text: "Note: " + o.notes }) : null,
        el("div", { class: "ticket-foot" }, [
          o.paid
            ? el("span", { class: "ticket-total" }, ["Paid online ", el("b", { text: money(o.paid.amount) })])
            : el("span", { class: "ticket-total" }, ["Due at truck ", el("b", { text: money(o.total) })]),
          el("button", { type: "button", class: done ? "btn btn-white" : "btn", "data-action": done ? "reopen" : "complete", "data-num": o.number },
            [done ? "Reopen" : "Mark complete"]),
        ]),
      ]));
    });
    $("[data-empty]").hidden = shown.length > 0;
    $("[data-empty]").textContent = q ? "No orders match \u201c" + q + "\u201d." : "No orders here.";
  }

  // Sold-out switches, one per item, grouped like the menu.
  function renderStock() {
    const host = $("[data-stock]");
    host.textContent = "";
    let group = null;
    items.forEach((it) => {
      if (!group || group.dataset.section !== it.section) {
        host.appendChild(el("h3", { class: "stock-section", text: it.section }));
        group = host.appendChild(el("ul", { class: "stock-list", "data-section": it.section }));
      }
      const out = soldOut.includes(it.name);
      group.appendChild(el("li", { class: "stock-row" + (out ? " is-out" : "") }, [
        el("label", { class: "switch" }, [
          el("input", { type: "checkbox", "data-stock-item": it.name, checked: out ? null : "" }),
          el("span", { class: "switch-track", "aria-hidden": "true" }),
          el("span", { class: "stock-name", text: it.name }),
        ]),
        el("span", { class: "stock-state", text: out ? "Sold out" : "Available" }),
      ]));
    });
    $("[data-stock-clear]").hidden = soldOut.length === 0;
  }

  function renderAlerts() {
    const list = $("[data-alert-status]");
    list.textContent = "";
    const soundOn = !muted() && audio && audio.state === "running";
    const perm = canNotify() ? Notification.permission : "unsupported";
    const rows = [
      [soundOn, muted() ? "Sound is muted on this device." : soundOn ? "Sound is on." : "Sound is off until you tap Turn on alerts (browsers need a tap first)."],
      [perm === "granted", perm === "granted" ? "Notifications are on." : perm === "denied" ? "Notifications are blocked. Allow them for this site in your browser settings." : perm === "unsupported" ? "This browser can't show notifications here. On iPhone, the chime and the email alert cover it." : "Notifications are off until you tap Turn on alerts."],
      [Boolean(wakeLock), wakeLock ? "Screen stays awake while this page is open." : "navigator" in window && "wakeLock" in navigator ? "Screen can fall asleep. Tap Turn on alerts to keep it awake." : "This browser can't keep the screen awake. Set your phone's auto-lock to Never while you're open."],
    ];
    rows.forEach(([ok, text]) => list.appendChild(el("li", { "data-ok": ok ? "yes" : "no", text })));
    $("[data-alerts-mute]").textContent = muted() ? "Unmute this device" : "Mute this device";
    const input = $("#a-alert-email");
    if (document.activeElement !== input) input.value = alertEmail;
    if (!emailReady) $("[data-alert-email-note]").textContent = "Email isn't set up on the site yet, so alert emails can't send.";
  }

  function updateAlertsButton() {
    const soundOn = muted() || (audio && audio.state === "running");
    const notifyOn = !canNotify() || Notification.permission !== "default";
    $("[data-alerts-on]").hidden = Boolean(soundOn && notifyOn);
  }

  // Needs a tap: browsers only allow sound and the notification prompt after one.
  async function enableAlerts() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== "running") await audio.resume();
    } catch (e) { /* no sound available */ }
    if (muted()) prefs.set("muted", "0");
    chime();
    if (canNotify() && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch (e) { /* old Safari */ }
    }
    await keepAwake();
    render();
  }

  async function keepAwake() {
    if (wakeLock || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }

  // Three rising notes, loud enough to hear over the fryer.
  function chime() {
    if (muted()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      [[0, 784], [0.18, 988], [0.36, 1319]].forEach(([t, f]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "square";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, audio.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.28);
        osc.connect(gain).connect(audio.destination);
        osc.start(audio.currentTime + t);
        osc.stop(audio.currentTime + t + 0.3);
      });
    } catch (e) { /* no sound available */ }
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
  }

  function itemsLine(o) {
    return (o.items || []).map((l) => l.qty + "× " + l.name).join(", ");
  }

  // Phones only show notifications through a service worker; desktops take either.
  let worker = null;
  function registerWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" })
      .then((reg) => { worker = reg; })
      .catch(() => {});
  }

  function notify(o) {
    if (!canNotify() || Notification.permission !== "granted") return;
    const title = "New order #" + o.number + " · " + o.name;
    const opts = {
      body: itemsLine(o) + (o.paid ? " · Paid" : " · Pay at truck"),
      tag: "kk-order-" + o.number,
      icon: "images/logo-150.jpg",
      requireInteraction: true,
    };
    if (worker && worker.showNotification) return worker.showNotification(title, opts).catch(() => {});
    try {
      const n = new Notification(title, opts);
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) { /* this browser only allows worker notifications */ }
  }

  function alertNew(fresh) {
    pending = pending.concat(fresh);
    fresh.forEach(notify);
    const last = fresh[fresh.length - 1];
    $("[data-alert-title]").textContent = pending.length > 1 ? pending.length + " new orders!" : "New order!";
    $("[data-alert-text]").textContent = "#" + last.number + " " + last.name + ": " + itemsLine(last);
    $("[data-alert]").hidden = false;
    chime();
    chimeUntil = Date.now() + CHIME_FOR_MS;
    clearInterval(chimeTimer);
    chimeTimer = setInterval(() => {
      if (!pending.length || Date.now() > chimeUntil) return clearInterval(chimeTimer);
      chime();
    }, CHIME_EVERY_MS);
  }

  function ackAlert() {
    pending = [];
    clearInterval(chimeTimer);
    $("[data-alert]").hidden = true;
    render();
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
    const arrived = seen ? fresh.filter((o) => !seen.has(o.number) && o.status !== "done").reverse() : [];
    seen = new Set(fresh.map((o) => o.number));
    orders = fresh;
    items = r.data.items || [];
    soldOut = r.data.soldOut || [];
    alertEmail = r.data.alertEmail || "";
    emailReady = Boolean(r.data.emailReady);
    setSwitch(Boolean(r.data.open));
    show("board");
    if (arrived.length) alertNew(arrived);
    render();
    keepAwake();
    $("[data-updated]").textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) + ". Refreshes on its own.";
    clearInterval(timer);
    timer = setInterval(load, REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("[data-login]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("[data-login-error]");
      err.hidden = true;
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (x) { /* unlock sound on this tap */ }
      if (canNotify() && Notification.permission === "default") Notification.requestPermission().catch(() => {});
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
      ackAlert();
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
        pending = pending.filter((o) => o.number !== r.data.order.number);
        if (!pending.length) ackAlert();
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

    $("[data-search]").addEventListener("input", render);

    $("[data-stock]").addEventListener("change", async (e) => {
      const box = e.target.closest("[data-stock-item]");
      if (!box) return;
      const name = box.getAttribute("data-stock-item");
      box.disabled = true;
      const r = await api("POST", { action: "soldout", name, out: !box.checked });
      if (r.status === 200) soldOut = r.data.soldOut;
      else if (r.status === 401) return show("login");
      else alert(r.data.error || "Couldn't change that. Try again.");
      render();
    });

    $("[data-stock-clear]").addEventListener("click", async () => {
      if (!window.confirm("Mark everything as available again?")) return;
      const r = await api("POST", { action: "soldout-clear" });
      if (r.status === 200) soldOut = r.data.soldOut;
      else alert(r.data.error || "Couldn't change that. Try again.");
      render();
    });

    $("[data-alerts-on]").addEventListener("click", enableAlerts);
    $("[data-alerts-enable]").addEventListener("click", enableAlerts);
    $("[data-alerts-test]").addEventListener("click", () => {
      if (muted()) prefs.set("muted", "0");
      chime();
      render();
    });
    $("[data-alerts-mute]").addEventListener("click", () => {
      prefs.set("muted", muted() ? "0" : "1");
      if (muted()) clearInterval(chimeTimer);
      render();
    });
    $("[data-alert-ack]").addEventListener("click", ackAlert);

    $("[data-alert-email-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("[data-alert-email-error]");
      const saved = $("[data-alert-email-saved]");
      err.hidden = true;
      saved.textContent = "";
      const r = await api("POST", { action: "alertemail", email: e.target.email.value });
      if (r.status !== 200) {
        if (r.status === 401) return show("login");
        err.textContent = r.data.error || "Couldn't save that. Try again.";
        err.hidden = false;
        return;
      }
      alertEmail = r.data.alertEmail;
      e.target.email.value = alertEmail;
      saved.textContent = !alertEmail ? "Alert emails are off."
        : r.data.tested ? "Saved. We sent a test email to " + alertEmail + ". Not there in a minute? Check spam and mark it Not spam."
        : "Saved, but the test email didn't send. Email may not be set up on the site.";
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !$("[data-board]").hidden) load();
    });

    registerWorker();
    load();
  });
})();

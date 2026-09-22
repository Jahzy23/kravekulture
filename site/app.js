/* Krave Kulture — renders menu, payments and location from menu-data.js */
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
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  };
  const slug = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const ICONS = {
    cashapp:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 9.2c-.8-.7-1.9-1.1-3-1.1-1.8 0-3 .9-3 2.1 0 2.8 6 1.4 6 4.3 0 1.3-1.3 2.2-3.1 2.2-1.3 0-2.5-.4-3.4-1.2"/><path d="M12 6.5V8m0 8v1.5"/></svg>',
    zelle:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h8l-8 8h8"/><path d="M12 6v2m0 8v2"/></svg>',
    venmo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 8l2.6 9h3.2c1.4-2.2 2.4-4.6 2.4-6.6 0-.9-.2-1.7-.6-2.4"/></svg>',
    applepay:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/></svg>',
    card:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/><path d="M15.5 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z"/></svg>',
    cash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>',
    copy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
  };

  function priceNode(price) {
    if (price === null || price === undefined || price === "") return null;
    const node = el("span", { class: "row-price" });
    if (typeof price === "number") {
      node.appendChild(el("small", { text: "$" }));
      node.appendChild(document.createTextNode(String(price)));
    } else {
      node.textContent = price;
    }
    return node;
  }

  function renderMenu() {
    const host = $("#menu-sections");
    const rail = $("#rail-links");
    if (!host || typeof MENU === "undefined") return;

    if (!MENU.length) {
      host.appendChild(
        el("div", { class: "wrap empty" }, [
          document.createTextNode("Menu coming soon."),
          el("small", { text: "Ask at the window for today's plates and prices." }),
        ])
      );
    }

    MENU.forEach((section) => {
      const id = slug(section.title);
      const board = ["red", "blue", "gold", "black"].includes(section.board) ? section.board : "red";

      if (rail) rail.appendChild(el("a", { href: "#" + id, text: section.title }));

      const head = el("div", { class: "board board-" + board }, [
        el("div", { class: "wrap" }, [
          el("div", { class: "board-head" }, [
            el("h2", { class: "display board-title", text: section.title }),
            section.kreyol ? el("span", { class: "board-kreyol", text: section.kreyol }) : null,
          ]),
          section.note ? el("p", { class: "board-note", text: section.note }) : null,
          section.choices && section.choices.options && section.choices.options.length
            ? el("p", { class: "board-choices" }, [
                el("b", { text: section.choices.label || "Choose" }),
                ...section.choices.options.map((o) => el("span", { class: "choice", text: o })),
              ])
            : null,
        ]),
      ]);

      const list = el("ul", { class: "price-board" });
      section.items.forEach((item) => {
        const tag = item.tag ? String(item.tag).toLowerCase() : null;
        const name = el("span", { class: "row-name" }, [
          el("span", { text: item.name }),
          tag ? el("span", { class: "sticker", "data-kind": tag, text: tag }) : null,
          item.price !== null && item.price !== undefined && item.price !== ""
            ? el("span", { class: "leader", "aria-hidden": "true" })
            : null,
        ]);
        const li = el("li", { class: "row", "data-tag": tag }, [
          name,
          priceNode(item.price),
          item.desc ? el("p", { class: "row-desc", text: item.desc }) : null,
        ]);
        list.appendChild(li);
      });

      const bodyKids = [];
      if (section.photo) {
        bodyKids.push(
          el("figure", { class: "plate" }, [
            el("img", {
              src: section.photo,
              alt: section.photoAlt || section.title,
              loading: "lazy",
              width: "640",
              height: "480",
            }),
            el("figcaption", { text: section.title }),
          ])
        );
      }
      bodyKids.push(list);
      const body = el("div", { class: "wrap stall-body" + (section.photo ? "" : " no-plate") }, bodyKids);

      host.appendChild(el("section", { class: "stall", id: id, "aria-labelledby": id + "-title" }, [head, body]));
      head.querySelector("h2").id = id + "-title";
    });

    const tape = $("#sample-tape");
    if (tape) tape.dataset.on = typeof MENU_STATUS !== "undefined" && MENU_STATUS === "draft" ? "true" : "false";
  }

  function renderPayments() {
    const host = $("#pay-list");
    if (!host || typeof PAYMENTS === "undefined") return;
    PAYMENTS.forEach((p) => {
      const isFill = /FILL-IN/i.test(p.handle);
      const handleText = el("span", { class: "pay-handle" });
      if (isFill) {
        handleText.appendChild(el("mark", { class: "pay-fill", text: p.handle }));
      } else if (p.link) {
        handleText.appendChild(el("a", { href: p.link, target: "_blank", rel: "noopener", text: p.handle }));
      } else {
        handleText.textContent = p.handle;
      }
      const copyable = !isFill && ["cashapp", "zelle", "venmo"].includes(p.kind);
      const btn = el("button", {
        class: "pay-copy",
        type: "button",
        "aria-label": "Copy " + p.label + " " + p.handle,
        disabled: copyable ? null : "disabled",
        html: ICONS.copy + "<span>Copy</span>",
      });
      if (copyable) {
        btn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(p.handle);
            btn.dataset.state = "copied";
            btn.querySelector("span").textContent = "Copied";
            setTimeout(() => {
              delete btn.dataset.state;
              btn.querySelector("span").textContent = "Copy";
            }, 1800);
          } catch (e) {
            btn.querySelector("span").textContent = "Select it";
          }
        });
      }
      host.appendChild(
        el("li", { class: "pay" }, [
          el("span", { class: "pay-icon", html: ICONS[p.kind] || ICONS.cash }),
          el("span", { class: "pay-label", text: p.label }),
          copyable || isFill ? btn : el("span"),
          handleText,
        ])
      );
    });
  }

  function renderLocation() {
    if (typeof LOCATION === "undefined") return;
    document.querySelectorAll("[data-ig-link]").forEach((a) => (a.href = LOCATION.instagram));
    document.querySelectorAll("[data-ig-handle]").forEach((n) => (n.textContent = LOCATION.handle));
    document.querySelectorAll("[data-city]").forEach((n) => (n.textContent = LOCATION.city));
    const txt = $("[data-location-text]");
    if (txt) txt.textContent = LOCATION.text;
    const phoneWrap = $("[data-phone-wrap]");
    if (phoneWrap) {
      if (LOCATION.phone) {
        const a = phoneWrap.querySelector("a");
        a.href = "tel:" + LOCATION.phone.replace(/[^\d+]/g, "");
        a.querySelector("span").textContent = LOCATION.phone;
      } else {
        phoneWrap.remove();
      }
    }
  }

  function scrollSpy() {
    const links = Array.from(document.querySelectorAll("#rail-links a, .bar a[href^='#']"));
    if (!links.length) return;
    const pairs = links
      .map((a) => ({ a, el: document.getElementById(a.getAttribute("href").slice(1)) }))
      .filter((p) => p.el);
    const sections = [];
    pairs.forEach((p) => {
      if (!sections.includes(p.el)) sections.push(p.el);
    });
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.scrollY + Math.min(window.innerHeight * 0.4, 320);
      let current = sections[0];
      sections.forEach((s) => {
        if (s.offsetTop <= line) current = s;
      });
      const bottomed = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      if (bottomed) current = sections[sections.length - 1];
      pairs.forEach(({ a, el }) => {
        const on = el === current;
        if (on) {
          if (a.getAttribute("aria-current") !== "true") {
            a.setAttribute("aria-current", "true");
            if (a.closest("#rail-links")) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
          }
        } else {
          a.removeAttribute("aria-current");
        }
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  function railHint() {
    const rail = $("#rail-links");
    if (!rail) return;
    const update = () => {
      const more = rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 4;
      rail.dataset.more = more ? "true" : "false";
    };
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function year() {
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderMenu();
    renderPayments();
    renderLocation();
    scrollSpy();
    railHint();
    year();
  });
})();

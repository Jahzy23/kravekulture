/* Krave Kulture — renders menu and location from menu-data.js */
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
      (section.items || []).forEach((item) => {
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
            // No width/height attributes on purpose: the photos are portrait JPEGs and
            // styles.css fixes the box with aspect-ratio + object-fit, so there is no
            // layout shift and no wrong intrinsic size to lie about.
            el("img", {
              src: section.photo,
              alt: section.photoAlt || section.title,
              loading: "lazy",
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
        // The wrapper is the <a> itself in menu.html; tolerate a wrapping element too.
        const a = phoneWrap.matches("a") ? phoneWrap : phoneWrap.querySelector("a");
        if (a) {
          a.href = "tel:" + LOCATION.phone.replace(/[^\d+]/g, "");
          a.setAttribute("aria-label", "Call us at " + LOCATION.phone);
        }
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
    // The bar's "Menu" link points at the #menu-sections container, which starts at the
    // same offsetTop as the first stall. Spy on the leaf sections only and light the
    // container's link whenever the current leaf sits inside it — otherwise the
    // container (last in DOM order) would win every comparison after the first stall.
    const leaves = sections.filter((s) => !sections.some((o) => o !== s && s.contains(o)));
    const smoothOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Keep the active link centred in the rail's horizontal scroller by scrolling THAT
    // element only. scrollIntoView() also scrolls the window, and because the sticky
    // rail sits inside html's scroll-padding-top zone Chrome treats the link as off
    // screen and "corrects" the page ~100px upward on every section change: scrolling
    // down past a boundary threw you back above it, the spy flipped, and it repeated.
    const rail = $("#rail-links");
    const centerInRail = (a) => {
      if (!rail) return;
      const r = rail.getBoundingClientRect();
      const b = a.getBoundingClientRect();
      const left = Math.max(0, rail.scrollLeft + (b.left - r.left) - (r.width - b.width) / 2);
      try { rail.scrollTo({ left, behavior: smoothOk ? "smooth" : "auto" }); } catch (e) { rail.scrollLeft = left; }
    };
    // Anchor rule. A section counts as "current" from the moment it sits where an
    // anchor jump would park it: its scroll-margin box tucked under the scrollport's
    // scroll-padding (the sticky rail). Measuring with the same two CSS values the
    // browser uses for `href="#id"` means tapping a rail link always lights that same
    // link — the old "40% down the viewport" line lit the NEXT section for anything
    // shorter than ~320px (Sides, Dessert).
    let pad = 0;
    let margins = new Map();
    const measure = () => {
      pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      margins = new Map(leaves.map((s) => [s, parseFloat(getComputedStyle(s).scrollMarginTop) || 0]));
    };
    measure();
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const line = y + pad + 2; // 2px: sub-pixel rounding after a smooth scroll settles
      let current = leaves[0];
      let best = -Infinity;
      leaves.forEach((s) => {
        // Live rect, not offsetTop: lazy-loaded plate photos shift everything below them.
        const snap = s.getBoundingClientRect().top + y - (margins.get(s) || 0);
        if (snap <= line && snap >= best) { best = snap; current = s; }
      });
      const bottomed = window.innerHeight + y >= document.documentElement.scrollHeight - 2;
      if (bottomed) current = leaves[leaves.length - 1];
      pairs.forEach(({ a, el }) => {
        const on = el === current || (el !== current && el.contains(current));
        if (on) {
          if (a.getAttribute("aria-current") !== "true") {
            a.setAttribute("aria-current", "true");
            if (a.closest("#rail-links")) centerInRail(a);
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
    window.addEventListener("resize", () => { measure(); onScroll(); });
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
    // Each step runs on its own so one bad menu-data.js entry (say a section with no
    // items) cannot take the Call button or the scroll spy down with it.
    [renderMenu, renderLocation, scrollSpy, railHint, year].forEach((step) => {
      try { step(); } catch (e) { console.error("[krave] " + step.name + " failed:", e); }
    });
  });
})();

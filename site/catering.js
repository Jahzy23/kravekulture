/* Krave Kulture — catering request form (catering.html). Sends the event details to
   /api/catering, which saves them for the admin board and emails the truck. */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  // Local date as YYYY-MM-DD (toISOString would use UTC and can be a day off at night).
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  function showError(msg, field) {
    const box = $("[data-catering-error]");
    box.textContent = msg || "";
    box.hidden = !msg;
    if (field) field.focus();
  }

  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    showError("");
    const data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      date: form.date.value,
      time: form.time.value.trim(),
      location: form.location.value.trim(),
      guests: Number(form.guests.value),
      type: form.type.value,
      notes: form.notes.value.trim(),
      website: form.website.value,
    };
    const digits = data.phone.replace(/\D/g, "");
    if (data.name.length < 2) return showError("Please add your name.", form.name);
    if (digits.length < 10 || digits.length > 11) return showError("Please add a phone number we can reach you on (10 digits).", form.phone);
    if (!data.date) return showError("Please pick the date of your event.", form.date);
    if (data.date < ymd(new Date())) return showError("That date has already passed. Please pick an upcoming date.", form.date);
    if (data.location.length < 3) return showError("Please tell us where the event is (an address or the area).", form.location);
    if (!Number.isInteger(data.guests) || data.guests < 1) return showError("Please add about how many guests you're expecting.", form.guests);

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showError(body.error || "Something went wrong. Please call or DM us on Instagram.");
      form.hidden = true;
      const done = $("[data-catering-done]");
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      showError("We couldn't send your request. Check your connection and try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send request";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
    const a = $("[data-phone-link]");
    if (a && typeof LOCATION !== "undefined" && LOCATION.phone) a.href = "tel:" + LOCATION.phone.replace(/[^\d+]/g, "");
    else if (a) a.replaceWith(document.createTextNode("DM us on Instagram"));
    const form = $("[data-catering-form]");
    form.date.min = ymd(new Date());
    form.addEventListener("submit", submit);
  });
})();

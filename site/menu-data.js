/* =====================================================================
   KRAVE KULTURE — MENU DATA
   This is the ONLY file you edit to change the menu, this week's spot,
   city or phone.

   1. MENU_STATUS: "live" shows the menu as real. "draft" adds a
      SAMPLE MENU tape across the top so nobody trusts placeholder prices.
   2. Each section: { title, kreyol, board, note, choices, photo, items }
        board   → "red" | "blue" | "gold" | "black"  (signboard color)
        choices → optional { label, options: [...] }  (e.g. wing flavors)
        photo   → optional file in images/, shown beside the price board
   3. Each item: { name, desc, price, tag }
        price → number (20) or text ("MKT", "12 / 16"). null hides it.
        tag   → optional: "sold out", "popular", "spicy", "new"
   4. SPOT: this week's spot. See the SPOT block at the bottom of this file.
   ===================================================================== */

const MENU_STATUS = "live"; // "live" | "draft"

const MENU = [
  {
    title: "Plates",
    kreyol: "Pla konplè",
    board: "red",
    note: "Every dinner comes with rice, meat, plantain and mac.",
    photo: "images/dinner-plate.jpg",
    photoAlt: "Dinner plate: chicken with peppers and onions, rice and beans, baked mac and cheese, and fried plantain",
    items: [
      { name: "Griot Dinner", desc: "Fried pork.", price: 20 },
      { name: "Turkey Dinner", desc: "Tasso turkey.", price: 20 },
      { name: "Goat Dinner", desc: "Kabrit.", price: 25 },
      { name: "Shrimp Dinner", desc: "", price: 22 },
      { name: "Chicken Dinner", desc: "Poul.", price: 20 },
      { name: "Boulet Dinner", desc: "Haitian meatballs.", price: 20 },
      { name: "Rib Dinner", desc: "", price: 20 },
    ],
  },
  {
    title: "Sides",
    kreyol: "Akonpayman",
    board: "gold",
    note: "",
    items: [
      { name: "Side of Mac", desc: "", price: 6 },
      { name: "Side of Rice", desc: "", price: 5 },
    ],
  },
  {
    title: "Wings & Fries",
    kreyol: "Zèl ak frit",
    board: "blue",
    note: "All wings come with fries. Pick your flavor.",
    choices: { label: "Flavors", options: ["Honey Hot", "Lemon Pepper", "BBQ", "Buffalo", "Jerk", "Plain"] },
    photo: "images/wings-plate.jpg",
    photoAlt: "Sauced wings with seasoned fries and street corn",
    items: [
      { name: "6 Pieces", desc: "With fries.", price: 12 },
      { name: "8 Pieces", desc: "With fries.", price: 14 },
      { name: "10 Pieces", desc: "With fries.", price: 16 },
    ],
  },
  {
    title: "Dessert",
    kreyol: "Desè",
    board: "black",
    note: "",
    items: [{ name: "Banana Pudding", desc: "", price: 6 }],
  },
  {
    title: "Drinks",
    kreyol: "Bwason",
    board: "red",
    note: "",
    items: [
      { name: "Kravelade", desc: "House lemonade.", price: 5 },
      { name: "Passion Fruit", desc: "", price: 5 },
      { name: "Soda", desc: "", price: 2 },
      { name: "Water", desc: "", price: 1 },
    ],
  },
];

/* Links, phone and the fallback sentence. Do NOT type a location here: this text
   never expires. This week's spot goes in SPOT below. */
const LOCATION = {
  headline: "Find the truck",
  text: "We move. Today's spot is always on Instagram.",
  instagram: "https://www.instagram.com/eatkravekulture/",
  handle: "@eatkravekulture",
  tiktok: "https://www.tiktok.com/@eatkravekulture1804", // leave empty to hide the TikTok button
  phone: "786-999-4019", // leave empty to hide the Call us button; the number itself only lives in the tel: link
  city: "Miami, FL",
};

/* ---------------------------------------------------------------------
   SPOT — this week's location. Shown on menu.html (Find the Truck) and on
   the home page's truck scene for SPOT_FRESH_DAYS (7) days after the date in
   `updated`, whatever `when` says. After that it hides itself and both pages
   go back to "check Instagram". If the plan changes or the spot is over
   early, change or clear `where` and redeploy. Leave `where` empty to hide it.
   --------------------------------------------------------------------- */
const SPOT = {
  updated: "", // today's date, exactly YYYY-MM-DD with zeros, e.g. "2026-10-06".
               // 10/06/2026 or 2026-10-6 is not understood and hides the spot.
  where: "",   // e.g. "Little Haiti, NE 2nd Ave & 59th St"
  when: "",    // e.g. "Fri to Sun, 12 to 8pm"
  mapUrl: "",  // optional: paste the full https:// link from Google Maps > Share
               // to get a Map link next to the spot.
};
const SPOT_FRESH_DAYS = 7;

// One rule for both pages: a spot counts only with a place and a date no older than
// SPOT_FRESH_DAYS (and not from the future, which would be a typo in the year).
function spotIsFresh(spot, now) {
  if (!spot || !spot.where || !spot.updated) return false;
  const t = Date.parse(spot.updated + "T12:00:00");
  const age = (now || Date.now()) - t;
  return Number.isFinite(t) && age >= -864e5 && age <= SPOT_FRESH_DAYS * 864e5;
}

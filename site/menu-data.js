/* =====================================================================
   KRAVE KULTURE — MENU DATA
   This is the ONLY file you edit to change the menu, city or phone.

   1. MENU_STATUS: "live" shows the menu as real. "draft" adds a
      SAMPLE MENU tape across the top so nobody trusts placeholder prices.
   2. Each section: { title, kreyol, board, note, choices, photo, items }
        board   → "red" | "blue" | "gold" | "black"  (signboard color)
        choices → optional { label, options: [...] }  (e.g. wing flavors)
        photo   → optional file in images/, shown beside the price board
   3. Each item: { name, desc, price, tag }
        price → number (20) or text ("MKT", "12 / 16"). null hides it.
        tag   → optional: "sold out", "popular", "spicy", "new"
   ===================================================================== */

const MENU_STATUS = "live"; // "live" | "draft"

const MENU = [
  {
    title: "Plates",
    kreyol: "Pla konplè",
    board: "red",
    note: "Every complete comes with rice, meat, plantain and mac.",
    photo: "images/griot-plate.jpg",
    photoAlt: "Griot complete: fried pork, rice, fried plantains, macaroni and pikliz",
    items: [
      { name: "Griot Complete", desc: "Fried pork.", price: 20 },
      { name: "Turkey Complete", desc: "Kodenn.", price: 20 },
      { name: "Goat Complete", desc: "Kabrit.", price: 25 },
      { name: "Shrimp Complete", desc: "Kribich.", price: 22 },
      { name: "Chicken Complete", desc: "Poul.", price: 20 },
      { name: "Boulet Complete", desc: "Haitian meatballs.", price: 20 },
      { name: "Rib Complete", desc: "", price: 20 },
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
    choices: { label: "Flavors", options: ["Honey Hot", "Lemon Pepper", "BBQ", "Buffalo"] },
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
      { name: "Soda", desc: "", price: 1 },
      { name: "Water", desc: "", price: 1 },
    ],
  },
];

/* Where the truck is. Update per event or point people to Instagram. */
const LOCATION = {
  headline: "Find the truck",
  text: "We move. Today's spot is always on Instagram.",
  instagram: "https://www.instagram.com/eatkravekulture/",
  handle: "@eatkravekulture",
  phone: "786-999-4019", // leave empty to hide the Call us button; the number itself only lives in the tel: link
  city: "Miami, FL",
};

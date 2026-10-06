/* Krave Kulture — homepage scroll-world config. Edit scene copy/order here. */
// This week's spot comes from menu-data.js (SPOT) under the same 7-day rule as the menu page.
var spot = (typeof SPOT !== 'undefined' && typeof spotIsFresh === 'function' && spotIsFresh(SPOT)) ? SPOT : null;
mountScrollWorld(document.getElementById('world'), {
  brand: { name: 'Krave Kulture', href: '#top' },
  cta: { label: 'Menu', href: 'menu.html' },
  // No scroll-cue affordance: the diorama itself signals there's more (design taste pass).
  hint: false,
  diveScroll: 1.3,
  connScroll: 0.9,
  sections: [
    {
      id: 'market', label: 'Market',
      still: 'world/market.webp',
      stillSrcset: 'world/market-900.webp 900w, world/market-1200.webp 1200w, world/market.webp 1800w',
      accent: '#c4261d',
      scroll: 1.5, linger: 0.3,
      eyebrow: 'From the market',
      title: 'It starts in Little Haiti.',
      body: 'Plantains, scotch bonnets, cabbage for the pikliz. Picked fresh and cooked the way home does it.',
      tags: ['Haitian', 'Caribbean', 'Soul food'],
    },
    {
      id: 'kitchen', label: 'Kitchen',
      still: 'world/kitchen.webp',
      stillSrcset: 'world/kitchen-900.webp 900w, world/kitchen-1200.webp 1200w, world/kitchen.webp 1800w',
      accent: '#18359c',
      eyebrow: 'In the trailer',
      title: 'Griot fried crisp. Wings sauced hot.',
      body: 'One small kitchen on wheels. Everything cooked to order while you wait at the window.',
      tags: ['Cooked to order'],
    },
    {
      id: 'truck', label: 'The truck',
      still: 'world/truck.webp',
      stillSrcset: 'world/truck-900.webp 900w, world/truck-1200.webp 1200w, world/truck.webp 1800w',
      accent: '#111111',
      scroll: 1.5, linger: 0.35,
      eyebrow: 'Find the truck',
      title: 'Same truck. New spot every week.',
      body: spot
        ? 'This week: ' + spot.where + '. ' + (spot.when ? spot.when + '. ' : '') + 'Day-of changes are posted on Instagram.'
        : 'We move around Miami. Today’s location is always on Instagram.',
      tags: ['Miami, FL', '@eatkravekulture'],
    },
    {
      id: 'plate', label: 'The dinner',
      still: 'world/plate.webp?v=2',   // ?v= busts the 7-day cache when the still is regenerated in place
      stillSrcset: 'world/plate-900.webp?v=2 900w, world/plate-1200.webp?v=2 1200w, world/plate.webp?v=2 1800w',
      accent: '#c4261d',
      scroll: 1.6, linger: 0.4,
      eyebrow: 'The dinner',
      title: 'Rice. Meat. Plantain. Mac.',
      body: 'Every dinner comes with rice, meat, plantain and mac. Griot, goat, turkey, shrimp, chicken, boulet or rib.',
      tags: ['7 dinners', 'From $20'],
    },
    {
      id: 'wings', label: 'Wings',
      still: 'world/wings.webp?v=2',
      stillSrcset: 'world/wings-900.webp?v=2 900w, world/wings-1200.webp?v=2 1200w, world/wings.webp?v=2 1800w',
      accent: '#18359c',
      eyebrow: 'Wings & fries',
      title: 'Six flavors. Pick your heat.',
      body: 'Honey hot, lemon pepper, BBQ, buffalo, jerk or plain. Six, eight or ten pieces, fries included.',
      tags: ['6 / 8 / 10 pc', 'From $12'],
    },
    {
      id: 'finale', label: 'Sweet finish',
      still: 'world/finale.webp',
      stillSrcset: 'world/finale-900.webp 900w, world/finale-1200.webp 1200w, world/finale.webp 1800w',
      accent: '#111111',
      scroll: 1.6, linger: 0.4,
      eyebrow: 'Sweet finish',
      title: 'Banana pudding and a cold Kravelade.',
      body: 'Krave it. Taste it. Live the Kulture.',
      tags: [],
      cta: { primary: { label: 'See the menu', href: 'menu.html' },
             secondary: { label: 'Find the truck', href: 'menu.html#find' } },
      links: [{ label: 'Terms', href: 'terms.html' }, { label: 'Privacy', href: 'privacy.html' }],
    },
  ],
  // Video chain not rendered yet (stills-only build). When the dive/connector clips exist,
  // add clip: 'world/vid/<id>.mp4' per section and list world/vid/conn1..5.mp4 here.
  connectors: [],
});

// Swap the engine's generic brand mark for the badge.
(function () {
  var mark = document.querySelector('.sw-brand__mark');
  if (!mark) return;
  var img = document.createElement('img');
  img.className = 'sw-brand__badge';
  img.src = 'images/logo-300.webp';   // drawn at 44px; 300px covers 3x screens, 512 was 54 KB for nothing
  img.alt = '';
  img.width = 44; img.height = 44;
  mark.replaceWith(img);
})();

/* Krave Kulture — homepage scroll-world config. Edit scene copy/order here. */
mountScrollWorld(document.getElementById('world'), {
  brand: { name: 'Krave Kulture', href: '#top' },
  cta: { label: 'Menu', href: 'menu.html' },
  hint: 'Scroll to fly in',
  diveScroll: 1.3,
  connScroll: 0.9,
  sections: [
    {
      id: 'market', label: 'Market',
      still: 'world/market.webp',
      stillSrcset: 'world/market-900.webp 900w, world/market.webp 1800w',
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
      stillSrcset: 'world/kitchen-900.webp 900w, world/kitchen.webp 1800w',
      accent: '#18359c',
      eyebrow: 'In the trailer',
      title: 'Griot fried crisp. Wings sauced hot.',
      body: 'One small kitchen on wheels. Everything cooked to order while you wait at the window.',
      tags: ['Cooked to order'],
    },
    {
      id: 'truck', label: 'The truck',
      still: 'world/truck.webp',
      stillSrcset: 'world/truck-900.webp 900w, world/truck.webp 1800w',
      accent: '#111111',
      scroll: 1.5, linger: 0.35,
      eyebrow: 'Find the truck',
      title: 'Same truck. New spot every week.',
      body: 'We move around Miami. Today’s location is always on Instagram.',
      tags: ['Miami, FL', '@eatkravekulture'],
    },
    {
      id: 'plate', label: 'The complete',
      still: 'world/plate.webp',
      stillSrcset: 'world/plate-900.webp 900w, world/plate.webp 1800w',
      accent: '#c4261d',
      scroll: 1.6, linger: 0.4,
      eyebrow: 'The complete',
      title: 'Rice. Meat. Plantain. Mac.',
      body: 'Every plate comes complete. Griot, goat, turkey, shrimp, chicken, boulet or rib.',
      tags: ['7 completes', 'From $20'],
    },
    {
      id: 'wings', label: 'Wings',
      still: 'world/wings.webp',
      stillSrcset: 'world/wings-900.webp 900w, world/wings.webp 1800w',
      accent: '#18359c',
      eyebrow: 'Wings & fries',
      title: 'Four flavors. Pick your heat.',
      body: 'Honey hot, lemon pepper, BBQ or buffalo. Six, eight or ten pieces, fries included.',
      tags: ['6 / 8 / 10 pc', 'From $12'],
    },
    {
      id: 'finale', label: 'Sweet finish',
      still: 'world/finale.webp',
      stillSrcset: 'world/finale-900.webp 900w, world/finale.webp 1800w',
      accent: '#111111',
      scroll: 1.6, linger: 0.4,
      eyebrow: 'Sweet finish',
      title: 'Banana pudding and a cold Kravelade.',
      body: 'Krave it. Taste it. Live the Kulture.',
      tags: [],
      cta: { primary: { label: 'See the menu', href: 'menu.html' },
             secondary: { label: 'How to pay', href: 'menu.html#pay' } },
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
  img.src = 'images/logo-512.webp';
  img.alt = '';
  img.width = 44; img.height = 44;
  mark.replaceWith(img);
})();

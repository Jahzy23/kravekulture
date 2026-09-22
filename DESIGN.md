---
name: Krave Kulture
description: A Little Haiti storefront on a whitewashed wall; painted signboards, price boards on ink rules, the owner's plates as proof.
colors:
  whitewash: "#f6f4ee"
  whitewash-deep: "#ebe7dc"
  ink: "#111111"
  ink-soft: "#55534e"
  red: "#c4261d"
  red-deep: "#9e1d16"
  red-tint: "#fbe3e0"
  blue: "#18359c"
  blue-deep: "#10256e"
  blue-tint: "#dfe4f7"
  gold: "#f2b632"
  gold-deep: "#c98f12"
  gold-tint: "#6b4a05"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Bungee, Impact, Arial Narrow, sans-serif"
    fontSize: "clamp(2.35rem, 11vw, 5.6rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Bungee, Impact, Arial Narrow, sans-serif"
    fontSize: "clamp(1.7rem, 7vw, 3.1rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.01em"
  title:
    fontFamily: "Big Shoulders Text, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.03em"
  price:
    fontFamily: "Bungee, Impact, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Big Shoulders Text, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Big Shoulders Text, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
  control:
    fontFamily: "Bungee, Impact, Arial Narrow, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  none: "0"
  badge: "50%"
spacing:
  rule: "3px"
  gutter: "clamp(16px, 4vw, 40px)"
  awning: "44px"
  bar-h: "64px"
  row: "14px 0 13px"
  board: "clamp(16px, 3vw, 26px) 0 clamp(14px, 3vw, 22px)"
  stall-tail: "clamp(28px, 5vw, 44px)"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "16px 20px 14px"
  button-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "16px 20px 14px"
  button-red:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "16px 20px 14px"
  button-white:
    backgroundColor: "{colors.whitewash}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "16px 20px 14px"
  copy-control:
    backgroundColor: "{colors.whitewash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 12px 10px"
  copy-control-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.gold}"
  copy-control-copied:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  sticker:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 7px 3px"
  sticker-sold-out:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
  sticker-spicy:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
  sticker-new:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
  choice-chip:
    backgroundColor: "{colors.whitewash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 9px 4px"
  board-red:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    padding: "{spacing.board}"
  board-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    padding: "{spacing.board}"
  board-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    padding: "{spacing.board}"
  board-black:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.gold}"
    padding: "{spacing.board}"
  sign:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
  sign-tag:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    padding: "8px 12px 6px"
  band:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    padding: "10px 0 12px"
  rail:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.whitewash}"
    padding: "14px 16px 12px"
  rail-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.gold}"
  bottom-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.whitewash}"
    height: "{spacing.bar-h}"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.whitewash}"
    padding: "28px 0 32px"
---

# Design System: Krave Kulture

## Overview

**Creative North Star: "The Little Haiti Storefront"**

The site is a painted stall front, not a web page with a food-truck theme. One whitewashed wall with faint concrete grain runs behind everything; on it hang full-width painted fields (a red signboard, a blue band, an ink rail, and one board per menu section in its own color pair) and between them the price boards ride 3px ink rules with dotted leaders running to Bungee prices. The owner's own plate photos are the proof; nothing else is illustrated. The whole thing must read on a phone in Miami daylight, so contrast is hard, type is big, and nothing is tinted or translucent except the awning's blue overlap.

Density is a window board's: rows are tight (14px over, 13px under, 2px rule between), section heads are loud, and there is no chrome between the content and the wall. Depth is painted, not lifted: display lettering carries a sign-painter block shade built from eight stepped text-shadows in the paired board color; controls get only a soft cast shadow. The system refuses the dark-page-plus-gold food-truck default, the three-column card grid, boxes, and soft gradient decoration.

**Key Characteristics:**
- Whitewash ground with SVG-noise concrete grain; everything else is an opaque painted field
- Four board pairs (red/white, blue/white, gold/ink, ink/gold) assigned per menu section
- Bungee for every sign, price, and control; Big Shoulders Text for names, descriptions, labels
- Stepped text-shadow block shade on painted lettering; soft cast shadow on controls; nothing else casts
- 3px ink rules and 3px dotted leaders structure the price boards; no cards
- Painted stickers and choice chips sit at a 1 to 2 degree tilt
- Scalloped red awning at the top, gold-edged blue band and footer, sticky ink rail with a gold brush-stroke underline

## Colors

A sign-painter's five-can palette: whitewash, ink, oxide red, Haitian blue, sun gold, each with one deep and one tint step, with pure white reserved for lettering on red and blue.

### Primary
- **Oxide Red** (`red`): the storefront signboard, the red board pair, `sold out` and `spicy` stickers, the `btn-red` variant, link underline color, caret and accent color, and the theme-color meta. Red is the sign you walk up to.
- **Signboard Edge** (`red-deep`): the 6px wear stripe along the bottom of the signboard, the shade under blue-board titles, and the border on hero buttons sitting on red.
- **Red Wash** (`red-tint`): Kreyòl companion and note text on red boards only.

### Secondary
- **Haitian Blue** (`blue`): the band under the sign, the blue board pair, the block shade behind the sign name, the `new` sticker, `btn-blue`, the default focus ring, and the translucent (0.22) overlap running through the awning stripes.
- **Blue Shade** (`blue-deep`): the block shade under red-board titles.
- **Blue Wash** (`blue-tint`): Kreyòl companion and note text on blue boards.

### Tertiary
- **Sun Gold** (`gold`): the tagline plate, the gold board pair, the default sticker and primary button, the rail underline and active rail link, the 8px band and footer edge, the 4px bottom-bar edge, the tape stripes, `Copied` state, selection highlight, and the FILL-IN mark. Gold is the paint that says "look here"; it is the one accent allowed on ink.
- **Gold Shade** (`gold-deep`): defined in the tokens for gold-on-gold shading; not yet consumed by a shipped rule.
- **Gold Ink** (`gold-tint`): the dark companion text on gold boards; despite the name it is a deep ochre, not a pale tint.

### Neutral
- **Whitewash** (`whitewash`): page ground, rail and bar link color on ink, choice chips, `btn-white`, copy control at rest, white-board text on the ink board pair.
- **Whitewash Deep** (`whitewash-deep`): image placeholder ground and scrollbar track.
- **Ink** (`ink`): body text, all rules and leaders, the rail, tape, bottom bar, footer, pay icons, plate captions, and the ink board pair. Ink is the structural color; it is never tinted.
- **Ink Soft** (`ink-soft`): row descriptions, pay labels, struck-through sold-out rows, empty-state small text.
- **White** (`white`): lettering and body text on red and blue boards, and the QR card ground.

### Named Rules
**The Board Pair Rule.** Every painted field is one of four fixed pairs: red/white, blue/white, gold/ink, ink/gold. Each pair also fixes its companion text (`--sub`) and its title shade (`--paint-shade`): red gets blue-deep, blue gets red-deep, gold and ink get red. Do not mix a face from one pair with a shade from another.

**The Opaque Paint Rule.** Color is applied as flat opaque fields. The only translucent color in the system is the 0.22 blue overlap inside the awning stripes and the 0.55 dotted leader; nothing else is alpha-blended, tinted, or glassed.

## Typography

**Display Font:** Bungee (with Impact, Arial Narrow)
**Body Font:** Big Shoulders Text, variable 400 to 700 (with Arial Narrow, Helvetica Neue)

**Character:** Bungee is the sign-painter's brush; it is always uppercase, always 400, and always carries either a block shade (on signs and board titles) or a painted plate behind it (tags, stickers, buttons, rail). Big Shoulders Text is the chalk that fills the board: condensed, heavy for names and labels, medium for descriptions. Both faces are self-hosted woff2 and preloaded.

### Hierarchy
- **Display** (Bungee 400, `clamp(2.35rem, 11vw, 5.6rem)` phone / `clamp(3.4rem, 6.4vw, 6rem)` desktop, 0.95): the sign name only. Painted white over a blue block shade. Home hero steps up to `clamp(2.6rem, 12.5vw, 6rem)`.
- **Headline** (Bungee 400, `clamp(1.7rem, 7vw, 3.1rem)`, 0.95): board titles. Painted in the pair's face color over the pair's shade. Home section heads use `clamp(1.5rem, 6vw, 2.4rem)` and `clamp(1.6rem, 6.5vw, 2.6rem)` without a shade.
- **Title** (Big Shoulders 700, 1.15rem phone / 1.25rem desktop, 1.15, uppercase, 0.03em): price-row names. Pay handles use the same weight at `clamp(1.25rem, 5vw, 1.7rem)`.
- **Price** (Bungee 400, 1.25rem phone / 1.4rem desktop, 1, tabular numerals): row prices, with the `$` as a `small` at 0.72em raised 0.2em.
- **Body** (Big Shoulders 500, 18px, 1.4): base text. Row descriptions drop to 1rem/1.35 in ink-soft; find and cook copy rise to 1.1 to 1.15rem. Measure is 62ch.
- **Label** (Big Shoulders 700, 0.8 to 0.9rem, uppercase, 0.06 to 0.12em): Kreyòl companions, band words, choice labels, plate captions, pay method labels. Always beside or under the thing it names, never above a headline as a kicker.
- **Control** (Bungee 400, 0.72 to 0.95rem, uppercase, 0.04 to 0.06em): buttons (0.95rem), rail links (0.82rem), tape (0.85rem), chips and copy control (0.72rem), bottom bar (0.72rem), stickers (0.62rem).

### Named Rules
**The Painted Lettering Rule.** Bungee never sits bare on the wall. It is either shaded (eight stepped `text-shadow` layers at 0.01em increments in `--paint-shade`) or plated (an opaque painted background). The stepped shade is built by hand because Bungee Shade's wider advances misalign against Bungee Regular.

**The Kreyòl Companion Rule.** Board titles carry a Kreyòl translation as a label set on the same baseline, right-aligned in the pair's companion color. It is a bilingual title, not an eyebrow: it never appears above the title and never introduces a section on its own.

## Layout

The page is a single column of full-bleed painted fields with a centered content wrap: `width: min(100% - 2 * clamp(16px, 4vw, 40px), 1120px)`. Fields (sign, band, rail, tape, boards, footer, bar) run edge to edge; their inner content uses the wrap. The scroll order on menu.html is awning (44px), signboard, band, sticky rail, optional sample tape, one stall per menu section, pay counter, find section, footer, and on phones a fixed 64px bottom bar with three links (body gets matching bottom padding plus the safe-area inset).

A stall is a board head followed by a stall body. On phones the body stacks: plate photo (4:3, capped at 180px tall) then the price board. At 900px and up the body becomes a `5fr 7fr` grid with a `clamp(28px, 4vw, 56px)` gap; the plate becomes sticky at `top: 60px` with a 3px ink frame (no top edge, so it hangs from the board). Stalls without a photo run their price board in two CSS columns with a 2px ink column rule. The signboard also regrids at 900px to `auto 1fr auto` with the tagline plate pulled right and rotated -2deg; the bottom bar hides. Home's plates track is a horizontal snap scroller of `min(78%, 360px)` tiles bleeding into the gutter on phones and a four-up grid on desktop.

Rhythm comes from the rules rather than margins: boards pad `clamp(16px, 3vw, 26px)` over and `clamp(14px, 3vw, 22px)` under; rows are 14px over, 13px under on a 2px rule; stall bodies end with `clamp(28px, 5vw, 44px)`. Sticky offsets are fixed at 60px (`scroll-padding-top`, plate top) and the stall `scroll-margin-top` at 56px. Print hides awning, rail, bar, tape, copy controls, footer, and plates, keeps board colors exact, and sets body to 12pt on white.

## Elevation & Depth

Depth is painted, not lifted. The block shade under display lettering is the system's only strong "shadow" and it is a paint device, an opaque stepped offset in a board color, not a cast. Interactive controls carry a soft, tight cast shadow to read as raised plates on the wall; nothing else casts. Fields stack by paint order (a 6px red-deep wear stripe under the sign, 8px gold edges under the band and footer, 4px under the bar) rather than by elevation.

### Shadow Vocabulary
- **Paint cast** (`box-shadow: 0 10px 24px -14px rgba(17, 17, 17, 0.55)`, token `--shadow-paint`): the tagline plate on the sign.
- **Button cast** (`box-shadow: 0 8px 18px -10px rgba(17, 17, 17, 0.65)`): `.btn` at rest; hover lifts to `0 12px 22px -10px rgba(17, 17, 17, 0.7)` with `translateY(-2px)`; active drops to `0 3px 8px -6px rgba(17, 17, 17, 0.7)` with `translateY(1px)`. On the red hero the cast is tinted `rgba(60, 10, 8, 0.8)`.
- **Badge cast** (`box-shadow: 0 12px 28px -12px rgba(17, 17, 17, 0.7)`): the round logo badge on the sign.
- **Rail cast** (`box-shadow: 0 8px 20px -14px rgba(0, 0, 0, 0.7)`): the sticky rail over content.

### Named Rules
**The No Block Drop Rule.** Hard offset shadows belong only to lettering as a block shade. Controls, plates, badges, and fields get soft cast shadows or none; a button never gets an offset solid shadow.

## Shapes

Everything is square-cut. There is no border radius anywhere in the system except the round logo badge and footer badge (50%). Edges are made with rules: 3px solid ink for the primary rule (board bottoms, price-board tops, plate frames, button and copy-control borders, the QR card), 2px solid ink for row rules and column rules, 3px dotted ink at 0.55 opacity for price leaders. Sold-out rows are struck through with a 3px red line.

The recurring silhouettes are painted: the awning is a repeating 36px red stripe with a translucent blue overlap band, masked to a 14px scallop along its bottom edge; the sample tape is a 45-degree gold-and-ink hazard stripe framing an ink strip; stickers tilt -2deg and choice chips alternate 1deg / -1.5deg; the desktop tagline plate tilts -2deg; the rail's active underline is a hand-drawn gold brush stroke (inline SVG path) revealed by clip-path. Gold edge stripes (8px on the band and footer, 4px on the bar) are borders, not shapes.

## Components

### Buttons
- **Shape:** square, 3px ink border (`border: 3px solid #111111`), no radius
- **Primary:** gold plate with ink lettering, Bungee 0.95rem uppercase 0.04em, `padding: 16px 20px 14px`, inline-flex with a 10px gap for an optional 22px stroked SVG icon; soft button cast
- **Hover / Focus:** rises 2px with a deeper cast; active sinks 1px with a tight cast; transitions 160ms on the `--ease-out` curve; focus ring is the global 3px blue outline offset 3px
- **Variants:** `btn-blue` (blue/white), `btn-red` (red/white), `btn-white` (whitewash/ink). On the red hero, buttons swap the ink border for red-deep and a red-tinted cast.

### Copy control
- **Style:** a bordered whitewash plate (3px ink), Bungee 0.72rem uppercase 0.05em, `padding: 12px 12px 10px`, stroked copy icon over the word Copy, spanning both rows of a pay row
- **State:** hover flips to ink with gold text; active sinks 2px; `[data-state="copied"]` paints gold with a gold border and the label reads Copied for 1800ms; clipboard failure reads Select it; disabled sits at 0.4 opacity with a not-allowed cursor

### Chips
- **Choice chip:** whitewash plate with ink Bungee 0.72rem, `padding: 6px 9px 4px`, tilted -1.5deg (odd children 1deg); listed after a bold Big Shoulders label in the board's companion color. Display-only, no selected state.
- **Sticker:** gold plate with ink Bungee 0.62rem 0.06em, `padding: 4px 7px 3px`, tilted -2deg, set inline after a row name. `sold out` and `spicy` paint red/white; `new` paints blue/white. A `sold out` sticker also strikes the row name and price through in red and greys them to ink-soft.

### Boards
The section head. A full-bleed painted field in one of the four pairs, closed by a 3px ink rule, holding a shaded Bungee title, a Kreyòl label on the same baseline, an optional note (600 weight, 1rem, 62ch, companion color), and optional choice chips. The pair also sets `--paint-shade` for the title and `--sub` for the companion text.

### Price board (rows)
A list opened by a 3px ink rule. Each row is a two-column grid (`1fr auto`) with the name and inline sticker on the left, a dotted leader stretching between, the Bungee price right-aligned on the same baseline, and an optional description on a second line in ink-soft. Rows close with a 2px ink rule. On desktop, photo-less boards flow into two columns split by a 2px ink rule.

### Plate
A photo figure: 4:3 crop (1:1 in the home track), whitewash-deep placeholder ground, and an ink caption plate pinned bottom-left in Big Shoulders 700 0.78rem uppercase 0.08em. Framed by 3px ink on desktop and in the home track; unframed and capped at 180px tall on phones.

### Pay row
A three-column grid (`52px 1fr auto`) on 2px ink rules: a 52px ink square holding a 30px gold stroked icon, a Big Shoulders label in ink-soft over the handle at `clamp(1.25rem, 5vw, 1.7rem)` 700, and the copy control spanning both rows. Unfilled handles render as a gold `mark` (FILL-IN); linked handles underline in blue.

### Navigation
- **Rail:** sticky ink strip at `top: 0`, z-index 20, horizontally scrolling with snap and a 56px fade mask on the trailing edge while more links exist (`data-more`). Links are Bungee 0.82rem uppercase 0.04em in whitewash, `padding: 14px 16px 12px`; hover and `aria-current` turn gold; the current link reveals a 9px gold brush-stroke underline via `clip-path` over 320ms. Current is set by an IntersectionObserver (rootMargin `-40% 0px -45% 0px`) and the rail scrolls the current link to center. Focus ring inside the rail is gold, inset 4px.
- **Bottom bar (phone only):** fixed ink strip, 4px gold top edge, three equal cells 64px tall with a 22px icon over a Bungee 0.72rem label, 2px `#2a2a2a` dividers, gold on hover and current; hidden at 900px and up.

### Signboard
The storefront header: red field with a 6px red-deep wear stripe at its foot, a round badge (ink ground, badge cast; `clamp(76px, 20vw, 132px)` on phones, 160px desktop, up to 200px on the home hero), the painted sign name, and the gold tagline plate with the middle phrase in red. On load, with motion allowed, the name paints on left to right (`clip-path: inset(0 100% 0 0)` to `inset(0 -2% 0 0)`, 900ms `--ease-out`, 120ms delay) while a 0.35em gold brush stripe sweeps across it; the tagline settles up 6px and fades in at 820ms. Under `prefers-reduced-motion: reduce` nothing animates and smooth scrolling is off.

### Band, tape, footer
- **Band:** blue strip with an 8px gold bottom edge; Big Shoulders 700 uppercase 0.1em words separated by gold bullets.
- **Tape:** the SAMPLE MENU warning, shown only when `MENU_STATUS` is `draft`; a 45-degree gold/ink hazard stripe framing an ink strip with gold Bungee and a whitewash Big Shoulders line under it.
- **Footer:** ink field with an 8px gold top edge, a 56px round badge, the gold Bungee tagline, and small print in `#b8b4aa` with gold link underlines.

### QR page
`qr.html` reuses the sign and buttons and adds a `qr-card` figure: a 3px ink frame on a white ground, `min(100%, 420px)` wide, holding the SVG card. It is a printable object, not a UI card; in print it drops its border and everything else on the page is hidden.

### Browser surface
Selection is gold on ink; caret and `accent-color` are red; focus ring is 3px blue offset 3px (gold on red, blue, and ink boards, and inside the rail and bar); scrollbars are thin, ink thumb with a 2px whitewash-deep border on a whitewash-deep track (10px in WebKit); `color-scheme: light`.

## Do's and Don'ts

### Do:
- **Do** put every new section on a board in one of the four pairs and close it with a 3px ink rule; assign the pair per section, not per page.
- **Do** set prices in Bungee with tabular numerals and a dotted leader to the name; keep the `$` small and raised.
- **Do** shade painted Bungee with the eight-step `text-shadow` in the pair's `--paint-shade`, or plate it on an opaque field; never set Bungee bare on the wall.
- **Do** use the 900px breakpoint as the single layout switch: two-column stalls, sticky framed plate, right-pulled tagline, hidden bottom bar.
- **Do** keep controls as bordered painted plates with the soft cast, and keep hover/active on the 160ms `cubic-bezier(0.16, 1, 0.3, 1)` curve.
- **Do** gate the paint-on, brush sweep, and settle animations behind `prefers-reduced-motion: no-preference`.
- **Do** use 24px stroked SVG icons at `stroke-width: 2.2` in `currentColor`, inline, never an icon font or glyph character.

### Don't:
- **Don't** draw cards, boxes, or bordered containers around content; structure comes from full-bleed fields and ink rules. The QR card is a printable object, not a precedent.
- **Don't** use gradients as decoration. Hard-stop repeating stripes (awning, tape) are paint; soft gradients only appear as masks (rail fade, awning scallop).
- **Don't** put an offset block shadow on a control, plate, or field; the block shade belongs to lettering only.
- **Don't** add a kicker or eyebrow label above a headline; the Kreyòl companion sits beside the title on its baseline and is the only secondary title text.
- **Don't** introduce a radius; the only circles are the logo badges.
- **Don't** tint or glass a painted field; fields are opaque, and the only translucent color is the awning's blue overlap.
- **Don't** set body copy wider than the 62ch measure, and don't drop body below 1rem or descriptions below ink-soft contrast on the whitewash.

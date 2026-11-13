# Design notes

Two concepts share one product. Atelier is the default. Apothecary is a separate layout at `/apothecary`, linked from the Atelier footer. Neither concept uses another house’s name, logo, crest, copy, or photography.

## Concept A — Atelier

Measured 13 Nov 2026 from the live collection, home, and product pages used as a system reference. The product does not use that brand’s name, logo, copy, or photography.

## Type

Their interface face is a proprietary neo-grotesk, `byredoSans`, with a local fallback of the same family and then `sans-serif`. It is not on Google Fonts. The closest freely licensed equivalent used here is **Inter Tight** at weight 400 only: a compact grotesque in the Helvetica / Neue Haas family, not a Didone and not a script.

| Role | Size | Weight | Tracking | Line height | Case | Color |
| --- | --- | --- | --- | --- | --- | --- |
| Body | 14px | 400 | 0.35px | 20px | as written | `#000` |
| Header / nav links | 12px | 400 | 0.3px | 16px | uppercase | `#000` |
| Menu control | 12px | 400 | 0.6px | 12px | uppercase | `#000` |
| Muted group label | 12px | 400 | 0.6px | 14.4px | uppercase | `rgb(118, 118, 118)` |
| Collection title | 48px | 400 | 4.8px (0.1em) | 57.6px | uppercase | `#000` |
| Product title | 24px | 400 | 0.6px | 32px | uppercase | `#000` |
| Price, grid and product | 12px | 400 | 0.3px | 16px | none | `#000` |

No italics, no small-caps OpenType, no second display face. Uppercase is done with `text-transform`, not a separate font.

`rgb(118, 118, 118)` on white is about 4.5:1. This build uses `#6a6a6a` (about 5.7:1) for the same role so secondary labels stay AA.

## Color

Nearly monochrome.

- Page and header: `#ffffff`
- Text and solid buttons: `#000000`
- Secondary labels: gray, as above
- Hairlines and the default framework border: `rgb(229, 231, 235)` (`#e5e7eb`)
- Product photography sits on white or a very light gray field, full-bleed inside the tile
- Buttons: solid black with white 12px uppercase type, or a 1px black outline with black type. Radius is 0. Hover darkens to the inverse (black fill / white type, or the reverse)

No green, rose, ochre, or orange in the system.

## Layout

- Header is white, about 84px tall, with 28px padding. Left: menu. Center: wordmark. Right: cart. A second row of category links sits under it, 12px uppercase, horizontally arranged.
- Collection pages split the first screen: title block on the left, a large photograph on the right, edge to edge within the column. On a narrow screen the photograph comes first, then the title.
- Product grids are even columns (four on desktop, two on a phone) with a small gap. Each tile is an image, then a 12px uppercase category, then the name in uppercase, then the price on its own line.
- Product pages put a large image on the left and a narrow column on the right: name, price, a full-width black button.
- Spacing is tight in the header and generous in the hero. Body copy is 14/20, not a large serif paragraph.

## What this portal maps

- Wordmark: “Jordan Wang”, centered, same grotesque, tracked uppercase.
- The two offerings are collection tiles: image, category, name, then price the way a product price is shown (12px, under the name). Weddings have no published price, so that line reads “Inquire”.
- Imagery is full-bleed photography inside the tile, `object-cover`, with no caption on the picture. The gray field (`#f2f2f2`) only shows while a photo loads. The files in `public/images` are stock stand-ins; swap them for photographs of Jordan. Credits are in `IMAGE_CREDITS.md`. No drawings, crests, or ornaments.
- The release calendar uses the same 12px face, hairline cells, black for an open day and gray for a held day.
- The client record and the studio desk stay on this type scale. They read as a receipt and a list, not a dashboard.
- A 12px footer link, “Apothecary”, opens concept B. It uses the same gray as the line above it.

## Concept B — Apothecary

A separate layout, not a reskin. Measured 13 Nov 2026 from the live body-and-hair collection used as a type reference. The product does not use that house’s name, logo, crest, copy, or images.

Their licensed faces are Garamond Premier Pro (display, text, and caption optical sizes), Adobe Garamond Pro, Futura PT with Jost as the fallback, and a script used as a decorative token. On the collection page itself the computed type is almost entirely Garamond. Futura / Jost is set on the newsletter form. The script token is not used in that view, so this concept skips it.

Free equivalents: **EB Garamond** (roman and italic, 400 and 600) for every Garamond role, including the nav, because the measured nav is the caption cut in sentence case. **Jost** for the sans roles: tiny labels, buttons, and the first-access form.

### Measured type

Root size is 16px. Ink on the reference page is `rgb(43, 34, 34)` (`#2b2222`). Muted copy is `rgb(113, 98, 98)` (`#716262`). The reference page background is `rgb(254, 252, 252)`. This concept keeps the measured ink and muted color, and uses a parchment ground instead of that near-white, because the apothecary brief asks for paper.

| Role | Their face | Size | Weight | Tracking | Line height | Case | Color |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Collection title, desktop | garamond-premier-pro-display | 48px (3rem) | 600 | 0.1em (4.8px) | 1.2 (57.6px) | uppercase | `#2b2222` |
| Same title, narrow | display token, heading-01 | 32px (2rem) | 600 | 0.1em | 1.2 | uppercase | `#2b2222` |
| Nav and UI | garamond-premier-pro-caption | 18px | 400 | 0.08em (1.44px) | 1.35 (24.3px) | sentence | `#2b2222` |
| Body and product name | garamond-premier-pro | 18px | 400 | 0.01em (0.18px) | 1.35 | sentence | `#2b2222` |
| Italic note | garamond-premier-pro | 18px | 400 italic | 0.01em | 1.35 | sentence | `#716262` |
| Small label token | garamond-premier-pro | 12px | 400 | 0.03em | 1.2 | as set | `#2b2222` |
| Newsletter sans | Futura PT, Jost | form only | | | | | |

Heading sizes in their stylesheet step from 2rem up to 3rem for heading-01. The collection `h1` computed at 1440px is the 48px row. Display can go to 4.25rem elsewhere; this page does not use that size, so neither do we.

### What this concept uses

- Parchment `#f4efe6` with a light paper grain. Primary ink and frames `#1c3a30`. Body text `#2b2222`. Muted text `#716262`. Brass `#8c7344` only on the small rule ornament and the selected ledger day.
- Titles: EB Garamond 600, uppercase, 32px on a phone and 48px from 768px, tracking 0.1em, line-height 1.2, in the green.
- Nav: EB Garamond 18px, sentence case, tracking 0.08em, line-height 1.35. Centered under a framed “JW” monogram. The name “Jordan Wang” is only in the hero.
- Body: EB Garamond 18px, sentence case, tracking 0.01em, line-height 1.35.
- Jost 12px, weight 500, tracking 0.1em, uppercase, for numbers, field labels, and specimen captions. Buttons are Jost 14px, tracking 0.08em, sentence case, green fill.
- Double rules with a concave corner notch. Services are a catalogue with dotted leaders. The release month is a ledger; held days are struck through. The next unpublished release has a countdown and a first-access field that stores nothing and sends nothing.
- The client home is a prescription card: number, formula, toner, service, last visit, next. Avery’s formula lines are sample text for the mockup.
- Photographs are the same local Unsplash files as Atelier, set inside a framed specimen mat with a caption. The demo line sits in the footer, not a banner.
- No script face.
- The footer switcher also links to Editorial, in the same small caps as the Atelier link.

## Concept C — Editorial

A third layout, at `/editorial`. The references are a fashion lookbook poster, a campaign web page, and a magazine spread with marker writing. None of their names, logos, copy, or pictures are used.

- Newsprint `#f3f0e7` with a fine print grain. Ink `#161513`. Tomato `#d7261e` for the script and one color block. Hot pink `#e2186a` for marker notes. Cobalt `#1d3fbf` and marigold `#f0b429` for the other blocks. Small type stays black on paper. Pink and tomato are for large marks, not body copy.
- Captions are Barlow, 11px, weight 500, tracking 0.28em, uppercase: “JW SS/27”, “Houston, TX”.
- The wordmark is Great Vibes, tomato, large enough to cross the photo grid, rotated slightly. Permanent Marker is the only handwriting, used for short notes over pictures.
- The landing is a mixed grid: photographs with different crops, three solid blocks, a dashed hand outline, stars, a cross, and an arrow. Those marks are inline drawings, not borrowed artwork.
- Before and after sit in a black film strip. One photograph is full-bleed with marker text across it.
- The published release is a drop poster: the month, a script count of the real dates, and a pink scribble through each held day. Choosing a day still does not reserve it.
- The client record and the desk stay on the same paper and the small sans, with one marker word each. They are lists, not a second poster.
- The demo line is in the footer. Atelier and Apothecary stay on their own routes.

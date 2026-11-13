# Design notes

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
- Imagery is a flat gray field (`#f2f2f2`) with a 12px caption such as “Jordan portrait” or “Transformation photo”. No drawings, crests, or ornaments.
- The release calendar uses the same 12px face, hairline cells, black for an open day and gray for a held day.
- The client record and the studio desk stay on this type scale. They read as a receipt and a list, not a dashboard.

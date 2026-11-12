# flowe.etc

A one-screen landing page for **flowe.etc**, Flowe Beauty Lab: a hybrid beauty store with limited salon services in a former salon on 34th Street in Houston Heights. Skincare, makeup, and haircare are tested here. Inventory is sold on live Whatnot shows. The salon legal entity remains Flowe Collective.

Static HTML and CSS. No JavaScript, no web fonts, no third-party requests. The only picture is one hero slot for the pleated paper wall.

There is an optional side page at `/space` (once the salon, now the lab). It is a CSS diagram, not a photo, and it is not linked from the front page.

## Look at it locally

From this folder:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/` and `http://127.0.0.1:8080/space/`.

Serve **this folder** as the site root. The home page and `/space` use root paths such as `/` for the logo.

## Deploy on Vercel

The site is the contents of `flowe-etc/`, not the repository root.

1. Import the Git repository in Vercel.
2. Set **Root Directory** to `flowe-etc`.
3. Framework Preset: **Other**.
4. Leave **Build Command** empty. There is no build.
5. Output is this directory as-is (static files). `vercel.json` turns on clean URLs, so the side page is `/space`.
6. Deploy.

From this folder, the Vercel CLI does the same thing: it treats `flowe-etc` as the project root, so you do not set Root Directory by hand.

`vercel.json` sends a Content-Security-Policy that blocks scripts (`script-src 'none'`). Keep the page script-free. An inline script or a tag manager will not run.

### Keeping the first paint fast

The hero is the largest element. It is a small SVG today, so the largest contentful paint stays well under 2.5s. When you swap in the real photo:

- Export a compressed JPEG or WebP, and keep it modest (around 200 KB is a good ceiling for a phone).
- Update the `src` on the hero `<img>`, the matching `preload` href, and `hero_image` in the config comment.
- Keep `width` and `height` on the `<img>` so the layout does not jump.

## Placeholders to fill

Every unknown is a brass chip on the page and a `PASTE_` token in `index.html`. The checklist is the HTML comment at the top of that file. Search for `PASTE_`.

Do not invent a value. Leave the chip until you have the real one.

| Token | What to put |
| --- | --- |
| `PASTE_WHATNOT_URL` | Whatnot page URL |
| `PASTE_BOOKING_URL` | Hair booking URL |
| `PASTE_TIKTOK_URL` | TikTok URL |
| `PASTE_INSTAGRAM_HANDLE` | Instagram handle, not a URL. Suggestions only if you own them: `flowe.etc` or `floweetc` |
| `PASTE_EMAIL` | Email address (the link is `mailto:`) |
| `PASTE_NEXT_SHOW` | Next show |
| `PASTE_USUAL_SHOW_TIMES` | Usual show times |
| `PASTE_STORE_HOURS` | Store hours |
| `PASTE_PICKUP_WINDOW` | Local pickup window |
| `PASTE_STREET_ADDRESS` | Street number and ZIP. The page already says 34th Street, Houston Heights, Houston, Texas. If you paste a full address, delete the lines that would repeat it. |
| `PASTE_OWNER_NOTE` | About 60 words from the owner |
| `assets/pleated-paper-wall.svg` | The pleated paper wall photo. This path is a stand-in, not a `PASTE_` token, because the page has to render today. |

How to clear one:

1. Search this folder for the token and replace every copy with the real value.
2. Delete the words `Placeholder — ` in front of that value.
3. Remove the class `ph` from that element so the brass highlight goes away.
4. For the owner note, replace `PASTE_OWNER_NOTE`, change the heading to something like "A note from the owner", and remove the class `note` if you do not want the brass box.
5. For the hero, remove the `<figcaption>` (or rewrite it as a real caption) once the photograph is in, and remove its class `ph`.

Copy rule: the products are **tested** here. Do not change that to made or formulated.

## Domain

The owner plans a domain in the `flowe-etc.com` style. A hyphen is easy to miss when someone says a URL on a live show.

On camera, say **flowe dash etc dot com**.

Put the full URL, hyphen included, in the Whatnot bio and on the store sign.

Confirm the domain is actually purchased before you print it, put it on the sign, or say it on a show as if the site is already there.

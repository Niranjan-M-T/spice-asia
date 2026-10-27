# Spice of Asia — website & digital menu

A fast, fully static website for **Spice of Asia**, a Pan-Asian restaurant in HRBR Layout, Kalyan Nagar, Bengaluru.
The design theme is a *lantern night market*: a midnight sky, swaying red and gold lanterns, a lit rooftop skyline and a gold dragon that draws itself as you scroll. All the scenery is drawn in code (SVG and CSS), so it loads almost instantly.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Home: hero, the seven kitchens, food photos, house specials, drinks bar, visit details, FAQ |
| `/menu/` | Digital menu: search, veg / non-veg filter, sticky category tabs, every price. Works well from a table QR code. |
| `/menu.md` | The same menu as plain Markdown, for AI assistants |
| `/llms.txt` | A short summary of the restaurant for AI crawlers |
| `/robots.txt`, `/sitemap.xml` | Crawling and indexing |
| `/404.html` | Not-found page |

Every page includes schema.org structured data: `Restaurant` (address, map position, hours, phone, cuisines, price range), `Menu` with every section, dish and price, `FAQPage` and `BreadcrumbList`.

## Editing content

You never need to touch the HTML. Edit the data files and rebuild.

- **`data/menu.json`**: every section, dish and price.
  - A dish has one or more `variants`. Each variant has a `label` (for example `Veg`, `Chicken`, `Seafood`, or `null` for a single price), a `price` in rupees and a `diet` of `veg` or `nonveg`.
  - Set `"price": null` to show "Ask for price".
- **`data/site.json`**: address, phone, opening hours, map link and cost for two.
- **`assets-src/photos/`**: the photos. File names are referenced in `build.mjs` (`stalls` list). Credits are in `CREDITS.json`.

## Build & preview

```bash
npm install
npm run build      # writes the site to dist/
npm run preview    # builds, then serves dist/ at http://localhost:8080
```

`SITE_URL` sets the canonical address used in meta tags, the sitemap and structured data. For example:
`SITE_URL=https://www.example.com/ npm run build`

## Deploying

**GitHub Pages (now):** in the repository go to *Settings → Pages → Build and deployment*, set **Source** to **GitHub Actions**, then push to `main`. The workflow in `.github/workflows/pages.yml` builds and publishes the site, and sets `SITE_URL` automatically. You can also start it by hand from the *Actions* tab ("Run workflow").

**Cloudflare Pages (later):** connect the repository and use:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `SITE_URL=https://<your-domain>/`

`dist/_headers` gives Cloudflare long cache lifetimes for the fingerprinted files in `/assets/`.

## Where the content came from

- **Food menu and prices:** the restaurant's Swiggy listing (Kammanahalli / Kalyan Nagar outlet), fetched on 27 Oct 2026.
- **Drinks and dessert prices:** photos of the printed dine-in menu. These may be older prices.
- **Address, phone, hours and cost for two:** the restaurant's district.in listing.
- **Photos:** CC0 (public domain) stock photos from rawpixel, labelled on the site as illustrations, not the restaurant's own dishes.

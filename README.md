# Sofora — UK cash-on-delivery sofa store

Next.js 15 (App Router) + Tailwind CSS v4 + Firebase. Built from the Sofora UI mockup:
a complete sofa storefront (home, collection with filters, product pages, pay-on-delivery
checkout, order confirmation, wishlist) plus a full admin panel (dashboard, orders, order
detail, products, delivery & COD rules, content settings).

**Model:** customers order online with their details only — nothing is paid online.
The store confirms by phone, delivers with a two-person team, and the driver collects
payment (cash / card machine / bank transfer) after the customer inspects the sofa.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build
```

The site works fully **without any Firebase credentials**: a seeded local store
(`data/store.json`, gitignored) powers products, orders, FAQs, reviews and settings.
When Firebase Admin credentials are added (below), the same code switches to
real Firestore automatically — no code changes needed.

## Firebase setup

Client web config for project `sofa-web-cbe62` is already in `.env`
(`NEXT_PUBLIC_FIREBASE_*`). Two steps remain in the Firebase console:

1. **Create the database** — Firebase Console → Build → Firestore Database →
   *Create database* (production mode, choose your region).
2. **Publish the security rules** — copy `firestore.rules` into
   Firestore Database → Rules → Publish. Catalogue content (products, categories,
   FAQs, reviews, settings) is publicly readable; orders are server-side only.

3. **(For live Firestore reads/writes)** the API routes need the Admin SDK:
   Firebase Console → Project settings → Service accounts → *Generate new private key*,
   then fill in `.env`:
   ```
   FIREBASE_PROJECT_ID=sofa-web-cbe62
   FIREBASE_CLIENT_EMAIL=<service account email>
   FIREBASE_PRIVATE_KEY="<the private key>"
   ```
   Never paste the private key in chat or commit it — `.env` is gitignored.
   Until these are set, everything runs on the local seeded store.

4. **(Optional)** Restrict the web API key: Google Cloud Console → APIs & Services →
   Credentials → restrict `AIzaSyDZ6Mvp6x_eqkgR-quymOJZf-F1gIXcOkc` to your domains.

Firebase Storage + Auth client helpers exist in `lib/firebase.ts` for product photo
uploads and a future admin login. The admin panel currently has **no login gate** —
add Firebase Auth before exposing `/admin` publicly.

## Project structure

```
app/
  (store)/            # storefront: /, /sofas, /sofas/[slug], /wishlist,
                      #   /delivery, /returns, /contact, /privacy, /terms
  checkout/           # pay-on-delivery checkout (slim header)
  order-confirmed/    # confirmation + next-steps timeline
  admin/              # dashboard, orders, products, delivery, settings, customers
  api/                # products, orders, settings, faqs, reviews, categories
  sitemap.ts robots.ts
components/           # SofaIllustration, Icons, layout, storefront, admin ui
lib/                  # db.ts (Firestore ↔ local fallback), seed.ts, seo.ts,
                      # firebase.ts, firebase-admin.ts, store.tsx (basket/wishlist)
public/               # llms.txt, llms-full.txt, manifest, icon.svg
firestore.rules       # publish to the Firebase console
```

## Admin panel

- `/admin` — KPIs, weekly orders chart, COD funnel, recent orders, alerts
- `/admin/orders` — tabs, search, bulk confirm, order detail with COD progress,
  confirmation checklist, cash-to-collect, customer/delivery/risk cards
- `/admin/products` — catalogue table, live toggles, add/edit sofa form
- `/admin/delivery` — verification, payment methods, zones, slots, SMS toggles, team
- `/admin/settings` — announcement bar, contact details, FAQs, reviews
- `/admin/customers` — customers derived from orders

All storefront copy (announcement bar, FAQs, reviews, delivery copy, contact details)
is editable from the admin — only UI, headings and icons are static.

## SEO / AEO / GEO

- Per-page titles, descriptions, canonicals, Open Graph + Twitter cards
- JSON-LD: FurnitureStore/Organization, WebSite+SearchAction, Product+Offer (GBP,
  InStock), BreadcrumbList, FAQPage, HowTo (pay-on-delivery steps), ItemList
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt` for AI consumers
- Semantic HTML, en-GB locale, descriptive alt text, clean URLs

## Deploy

Set `NEXT_PUBLIC_SITE_URL` to the production domain, add the Firebase env vars to
your host (Vercel/Hostinger), and deploy with `npm run build`. `NEXT_PUBLIC_*`
vars are baked in at build time — rebuild after changing them.

# Sofora — Design Specification

Extracted 2026-10-09 from 13 decoded UI mockup pages + the shared `Sofa` SVG component bundle.
"Sofora" = UK cash-on-delivery (pay-on-delivery) sofa store. Source pages were `*.dc.html`
Design-Canvas mockups; all copy below is transcribed verbatim from the mockups — nothing invented.

---

## 1. Design tokens

### Fonts
- **Headings:** `Fraunces`, Georgia, serif — weight 400, `letter-spacing:-.02em` (600 used for `.price`)
- **Body:** `DM Sans`, system-ui, sans-serif — weights 400 / 500 / 600

### Color palette (with usage)

| Hex | Usage |
|---|---|
| `#F6F1EA` | Cream — page background, reverse text on green |
| `#1E2421` | Ink — primary text, headings |
| `#1F3A32` | Brand green — primary buttons (`.bp`), announcement bar, nav active, footer, dark sections, logo mark |
| `#F4E1D6` | Blush — reviews section bg, eyebrows on dark, "New"-badge pill bg, COD banner accent |
| `#E3EBE4` | Sage — hero pill badge, COD banner bg, trust boxes |
| `#EBE3D6` | Sand — bestsellers section bg |
| `#DDD3C4` | Hairline — borders, dividers, swatch rings (inactive) |
| `#646A63` | Muted — secondary text, eyebrows (`.lab`) |
| `#4a514b` | Secondary body text |
| `#B65A35` | Terracotta accent — sale tags, basket badge, "Sale" nav link, stars |
| `#2E5247` | Card green — how-it-works cards, dark step cards |
| `#C9D6CC` | Sidebar muted text (admin) |
| `#27463C` | Sidebar nav hover (admin) |
| `#FBF9F5` | Table row hover (admin) |
| `#F1F5F2` | Selected option-card bg (checkout) |
| `#2F7D4F` | Success green — confirmed step badges, cash-to-collect |
| `#2F5D8A` | Info blue — "Out for delivery" |
| `#9A6A12` | Amber — "Awaiting confirmation" |
| `#B3402F` | Danger red — "Refused", cancel-order text |
| `#F8EAC8` / `#F6DDD8` / `#DDEFE3` / `#DCE8F3` | Status pill backgrounds (amber / red / green / blue) |
| Fabric hexes | `#D8CBB4` Oat · `#5E7A6B` Sage · `#3F4443` Charcoal · `#C27B5A` Terracotta · `#2E3F5C` Navy · `#8B7B6B` Mink · `#D9B8AE` Blush · `#CFA33A` Mustard |
| Illustration bg tints | `#EFE8DC` · `#DCE5DA` · `#E8DFD2` · `#F1E4D9` · `#DCE8F3` · `#F6EBC9` · `#E9D9B8` (accent) |

### Radii & spacing
- Pill buttons/CTAs: `border-radius:999px`
- Product images: 18px desktop / 14px mobile (`border-radius:18px`)
- Cards/panels: 20–24px (white cards 20px, checkout panels 24px, gallery 28px, hero image 32px)
- Section padding (`.sec`): 96px top/bottom (88px on dark how-it-works)
- Container (`.wrap`): `max-width:1280px`, side gutters 40px (checkout 1200px, confirm 1100px)

### Shared component classes (storefront)
```
.btn    {display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 26px;
         border-radius:999px;font:600 15px 'DM Sans';border:1.5px solid transparent;cursor:pointer;min-height:48px}
.bp     {background:#1F3A32;color:#F6F1EA}          /* primary */
.bo     {border-color:#1E2421;background:transparent;color:#1E2421}  /* outline */
.ib     {width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#1E2421}  /* round icon btn */
.lab    {font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#646A63} /* eyebrow */
.grid4  {display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:32px 28px}
.card   {display:flex;flex-direction:column;gap:12px}
.img    {border-radius:18px;overflow:hidden;position:relative}
.tag    {position:absolute;left:12px;top:12px;padding:5px 10px;border-radius:999px;
         font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}  /* product badge */
.heart  {position:absolute;right:12px;top:12px;width:38px;height:38px;border-radius:50%;background:#fff} /* wishlist */
.price  {font-family:'Fraunces',serif;font-weight:600;font-size:22px}
details  {border-bottom:1px solid #DDD3C4;padding:22px 0}  /* FAQ accordion */
a:hover  {opacity:.8}   /* .85 on Collection/Product */
```
Product-page `.btn` is larger: `padding:16px 28px;font:600 16px;min-height:52px`; checkout `.btn` min-height 54px.
Mobile `.btn` = `display:flex;width:100%;min-height:50px;padding:15px 22px`; mobile `.ib` has no border-radius;
mobile `.lab` is 11px. Mobile token blocks omit `.wrap .grid4 .card .img .tag .heart .price .sec` and accordion styles.

### Admin shared classes (defined in admin pages' inline styles; helmet is `@font-face`-only)
- `.nav` (sidebar link: flex, gap 12px, padding 11px 14px, radius 12px, color `#C9D6CC`, 500/15px, min-height 44px);
  `.nav.on` = bg `#2E5247`, text `#F6F1EA`; `.nav:hover` = bg `#27463C`
- `.card` = white, radius 20px, padding 24px
- `.pill` = inline-flex, padding 4px 10px, radius 999px, 12px/600 (status badges)
- `.tab` = pill tab; `.tab.on` = bg `#1F3A32`, text `#F6F1EA`
- `.btn` (admin) = pill, padding 10px 18px, border `#DDD3C4`, white bg; `.bp` = bg/border `#1F3A32`, text `#F6F1EA`
- `.tg` = toggle pill (`.on`/`.off`, `aria-label="On|Off"`)
- Table: `th` 12px/600 uppercase, letter-spacing .06em, color `#646A63`, padding 10–12px, bottom border `#DDD3C4`;
  `td` padding 14px 12px, bottom border `#EBE3D6`, 14px

### Order status badge colors (used identically on DASH, ORDERS, ORDER-DETAIL)
| Status | bg | fg |
|---|---|---|
| Awaiting confirmation | `#F8EAC8` | `#9A6A12` |
| Confirmed | `#E3EBE4` | `#1F3A32` |
| Out for delivery | `#DCE8F3` | `#2F5D8A` |
| Delivered · paid | `#DDEFE3` | `#2F7D4F` |
| Refused | `#F6DDD8` | `#B3402F` |
| Packed | `#EBE3D6` | `#1E2421` (ORDERS only) |
| Phone verified | `#DDEFE3` | `#2F7D4F` |
| Not verified | `#F8EAC8` | `#9A6A12` |
| High risk | `#F6DDD8` | `#B3402F` |
| In stock | `#DDEFE3` | `#2F7D4F` · Low stock `#F8EAC8`/`#9A6A12` · Out of stock `#F6DDD8`/`#B3402F` |

### Shared `<Sofa>` SVG illustration component
Decoded from bundle entry `18d90921-…` (`./Sofa.dc.html`). Props:
- `fab` (default `#D8CBB4`) — base fabric color
- `bg` (default `#EFE8DC`) — tile background
- `type` (default `three`) — `three` | `corner` | `chair`
- `acc` (default derived: fabric lightened 30%) — accent cushion
- `ratio` (default `1`) — aspect-ratio of the tile

Rendering: wrapper div `aspect-ratio:{ratio}; background:{bg}`, single `<svg>` (role="img", aria-label per type).
Derived shades via `S(h,a)`: `c1` = fab, `c2` = fab −8% (backrest), `c3` = fab −16% (arms), `c4` = fab +5%.
Looks: flat, minimal rounded-rectangle sofa, front view, on a soft black ground shadow (`ellipse`, opacity .1) with two/three small brown (`#4A3626`) legs.

- **three** — wide backrest bar (x14–86, rx7), two armrests, seat base bar, 3 back cushions (`c1`), 1 accent throw pillow (`acc`) on the left, legs at x8 and x88. Scale 0.78.
- **corner** — L-shape: extra-wide backrest (x8–94), left arm only, long seat base, 2 back cushions + a long chaise cushion (`c4`) extending right, accent pillow left, 3 legs. Scale 0.74.
- **chair** — narrow armchair: backrest x24–76, both arms, single wide seat cushion, accent pillow upper-right, 2 legs. Scale 0.62.

Usage in mockups: `<dc-import name="Sofa" fab="…" bg="…" type="three|corner|chair" [acc="…"] ratio="…" hint-size="…">`.
(React rebuild: pure SVG component; legs are always `#4A3626` rounded rects.)

---

## 2. Screens

### 01 — HOME (`/` desktop, preview 1440×3300)

1. **Announcement bar** (`#1F3A32`/`#F6F1EA`, 14px, centered wrap, gap 6px 36px):
   "Nothing to pay online — pay on delivery" · "Free UK delivery over £[500]" · "Inspect your sofa at the door first"
2. **Header** (cream, hairline `#DDD3C4` bottom): logo (green 38px circle + sofa line icon + "Sofora" Fraunces 27px) → `/`;
   nav 15px/500: "All sofas", "Corner sofas", "3+2 sets", "Armchairs", "Sofa beds" (→ `/sofas`), "Sale" (`#B65A35`, → `/sofas`);
   right `.ib` icon buttons: Search (dead button), Wishlist (dead button), Basket → `/checkout` with terracotta count badge "1".
3. **Hero** (flex row, wrap, gap 48px; padding-top 56px/bottom 80px):
   - Left: sage pill "Cash on delivery across the UK"; H1 (clamp 44–80px) "Sofas worth coming home to.";
     sub (19px `#4a514b`, 46ch): "Handcrafted sofas delivered to your door. Check the fabric, the fit and the finish in person — and only pay once you love it.";
     CTA row: `.btn.bp` "Shop all sofas" → `/sofas`, `.btn.bo` "How pay on delivery works" → `#how`;
     trust row (green 14px/500): "Free UK delivery" · "5-year frame guarantee" · "Confirmation call before dispatch".
   - Right: hero image (radius 32px, Sofa `fab #C9824F / bg #DCE5DA / acc #F4E1D6`, ratio 1.05) + floating card (white, 18px, shadow): "Pay when it arrives" / "Cash or card to the driver".
4. **How it works** (`id="how"`, dark `#1F3A32`): eyebrow `.lab` peach "How it works"; H2 (clamp 34–48px) "You pay after you've seen it. Not before."; right paragraph `#EBE3D6`: "No card details online. We confirm by phone, deliver with a two-person team, and you pay the driver once you're happy." 4 cards (`#2E5247`, radius 22px, padding 28px), each: step number Fraunces 40px `#F4E1D6` + H3 22px + 15px `#E3EBE4`:
   - "01 Order online" — "Pick your sofa and fabric. No payment details needed."
   - "02 We confirm by phone" — "A quick call or text to check your address and delivery slot."
   - "03 We deliver" — "A two-person team brings it to your room of choice."
   - "04 Inspect, then pay" — "Happy with it? Pay the driver by cash or card. Not right? Refuse it."
5. **Shop by style**: H2 "Shop by style" + text link "View every sofa" → `/sofas`; 6 tiles (`auto-fit minmax(190px,1fr)`), each → `/sofas` (all generic — no per-category URLs): Sofa image + name + arrow. Categories: "3 seater sofas" `#D8CBB4/#EFE8DC` · "Corner sofas" `#5E7A6B/#DCE5DA` · "3+2 sets" `#8C6B57/#F1E4D9` · "Armchairs" `#C27B5A/#F4E1D6` · "Recliners" `#3F4443/#E8DFD2` · "Sofa beds" `#2E3F5C/#DCE8F3`.
6. **Bestsellers** (sand `#EBE3D6` bg): eyebrow "Bestsellers"; H2 "Made for real living rooms"; `.btn.bo` "See all sofas" → `/sofas`. 4 product cards (image → `/sofas/[slug]`, `.tag` badge, name link, sub, price + was struck, "Pay on delivery" microcopy):
   - Oslo 3 Seater Sofa · "Easy-clean oat weave" · £649 / £899 · "Save £250" (`#B65A35`/`#FFFFFF`)
   - Bergen Corner Sofa · "L-shape · soft velvet" · £1,149 · "Best seller" (`#1F3A32`/`#F6F1EA`)
   - Lund Armchair · "Bouclé · 1 seater" · £329 · "New" (`#FFFFFF`/`#1E2421`)
   - Malmö 3+2 Set · "Jumbo cord · seats 5" · £1,299 / £1,599 · "Save £300" (`#B65A35`/`#FFFFFF`)
7. **Why-choose-us** (3 columns, each `border-top:2px solid #1E2421`):
   - "Pay only when you're happy" — "See the fabric, test the seat and check the finish at your door. Then pay the driver."
   - "Built to last" — "Solid frames and a 5-year guarantee on many ranges, with easy-clean fabrics for family life."
   - "Delivered to your room" — "Free UK delivery with a two-person team. We'll call first to agree your slot."
8. **Reviews** (blush bg): eyebrow terracotta "Customer reviews"; H2 "[Rating] on Trustpilot"; 3 identical placeholder cards (★★★★★, "[Customer review — sample text. Replace with a real review from your site.]", "[First name], [Town]").
9. **FAQ** (2-col flex): left: eyebrow "Questions"; H2 "Pay on delivery, explained"; "Still unsure? Message us on WhatsApp and we'll walk you through it." (plain text, no link). Right: 4 `<details>` accordions:
   - "Do I pay anything online?" — "No. You place the order with your details only. Payment is made to the driver when the sofa arrives."
   - "How can I pay the driver?" — "[Confirm accepted methods: cash, card machine, bank transfer.]"
   - "What if I don't like it at the door?" — "You can inspect it before paying. If it isn't right, you can refuse delivery. [Add your refusal and returns policy.]"
   - "How long does delivery take?" — "[Add typical delivery times.] We call you first to agree a delivery slot."
10. **Footer** (`#1F3A32`): brand "Sofora" + "Sofas only. Delivered across the UK, paid for on arrival."; "Shop" column (All sofas / Corner sofas / 3+2 sets / Armchairs → `/sofas`); "Help" column ("How COD works" → `#how`; "Delivery policy", "Returns", "Contact" → `#`); "Contact" column: "[Phone number]" / "[Email address]" / "[Business address]". Bottom bar: "© 2026 Sofora. All rights reserved."

### 02 — COLLECTION (`/sofas`)

1. **Trust bar** (`#1F3A32`): "Nothing to pay online — pay on delivery" · "Free UK delivery over £[500]" · "Inspect your sofa at the door first".
2. **Header** (same as HOME; nav "All sofas" active with 2px `#1F3A32` underline; basket → `/checkout` badge "1").
3. **Breadcrumb**: Home → / · "All sofas" (current).
4. **Title row**: H1 "All sofas" (clamp 40–60px); sub: "Every sofa ships free across the UK and is paid for on delivery, after you've inspected it."; right: "[24] sofas" + Sort select ("Best selling", "Price: low to high", "Price: high to low", "Newest").
5. **Quick chips**: "All" (active) · "3 seater" · "Corner" · "3+2 sets" · "Armchair" · "Sofa bed".
6. **Sidebar + grid** (flex, gap 40px): sidebar 250px — "Filters" + "Clear all" (`#B65A35`):
   - Seats: "1 seater", "2 seater", "3 seater" (checked), "4+ seater"
   - Fabric: "Easy-clean weave" (checked), "Velvet", "Jumbo cord", "Bouclé"
   - Colour: 8 swatches (34px circles): Oat `#D8CBB4` (active ring `#1F3A32`) · Sage `#5E7A6B` · Charcoal `#3F4443` · Terracotta `#C27B5A` · Navy `#2E3F5C` · Mink `#8B7B6B` · Blush `#D9B8AE` · Mustard `#CFA33A`
   - Price: dual-handle slider, "£[200]" – "£[1,500]"
   - Features: "Storage", "Sofa bed", "Reclining"
   
   9 cards (name → `/sofas/[slug]`, image → `/sofas/[slug]`, `.tag` badge, 21px price + was, heart "Save to wishlist", "Pay on delivery" row with sofa glyph):
   | Name | Sub | Price | Was | Tag |
   |---|---|---|---|---|
   | Oslo 3 Seater Sofa | Easy-clean oat weave | £649 | £899 | Save £250 |
   | Bergen Corner Sofa | L-shape · soft velvet | £1,149 | — | Best seller |
   | Lund Armchair | Bouclé · 1 seater | £329 | — | New |
   | Malmö 3+2 Set | Jumbo cord · seats 5 | £1,299 | £1,599 | Save £300 |
   | Visby 3 Seater | Charcoal weave | £599 | — | Best seller |
   | Aarhus Corner Sofa | Left or right hand | £1,249 | £1,449 | Save £200 |
   | Dalby 2 Seater | Navy velvet | £479 | — | New |
   | Fjord Corner Sofa | Mink easy-clean | £1,099 | — | New |
   | Nyborg Armchair | Mustard cord | £349 | — | New |
   
   Pagination: "Previous" `.btn.bo` · "1" (44px dark circle) · "2", "3" → `/sofas` · "Next" `.btn.bo`.
7. **COD band** (`#1F3A32`): Fraunces 24px "Not sure? Inspect it first, pay after." + cream `.btn` "How it works" → `/#how`.

### 03 — PRODUCT (`/sofas/[slug]`, shown with Oslo 3 Seater Sofa)

1. **Trust bar + header** (same; no active nav item).
2. **Breadcrumb**: Home / · All sofas → `/sofas` · "Oslo 3 Seater Sofa" (current).
3. **Hero** (flex, gap 56px):
   - **Gallery**: main image 28px radius (Sofa three, fabric-reactive `fab/bg/acc`); 4 thumbs (12px radius): first selected (2px `#1F3A32` outline), two tinted, fourth static tile "Fabric close-up" (`#EBE3D6`, 13px/600 grey).
   - **Info panel**: badge "Save £250" (terracotta on `#F4E1D6`, 12px uppercase); H1 "Oslo 3 Seater Sofa" (clamp 34–48px);
     rating row: "★★★★★" terracotta (aria "Rated [x] out of 5") + underlined link "[0] reviews" → `#reviews`;
     price row: 36px "£649" + 18px grey struck "£899";
     COD banner (sage, 18px): "Pay £649 when it arrives" + "Nothing to pay today. Inspect your sofa at the door, then pay the driver.";
     Fabric selector: "Fabric" label + "Oat weave"; 5 swatches 44px (selected ring `#1F3A32`, others `#DDD3C4`): Oat weave `#D8CBB4` · Sage weave `#5E7A6B` · Charcoal weave `#3F4443` · Terracotta weave `#C27B5A` · Navy weave `#2E3F5C`;
     size pills (`.pill` 12px-radius; `.on` = inset `#1F3A32` ring): "2 seater" · "3 seater" (on) · "3+2 set";
     buy row: qty stepper (− / 1 / +) + `.btn.bp` "Order now — pay on delivery" → `/checkout`;
     `.btn.bo` full-width "Add to basket" (no link);
     postcode checker (white card, border `#DDD3C4`): "Check delivery to your postcode" + input "e.g. M30 7SA" + `.btn.bo` "Check" + "Estimated delivery: [X–Y working days]. We call to confirm your slot.";
     accordions: "Details" (open) — "Easy-clean oat weave upholstery" · "Solid hardwood frame, 5-year guarantee" · "Reversible seat cushions";
     "Dimensions" — "Width [__]cm · Depth [__]cm · Height [__]cm · Seat height [__]cm";
     "Delivery & returns" — "Free UK delivery by a two-person team. Inspect before you pay. [Add your refusal and returns policy.]"
4. **"You might also like"** (`id="reviews"`, sand bg): H2 + "View all sofas" → `/sofas`; 4 cards (whole card → `/sofas/[slug]`, no tags/hearts): Malmö 3+2 Set £1,299 · Bergen Corner Sofa £1,149 · Visby 3 Seater £599 · Lund Armchair £329.
5. **Footer** (`#1F3A32`): "Sofora" + "© 2026 Sofora · [Phone] · [Email] · [Address]".

### 05 — CHECKOUT (`/checkout`)

1. **Header** (cream, border `#DDD3C4`): logo "Sofora" → `/`; center "Secure checkout · Pay on delivery"; link "Back to product" → `/sofas/[slug]` (underlined).
2. H1 "Checkout" + sub "No payment today. You'll pay the driver when your sofa arrives."
3. **Two-column** (form flex 2 + summary sidebar): numbered panels (badge `.num` 30px circle):
   - **1 Your details**: Full name ("Amelia Thompson") / Email ("amelia@example.com"); Mobile number ("07xxx xxxxxx") — hint: "We'll text a 4-digit code to confirm your order, and call to agree your delivery slot."
   - **2 Delivery address**: Postcode ("M30 7SA") + "Find address" button (dead mock button); Address line 1 ("12 Example Road") / Address line 2 (optional, empty); Town / city ("Manchester") / County ("Greater Manchester"); small-caps "Access for delivery": Floor select (Ground floor / 1st floor / 2nd floor or higher) / Lift available? select (No lift / Yes, lift); Notes for the driver (optional) textarea placeholder "Narrow hallway, parking, gate code…" + hint "Helps our two-person team bring the sofa in without surprises."
   - **3 Delivery slot**: 3 selectable `.opt` cards (`.on` = green border + inset ring + `#F1F5F2`): "Sat 17 Oct / 9am – 1pm" (selected), "Sat 17 Oct / 1pm – 6pm", "Mon 19 Oct / 9am – 1pm"; note: "Sample dates. Slots are confirmed by phone before dispatch."
   - **4 Payment**: single `.opt.on` card — "Pay on delivery"; "Pay the driver once you've inspected your sofa. [Cash or card — confirm accepted methods.]"; checklist: "Nothing to pay online" · "Check the sofa before you pay" · "Please have £649 ready when we arrive". Consent checkbox (checked): "I'll be home for delivery, and I agree to the [terms] and [delivery policy]." (links → `#`).
   
   **Order summary** (sidebar panel): "Order summary"; item row (96px thumb placeholder): "Oslo 3 Seater Sofa" / "Oat weave · Qty 1" / "£649"; "Subtotal — £649.00"; "Delivery — Free"; "Due on delivery — £649.00".
   Trust box (sage): "We'll call to confirm before dispatch" · "Free two-person delivery" · "5-year frame guarantee".
4. CTA `.btn.bp` "Place order — pay £649 on delivery" → `/order-confirmed`.
No validation error strings anywhere; inputs carry no type/placeholder/required attrs (prefilled values only).

### 06 — ORDER-CONFIRM (`/order-confirmed`)

1. Header: logo "Sofora" → `/`.
2. Hero (centered): H1 "Thank you, Amelia." / "Your order is in."; sub: "Order #SF-[0000] is reserved. We'll text a code and call you shortly to confirm your delivery slot. Nothing to pay until it arrives."
3. Left — **"What happens next"** panel (4 steps with badge circles):
   - ✓ "Order received" (badge `#2F7D4F`/`#FFFFFF`) — "Your sofa is reserved. A confirmation has been sent to your email."
   - 2 "We confirm by phone" (badge `#1F3A32`/`#F6F1EA`) — "Expect a text code and a quick call to check your address and agree a slot."
   - 3 "Packed and dispatched" (badge `#EBE3D6`/`#1E2421`) — "Your sofa leaves our warehouse. We'll message you when the driver is on the way."
   - 4 "Inspect, then pay" (badge `#EBE3D6`/`#1E2421`) — "Check your sofa at the door. Happy? Pay the driver. Not right? You can refuse delivery."
4. Right: green due-box — "Due on delivery" / "£649.00" / "Please have payment ready for the driver. [Cash or card — confirm accepted methods.]"; white panel: product row (72px thumb, "Oslo 3 Seater Sofa" / "Oat weave · Qty 1"), "Delivering to — Amelia Thompson / 12 Example Road, Manchester M30 7SA", "Requested slot — Sat 17 Oct · 9am – 1pm"; buttons: `.btn.bp` "Keep shopping" → `/`; `.btn.bo` "WhatsApp us" → `#`.
No tracking number/map — status communication is phone/text only.

### 07 — MOBILE-HOME (mobile variant, fixed 390×2000 canvas, `overflow:hidden`)

1. Announcement (single line, 13px): "Pay on delivery · Free UK delivery".
2. Header (space-between): hamburger button (dead), centered logo → mobile home, search button (dead), basket button (dead, aria "Basket, 1 item" — no link, no badge).
3. Hero (stacked): sage pill (no icon) "Cash on delivery across the UK"; H1 44px "Sofas worth coming home to."; sub 16px "Check the fabric, fit and finish at your door — and only pay once you love it."; full-width `.btn.bp` "Shop all sofas" → `/sofas`; full-width `.btn.bo` "How pay on delivery works" → `#how`; image below (radius 24px). Omits trust row + floating card.
4. How it works (`#how`, dark, padding 36px 20px): eyebrow "How it works"; H2 30px "You pay after you've seen it."; 4 HORIZONTAL step cards (`#2E5247`, radius 16px): 01–04 one-liner descriptions ("No payment details needed." / "Address and delivery slot." / "Two-person team, to your room." / "Pay the driver — or refuse it.").
5. Shop by style: H2 28px + "View all" → `/sofas`; horizontal-scroll carousel of 5 tiles (no Recliners; short names: "3 seater", "Corner", "3+2 sets", "Armchairs", "Sofa beds"; 150px tiles) → `/sofas`.
6. Bestsellers (sand): H2 28px "Made for real living rooms"; 2-col grid of 4 products (no badges, no sub, no was-price, no icons) → `/sofas/[slug]`; full-width `.btn.bo` "See all sofas" → `/sofas`.
7. Sticky bottom tab bar (absolute, 4 tabs, min-height 44px): "Home" (active `#1F3A32`) → mobile home · "Shop" → `/sofas` · "Saved" → `#` · "Basket" → mobile checkout.
**Omitted entirely:** why-choose-us, reviews, FAQ, footer.

### 08 — MOBILE-CHECKOUT (mobile variant, 390×1800 canvas)

1. Header: back arrow → mobile home; centered "Checkout".
2. Sage trust banner: "Nothing to pay today." / "Pay the driver after you've inspected your sofa."
3. Product card: thumb + "Oslo 3 Seater Sofa" / "Oat weave · Qty 1" / "£649".
4. Card "Your details": Full name "Amelia Thompson" / Email "amelia@example.com" / Mobile number "07xxx xxxxxx"; hint "We'll text a 4-digit code and call to confirm your slot."
5. Card "Delivery address": Postcode "M30 7SA" (no Find address) / Address line 1 "12 Example Road" (no line 2) / Town / city "Manchester" (no County) / "Floor & lift access" single select: "Ground floor" / "1st floor, no lift" (no driver notes).
6. Card "Delivery slot": same 3 hardcoded slot cards (Sat 17 Oct 9am–1pm selected).
7. Card "Payment": "Pay on delivery" / "Please have £649 ready for the driver."; "Due on delivery — £649.00". No consent checkbox, no terms links.
8. Sticky bottom bar: full-width `.btn.bp` "Place order — pay £649 on delivery" → `/order-confirmed`.

### 09 — ADMIN-DASH (`/admin`)

Sidebar (250px, `#1F3A32`): logo "Sofora / Admin"; nav: Dashboard (active) · Orders (→ `/admin/orders`, badge "[12]" `#B65A35`) · Sofas → `/admin/sofas` · Customers → `/admin/orders` (same target) · Delivery & COD → `/admin/settings` · Settings → `/admin/settings`; owner card "SD" / "[Owner name]" / "Store owner".
Topbar: H1 36px "Good morning"; "Friday 9 October · Sample data shown for design purposes"; search pill (placeholder "Search order, name, phone") + bell (unread dot `#B65A35`).
6 KPI cards: New orders today `[00]` / "vs yesterday [+0%]" (green) · Awaiting confirmation `[00]` / "Call these first" (amber) · Out for delivery `[00]` / "On the road today" (blue) · Cash to collect `£[0,000]` / "Across active routes" (grey) · Delivered & paid `[00%]` / "Last 30 days" (green) · Refused / failed `[00%]` / "Target below [00%]" (red).
"Orders this week" bar chart (7 bars Sat–Fri: 6,4,9,7,10,8,5 — heights vals×17 px; legend "Delivered & paid" `#1F3A32`, "Refused / failed" `#B65A35` — refused series is not rendered).
"COD funnel" (5 rows, track `#EBE3D6`): Orders placed 100% · Confirmed by phone [00%] 78% · Dispatched [00%] 72% · Delivered [00%] 61% · Cash collected [00%] 61%.
"Recent orders" (5 rows, columns: Order / Customer / Sofa / Due on delivery / Status): #SF-1042 Amelia Thompson Manchester Oslo 3 Seater £649 Awaiting confirmation · #SF-1041 Daniel Okafor Leeds Bergen Corner £1,149 Confirmed · #SF-1040 Priya Shah Birmingham Malmö 3+2 Set £1,299 Out for delivery · #SF-1039 Tom Hughes Cardiff Lund Armchair £329 Delivered · paid · #SF-1038 Grace Miller London Visby 3 Seater £599 Refused. Order id → `/admin/orders/[id]`. "View all" → `/admin/orders`.
"Needs attention": "4 orders unconfirmed for 24h+" / "Call or text to confirm slot" (amber) · "2 high-risk orders flagged" / "Repeat refusals or mismatched postcode" (red) · "3 failed delivery attempts" / "Rebook or return to stock" (blue) · "1 sofa low on stock" / "Visby 3 Seater · charcoal" (sand).
No quick-actions section; no empty states.

### 10 — ADMIN-ORDERS (`/admin/orders`)

Header: H1 "Orders" + "Confirm, dispatch and collect cash on delivery. Sample data shown."; buttons: "Export CSV" (`.btn`), "Create order" (`.btn.bp`, plus icon).
Status tabs (6, with counts): All `[00]` (active) · Awaiting confirmation `[00]` · Confirmed `[00]` · Out for delivery `[00]` · Delivered `[00]` · Refused / failed `[00]`.
Toolbar: search (placeholder "Search order no., name, phone or postcode"); buttons "Date: last 30 days" · "Payment: COD" · "Risk: all".
Bulk bar (sage): "2 selected" + "Mark confirmed" / "Assign to route" / "Print delivery notes".
Table columns: checkbox (select-all) · Order · Customer · Sofa · Delivery · Due on delivery · Verified · Status · (chevron → detail).
8 rows: #SF-1042 Amelia Thompson Manchester M30 7SA Oslo 3 Seater Sat 17 Oct · AM £649 Not verified Awaiting confirmation · #SF-1041 Daniel Okafor Leeds LS6 2AB Bergen Corner Sat 17 Oct · PM £1,149 Phone verified Confirmed · #SF-1040 Priya Shah Birmingham B15 3TT Malmö 3+2 Set Today · AM £1,299 Phone verified Out for delivery · #SF-1039 Tom Hughes Cardiff CF10 1AA Lund Armchair Today · AM £329 Phone verified Delivered · paid · #SF-1038 Grace Miller London E8 4PQ Visby 3 Seater Wed 7 Oct £599 High risk Refused · #SF-1037 Hassan Ali Bradford BD5 8EL Aarhus Corner Mon 19 Oct · AM £1,249 Phone verified Packed · #SF-1036 Sophie Clarke Bristol BS3 4RT Dalby 2 Seater Mon 19 Oct · PM £479 Not verified Awaiting confirmation · #SF-1035 Marcus Reid Glasgow G12 8QQ Oslo 3 Seater Tue 20 Oct · AM £649 Phone verified Confirmed.
Pagination: "Showing 1–8 of [00]" + Previous / Next.

### 11 — ADMIN-ORDER-DETAIL (`/admin/orders/[id]`, shown with #SF-1042)

Breadcrumb: Orders → `/admin/orders` / "#SF-1042".
Header: H1 "Order #SF-1042" + pill "Awaiting confirmation"; buttons: "Print delivery note" (`.btn`), "Cancel order" (`.btn`, red text), "Confirm order" (`.btn.bp`). No refund action.
"COD progress" card: 5-stage stepper — 1 ✓ "Order placed / Today, 09:14" (done green) · 2 "Confirmed / Call + SMS code" (current dark) · 3 "Packed / Warehouse" · 4 "Out for delivery / Driver route" · 5 "Delivered & paid / Cash collected" (todo sand).
"Confirmation checklist" (pill "1 of 4 done"): "Order placed online / Details captured at checkout" [View] (done) · "Mobile number verified / SMS code not yet entered" [Resend code] · "Confirmation call / No call logged yet" [Log call] · "Address & access confirmed / Check stairs, lift and doorway width" [Confirm].
"Items": Sofa thumbnail (Oat/cream, three) + "Oslo 3 Seater Sofa" / "Oat weave · 3 seater · SKU [OSL-3-OAT]" / "Qty 1" / "£649.00"; totals: Subtotal £649.00 · Delivery Free (green) · Due on delivery £649.00.
"Activity": "Order placed by customer — pay on delivery / Today, 09:14" · "SMS verification code sent to 07xxx xxxxxx / Today, 09:14" · "Confirmation email sent / Today, 09:14"; input "Add an internal note…" + "Add note".
"Cash to collect" (dark card): Fraunces 48px "£649.00"; "Payment received as" select: "Not yet collected" / "Cash" / "Card (driver terminal)"; "Mark delivered & paid" disabled (.7 opacity) — note "Available once the order is out for delivery."
"Customer": "AT" avatar / "Amelia Thompson" / "First order"; "Phone / 07xxx xxxxxx", "Email / amelia@example.com"; buttons Call / Text / WhatsApp; "View" → `#`.
"Delivery": "12 Example Road / Manchester M30 7SA"; "Slot / Sat 17 Oct · 9am–1pm"; "Access / Ground floor, no lift"; "Route / Not assigned"; "Assign to route".
"Risk check" (pill "Medium"): green "Postcode matches delivery area" · green "No previous refusals" · amber "Phone not yet verified".

### 12 — ADMIN-PRODUCTS (`/admin/sofas`)

Header: H1 "Sofas" + "Your catalogue. Sofas only. Sample data shown."; buttons "Import CSV" (no target), "Add sofa" (`.btn.bp`) → `/admin/sofas/new`.
Tabs: All `[00]` (active) · Live `[00]` · Draft `[00]` · Low stock `[00]`.
Toolbar: search placeholder "Search by name or SKU"; pill buttons "Type: all" · "Fabric: all" · "Sort: newest" (no dropdown markup).
Table columns: checkbox · Sofa (56px Sofa thumb + name link → edit + "SKU [xxx]") · Type · Fabric colours (16px dots) · Price · Stock (pill) · Live (toggle) · (edit icon → edit; no delete/duplicate).
7 rows: Oslo 3 Seater Sofa [OSL-3] / 3 seater / dots #D8CBB4,#5E7A6B,#3F4443 / £649 / In stock / live-on ·
Bergen Corner Sofa [BRG-C] / Corner / #5E7A6B,#2E3F5C,#C27B5A / £1,149 / In stock / on ·
Lund Armchair [LND-1] / Armchair / #EDE5D8,#8B7B6B / £329 / Low stock / on ·
Malmö 3+2 Set [MLM-32] / 3+2 set / #8C6B57,#D9B8AE,#3F4443 / £1,299 / In stock / on ·
Visby 3 Seater [VSB-3] / 3 seater / #3F4443,#D8CBB4 / £599 / Low stock / on ·
Aarhus Corner Sofa [AAR-C] / Corner / #C27B5A,#5E7A6B / £1,249 / Out of stock / off ·
Dalby 2 Seater [DLB-2] / 2 seater / #2E3F5C,#D9B8AE,#CFA33A / £479 / In stock / off.
Pagination: "Showing 1–7 of [00]" + Previous / Next.

### 13 — ADMIN-ADD-EDIT (`/admin/sofas/new` and `/admin/sofas/[id]/edit` — single mockup "Add sofa")

Breadcrumb: Sofas → `/admin/sofas` / "Add sofa". Top-right: "Discard" → `/admin/sofas`; "Save as draft" (no target); "Publish sofa" (no target). Form pre-loads Oslo values as editable defaults.
Main column:
- **Basics**: Sofa name ("Oslo 3 Seater Sofa") · Description textarea ("Easy-clean oat weave 3 seater with a solid hardwood frame and reversible seat cushions.") · Type select: 3 seater / 2 seater / Corner sofa / 3+2 set / Armchair / Sofa bed · SKU ("[OSL-3]") · Fabric type select: Easy-clean weave / Velvet / Jumbo cord / Bouclé.
- **Photos** ("First photo is the cover"): 3 sofa tiles (first marked Cover: 2px `#1F3A32` outline + dark pill) + dashed "Upload" button.
- **Fabric colours & stock** ("Add colour"): table Colour / Name / SKU / Stock / Price +/−: Oat #D8CBB4 [OSL-3-OAT] [00] £0 · Sage #5E7A6B [OSL-3-SGE] [00] £0 · Charcoal #3F4443 [OSL-3-CHR] [00] £0.
- **Size & delivery**: Width / Depth / Height / Seat height (cm) placeholders "[__]" ×4; Weight (kg) / Boxes-pieces / Min. doorway width (cm) placeholders "[__]" ×3; helper "Shown to customers and drivers."
Aside:
- **Status**: "Live on storefront" toggle Off; "Show "New" badge" toggle On.
- **Pricing**: Price (£) "649"; Compare-at price (£) "899" + "Shown as the crossed-out price."
- **Pay on delivery**: "Available as COD" On; "Require phone verification" On; "Max COD order value (£)" placeholder "[No limit]".
- **Organisation**: Collections ("3 seater sofas, Easy-clean") + pills "3 seater sofas" / "Easy-clean".
No SEO fields anywhere. No validation hints.

### 14 — ADMIN-DELIVERY-COD (`/admin/settings`)

Header: H1 "Delivery & COD rules" + "Control how pay-on-delivery orders are verified, scheduled and delivered."; "Cancel" / "Save changes" (no targets).
- **Order verification** ("Cut down on fake and refused orders before they ship."): SMS code at checkout On · Confirmation call before dispatch On ("Order stays "Awaiting confirmation" until your team logs a call.") · Flag repeat refusers On · Flag mismatched postcodes Off; select "Auto-cancel if unconfirmed after": 48 hours / 24 hours / 72 hours; select "Block COD after refusals": 2 refused deliveries / 1 / 3.
- **Payment on delivery**: Min. order value (£) `[None]` · Max. COD order value (£) `[No limit]` · Accept cash On · Accept card on driver's terminal On · Require exact change notice On ("Tell customers to have the full amount ready."). No COD-fee or deposit-% control.
- **Delivery zones** ("Add zone"): table Zone / Postcode areas / Delivery fee / Lead time / COD — Zone 1 `[M, SK, WA…]` Free `[X–Y days]` On · Zone 2 `[B, LS, L…]` Free `[X–Y days]` On · Zone 3 `[London]` `£[0]` `[X–Y days]` On · Highlands & islands `[IV, KW, HS…]` `£[0]` `[X–Y days]` On (all COD pills green "On").
- **Delivery slots**: Morning slot "9am – 1pm" · Afternoon slot "1pm – 6pm" · Max deliveries per slot placeholder `[00]` · Two-person delivery on every sofa On ("Recommended for 3-seaters and corner sofas.").
- **Customer messages** (aside, all On): SMS verification code · Order confirmed (SMS) · Out for delivery (SMS) · Email receipts. Preview: "Hi [First name], your Sofora order #[0000] is confirmed for [date, slot]. Please have £[amount] ready for the driver."
- **Team** (aside): SD [Owner name] Owner (#F4E1D6) · OP [Order desk] Confirms orders (#E3EBE4) · DR [Driver lead] Delivery routes (#DCE8F3); "Invite team member" (no target).

---

## 3. Data model

### Product
`{ name, sku, sub (tagline), price ("£649"), was ("£899"|""), type ("three"|"corner"|"chair"), fab, bg, acc (hexes for Sofa illustration), dots [fabric hexes], colours [{hex,name,sku,stock,priceAdj}], category/type label, fabricType, description, dimensions {width,depth,height,seatHeight,weight,boxes,doorway}, live ("on"|"off"), newBadge bool, stock ("In stock"|"Low stock"|"Out of stock"), codAvailable bool, phoneVerification bool, maxCodValue, collections [strings], rating, reviewCount }`
Sample values: see collections table above; Oslo default: name "Oslo 3 Seater Sofa", sku "[OSL-3]", price 649 / was 899, type "three", fab "#D8CBB4", bg "#EFE8DC", acc "#B65A35", fabrics 5 (Oat/Sage/Charcoal/Terracotta/Navy weave), sizes ["2 seater","3 seater","3+2 set"], dims all `[__]`.
Catalog: Oslo, Bergen, Lund, Malmö, Visby, Aarhus, Dalby, Fjord, Nyborg (9).

### Order
`{ id ("#SF-1042"), when ("Today, 09:14"), customer {name ("Amelia Thompson"), phone ("07xxx xxxxxx"), email ("amelia@example.com"), town ("Manchester"), address ("12 Example Road"), county ("Greater Manchester"), postcode ("M30 7SA"), firstOrder bool }, items [{product, fabric ("Oat weave"), size ("3 seater"), sku ("[OSL-3-OAT]"), qty (1), price ("£649.00")}], subtotal ("£649.00"), deliveryFee ("Free"), total ("£649.00" due on delivery), slot ("Sat 17 Oct · 9am–1pm"), access ("Ground floor, no lift"), route, status, verified ("Phone verified"|"Not verified"|"High risk"), risk ("Medium"), paymentMethod ("Not yet collected"|"Cash"|"Card (driver terminal)"), stages [], checks [], log [{t,w}] }`
Status pipeline (admin): Awaiting confirmation → Confirmed → Packed → Out for delivery → Delivered · paid; side states: Refused. Storefront confirm stepper: Order placed → Confirmed → Packed → Out for delivery → Delivered & paid.
Sample orders: #SF-1042…#SF-1035 (8 rows; customers: Amelia Thompson/Manchester, Daniel Okafor/Leeds, Priya Shah/Birmingham, Tom Hughes/Cardiff, Grace Miller/London, Hassan Ali/Bradford, Sophie Clarke/Bristol, Marcus Reid/Glasgow).

### Settings (Delivery & COD)
`verify {smsCode: on, confirmCall: on, flagRefusers: on, flagPostcodeMismatch: off, autoCancelAfter: "48 hours", blockCodAfter: "2 refused deliveries"}; payment {minOrderValue, maxCodValue, acceptCash: on, acceptCard: on, exactChangeNotice: on}; zones [{name, postcodes, fee, leadTime, codOn} ×4]; slots {morning: "9am–1pm", afternoon: "1pm–6pm", maxPerSlot}; messages {smsCode, orderConfirmed, outForDelivery, emailReceipts: all on}; team [{initials, name, role}]`.

### Review / FAQ shapes
`review {q (text), who ("[First name], [Town]")}` ×3 placeholders. `faq {q, a}` ×4 (see HOME §9 verbatim).

---

## 4. Route map (implied by mockup links)

| Mockup target | Next.js route |
|---|---|
| `Main.dc.html` | `/` |
| `Collection.dc.html` | `/sofas` |
| `Product.dc.html` | `/sofas/[slug]` |
| `Checkout.dc.html` | `/checkout` |
| `Confirmation.dc.html` | `/order-confirmed` |
| `MobileHome.dc.html` | (mobile-only variant of `/`) |
| `MobileCheckout.dc.html` | (mobile-only variant of `/checkout`) |
| `AdminDashboard.dc.html` | `/admin` |
| `AdminOrders.dc.html` | `/admin/orders` |
| `AdminOrder.dc.html` | `/admin/orders/[id]` |
| `AdminProducts.dc.html` | `/admin/sofas` |
| `AdminProductEdit.dc.html` | `/admin/sofas/new` and `/admin/sofas/[id]/edit` |
| `AdminSettings.dc.html` | `/admin/settings` |
| `Main.dc.html#how` | `/#how` |

Note: all category tiles link to generic `/sofas` (no per-category URLs); all product cards link to generic product page (no slugs in mockup — slugs needed); `Customers` admin nav → `/admin/orders`; Customer-card "View" → `#`.

---

## 5. [Bracketed placeholders] needing real content from the owner

- `£[500]` — free-delivery threshold (announcement/trust bars, home+collection+product)
- `[Rating]` — Trustpilot rating heading; 3× `[Customer review — sample text. Replace with a real review from your site.]` / `[First name], [Town]`
- `[Phone number]` / `[Email address]` / `[Business address]` (home footer); `[Phone]` / `[Email]` / `[Address]` (product footer)
- FAQ: `[Confirm accepted methods: cash, card machine, bank transfer.]` · `[Add your refusal and returns policy.]` · `[Add typical delivery times.]`
- Product: `[x]` (rating aria), `[0]` reviews, `[X–Y working days]`, dimensions `[__]` ×7, footer `[Phone]/[Email]/[Address]`
- Collection: `[24]` sofas count; price filter `£[200]` / `£[1,500]`
- Checkout: `[Cash or card — confirm accepted methods.]` (payment card + confirm due box); `#SF-[0000]` order number
- Admin: `[12]` (orders nav badge) · `[00]` (all counts/KPIs/tab counts/pagination/stock) · `£[0,000]` (cash KPI) · `[00%]` / `[+0%]` (percentages/deltas) · `[Owner name]` (sidebar owner, team) · `[Order desk]` / `[Driver lead]` (team) · SKUs: `[OSL-3]`, `[BRG-C]`, `[LND-1]`, `[MLM-32]`, `[VSB-3]`, `[AAR-C]`, `[DLB-2]`, `[OSL-3-OAT]`, `[OSL-3-SGE]`, `[OSL-3-CHR]` · `[None]` (min order value) · `[No limit]` (max COD) · `[M, SK, WA…]` / `[B, LS, L…]` / `[London]` / `[IV, KW, HS…]` (zone postcodes) · `[X–Y days]` (zone lead times) · `£[0]` (zone fees) · SMS preview `[First name]`, `#[0000]`, `[date, slot]`, `£[amount]`
- Dead links to wire: Search, Wishlist, Find address, "Saved" tab, terms/delivery policy/Returns/Contact/WhatsApp-us (`#`), "Save as draft", "Publish sofa", "Cancel", "Save changes", "Add zone", "Add colour", "Upload", "Import CSV", "Invite team member"

---

### Mockup anomalies / rebuild notes
- `dc-import name="Sofa"` is a generated SVG illustration — replace with real product photography later; params above let it stand in.
- Products list has no delete/duplicate actions (edit only); no SEO fields on add/edit; no COD-fee/deposit controls.
- Storefront and admin share palette/tokens; admin helmet carries only `@font-face` (styles inline / runtime).
- Mobile mockups are fixed-canvas (390px) — rebuild as responsive rather than separate pages; mobile-specific variants (`MobileHome.dc.html`, `MobileCheckout.dc.html`) map to responsive behavior.
- Dashboard "Refused / failed" chart series is defined in data but never rendered.
- `Live on storefront` toggle renders Off on the add-form while list-level live toggles are On — mockup inconsistency.
- Sidebar "Customers" links to `/admin/orders`; "Delivery & COD" and "Settings" both → `/admin/settings`.

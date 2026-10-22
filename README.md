# AquaNest™ — Water Refilling Station & Delivery

**Pure Water. Happy Home.**
A full-stack ordering, delivery-tracking and station-management app for a Philippine water refilling station. All prices are in PHP (₱), and the whole UI switches between English and Tagalog.

| App | URL | Who |
|---|---|---|
| Landing page | `/` | Public |
| Customer app | `/dashboard`, `/order`, `/tracking`, … | Customers (phone OTP) |
| Admin dashboard | `/admin` | Station owner/staff |
| Rider app | `/rider` | Delivery riders |

---

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` runs `scripts/dev.mjs`, which:

1. Creates `.env` from `.env.example` on the first run. It points at a local Postgres and turns on Demo Mode.
2. Starts the bundled Postgres with `docker compose up -d db` when `DATABASE_URL` points at it. Docker Desktop must be running.
3. Runs `prisma db push`, then seeds the database if it's empty.
4. Starts Next.js on http://localhost:3000. If port 3000 is busy, Next picks the next free port.

### Demo logins

With Demo Mode on, the login screen has one-tap demo buttons, and **OTP `123456`** works for any number:

| Role | Mobile |
|---|---|
| Admin (Maria Santos) | 0917 000 0001 |
| Rider (Ivan / Jomar) | 0917 111 0001 / 0917 111 0002 |
| Customer (Anna Reyes) | 0917 123 4501 |
| Customers (Juan, Liza) | 0917 123 4502 / 0917 123 4503 |

Promo codes to try: `WELCOME20`, `SUKI10`, `PASKO50`.

---

## Connecting real services

Every integration is optional. Without one, the app falls back to a working local alternative.

| Service | Env vars | Without it |
|---|---|---|
| **Supabase Postgres** | `DATABASE_URL`, `DIRECT_URL` | Local Docker Postgres |
| **Supabase Auth** (phone OTP) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Demo OTP `123456` |
| **Supabase Realtime** (live tracking) | the two above plus `SUPABASE_SERVICE_ROLE_KEY` | Polling every 6–15 s |
| **Supabase Storage** (payment proofs, delivery photos, QR, logo) | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Files saved in `./uploads` and served from `/api/files/*` |
| **Google Maps** (pin picker, maps) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | OpenStreetMap (Leaflet) |
| **Distance Matrix** (road distance → delivery fee) | `GOOGLE_MAPS_SERVER_KEY` | Straight-line distance × 1.3 road factor |
| **SMS** | — (mock) | Logged to the `SmsLog` table and shown at `/admin/sms`. To send real SMS, swap `sendSms()` in `src/lib/notify.ts` for Semaphore or Twilio. |

**Supabase setup notes**

- **Phone auth:** enable the Phone provider (Twilio, MessageBird or Vonage) under Authentication → Providers.
- **Storage:** the `aquanest` bucket is created as a public bucket on the first upload.
- **Realtime:** uses Broadcast channels (`aquanest:order:{id}`, `aquanest:admin`, `aquanest:rider:{id}`, `aquanest:user:{id}`), so no table replication is needed.
- **Production demo buttons:** set `NEXT_PUBLIC_DEMO_MODE=false` to hide them.

**Suki Mode scheduler:** call `GET /api/cron/subscriptions` once a day with the header `Authorization: Bearer $CRON_SECRET` (for example from Vercel Cron). Opening the admin dashboard also runs it, at most once per day.

---

## Features

**Customer**

- **Login & addresses:** phone OTP login, and multiple addresses pinned on a map. The road distance sets the delivery fee automatically.
- **Order types:** Refill Lang, New with Gallon, Hiram (borrow) and Return Galon.
- **Products:** every size × water type combination (Purified, Mineral, Alkaline) has its own price.
- **Gallon deposit:** if you order more gallons than you have at home, a ₱150 deposit is added for each extra gallon. "Nasa iyo: 3 Round" shows what you hold.
- **Scheduling:** ASAP or a date + time slot. When the store is closed, ASAP is turned off automatically.
- **Suki Mode:** auto-orders on your chosen weekdays.
- **Payment:** COD, GCash or Maya. GCash and Maya show the store's QR code and require a payment screenshot. You can mark one method as your primary.
- **Live tracking:** Pending → Preparing → Out for Delivery → Delivered, with a live rider map, ETA, rider card and photo proof.
- **Loyalty & referrals:** 10 refills = 1 free refill, tracked automatically. Each customer gets a referral code.
- **Orders:** history, branded invoice PDF and one-tap Repeat Order.
- **Language & PWA:** EN/TL toggle (saved in a cookie and on the profile), and the app is installable as a PWA.

**Admin**

- **Dashboard:** KPIs (today's sales, pending orders, gallons out, low stock, riders active), a 14-day sales chart, payment mix, payment-verification queue and a rider map.
- **Order board:** drag-and-drop Kanban with a rider dropdown on each card. Customers are notified automatically, including the mock SMS "Out for delivery na si Kuya …!".
- **Customer CRM:** search; utang, deposit and gallon-loan editing; tags (Suki and May Utang are set automatically); SMS blast with templates; CSV export.
- **Inventory:** per-size gallon breakdown (Filled / Empty / At Customer / For Cleaning / Damaged) with quick moves, supplies stock and a gallon QR registry.
- **Riders:** add and edit riders, assign areas, upload photos, see performance stats, today's collections and a live map.
- **Pricing:** price matrix, delivery fee per km, free-delivery radius and threshold, deposit fee, loyalty and referral settings.
- **Promo codes:** percent or fixed discounts, with minimum order, usage limit and expiry.
- **Expenses:** seals, water, kuryente and more. Profit = Sales − Expenses, viewable by month.
- **Reports:** daily, weekly or monthly, with export to Excel and PDF.
- **POS:** walk-in sales with a cash keypad, change computation and a printable receipt.
- **Store settings:** logo, GCash/Maya QR codes, operating hours and days, auto-close, a manual "close now" switch, time slots and the station location.

**Rider**

- **Deliveries:** today's list with the customer's address and phone and the COD amount to collect.
- **Actions:** Navigate (opens Google Maps), Call, Start delivery, and Collect payment (Cash, GCash or Maya). If the customer pays short, the difference is recorded as utang.
- **Proof & location:** take a delivery photo with the camera. While online, the rider's live location is shared.
- **Daily collection summary:** cash, e-wallet, orders delivered and the amount to remit.

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Radix) · Prisma ORM · Supabase (Auth / Realtime / Storage) · Framer Motion · lucide-react · next-intl · Recharts · dnd-kit · Google Maps (`@vis.gl/react-google-maps`) with a Leaflet fallback · jsPDF · ExcelJS.

```
prisma/            schema.prisma, seed.ts
messages/          en.json, tl.json
scripts/dev.mjs    one-command bootstrap
src/app/(auth)     login (OTP + demo)
src/app/(customer) dashboard, order, schedule, addresses, payment, orders, tracking, profile, support
src/app/admin      dashboard, orders (kanban), pos, customers, inventory, riders, pricing, promos, expenses, reports, sms, settings
src/app/rider      deliveries, summary, history
src/lib            pricing (shared cart math), orders (status side-effects), auth, settings, realtime, storage, reports
```

Pricing is a pure function in `src/lib/pricing.ts`, used by both the browser (live preview) and the server. Totals are always recomputed on the server.

Side effects of order status changes (gallon tracking, inventory, deposits, utang, loyalty, referral rewards, notifications and SMS) all live in `src/lib/orders.ts`.

---

## Notes for exFAT / external drives (macOS)

On exFAT and NTFS drives, macOS creates `._*` "AppleDouble" sidecar files. They're harmless, but:

- `npm run dev` deletes them before it starts. Don't run `npm run clean:mac` while the dev server is running, because Next's file watcher can mistake the deletions for removed pages. If a route suddenly returns 404, restart `npm run dev`.
- Images are served unoptimized (`images.unoptimized`), because the optimizer's cache gets corrupted by these files.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | One-command bootstrap and dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:seed` | Re-seed the database (wipes existing data) |
| `npm run db:reset` | Force-reset the schema, then seed |
| `npm run db:studio` | Open Prisma Studio |
| `npm run typecheck` | Run TypeScript checks |

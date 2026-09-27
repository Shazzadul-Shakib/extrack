<div align="center">

<img src="public/next.svg" width="0" height="0" alt="" />

# Extrack

**A full-stack personal finance tracker — cash, bank, savings and debt in one dashboard.**

Log expenses, income and transfers, budget by category, compare any two months side by side, and watch net worth move over time.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![next-intl](https://img.shields.io/badge/i18n-next--intl-1c3a5e)](https://next-intl.dev)

[Features](#features) · [Highlights](#engineering-highlights) · [Tech stack](#tech-stack) · [Getting started](#getting-started) · [Architecture](#how-it-works) · [Localization](#localization)

</div>

---

> **Note for reviewers:** the login page has a **"Try demo account"** button that fills in a read-only-in-spirit demo login — no sign-up required to look around. The **EN / বাং** toggle in the header switches the whole app to Bangla, including numerals, dates, and pluralization — not just the labels.

## Screenshots

| Dashboard | Budgets (compare mode) |
|---|---|
| ![Dashboard screenshot](public/screenshots/dashboard.png) | ![Budgets screenshot](public/screenshots/budgets-compare.png) |

| Transactions | Wallets |
|---|---|
| ![Transactions screenshot](public/screenshots/transactions.png) | ![Wallets screenshot](public/screenshots/wallets.png) |

## Features

### Accounts

- **Five wallet types** — Cash, Bank, Savings, Lend (money you've lent to others), Debt (credit cards / loans) — each with its own balance and currency. New wallets default to BDT (৳), formatted with Bangla numerals when the UI is in বাংলা.
- Create, rename, and delete wallets. Deleting a wallet **soft-deletes** it (history stays intact for old transactions) and only an empty wallet can be deleted.
- A debt wallet's balance means *amount owed*, not cash on hand — an expense on it increases what you owe (e.g. a card purchase), a transfer into it pays it down. The same two rules (`expense` subtracts, `income` adds, sign flipped for debt) drive every wallet, so "pay off a card" and "move money into savings" both just fall out of a transfer.
- A lend wallet is the mirror of debt: its balance is a *receivable*. Lending money picks the real wallet it comes out of (recorded as a transfer, same as funding a savings wallet); getting paid back picks the real wallet it's deposited into. It auto-archives once fully repaid, same as a cleared debt.

### Transactions

- Three kinds: **expense**, **income**, **transfer** (wallet-to-wallet).
- Fixed category lists per kind (Food & Dining, Transport, Salary, Investment, etc.) so a category always maps to the same color in charts.
- Full CRUD with a live-updating wallet balance on every create/edit/delete, run inside a DB transaction so the balance and the transaction row never drift apart.
- Server-side pagination, free-text search, filtering by type/category/wallet/date range, and sorting (newest/oldest, amount high→low/low→high) — all reflected in the URL (shareable, back-button-friendly), with a "Clear filters" reset.
- **Month-over-month comparison** — pick any two months and see a category-by-category expense breakdown with the delta between them, swap the two months with one click.
- On mobile, filters collapse behind a toggle (with an active-filter count badge) so the page isn't dominated by empty dropdowns.

### Budgets

- Set a monthly spending limit per category and track actual spend against it, with an over-budget state that reads clearly at a glance.
- The **same month-comparison engine** as Transactions — compare this month's budget performance against any other month, side by side, with one click to swap which month is "base."
- Budget-vs-actual also surfaces on the Dashboard for the current month, so you don't have to leave the overview to see whether you're on track.

### Dashboard

- Toggleable stat cards: **Net worth** (all wallets, or excluding savings), **Expenses this month** (all, or excluding money moved into savings, each with a vs.-last-month delta), **Savings** (running total, or just this month's net contribution, delta on the latter), and **Debt vs. Lend** (total owed, or total lent out) — the same segmented-toggle pattern on all four, so switching what a card shows never means leaving the dashboard.
- **Selectable trend range** for the income-vs-expense chart: last week, this month, last month, or last 6 months.
- Spending-by-category breakdown for the selected month, hand-built as inline SVG (no charting library).
- A month/year picker for browsing any period, a wallet preview (max 4, "View all" for the rest), and the 6 most recent transactions.

### Savings, Lending & Debts

- Dedicated pages that filter the wallet/transaction data down to just that type, with the same stat-card + wallet-grid + history layout as the dashboard.
- Their filter bar skips the type/category dropdowns Transactions has — every row here is already the same category, so only wallet, date range, search, and sort remain.

### Release notes

- A "What's new" page lists every shipped version with a short summary of what changed, in both English and বাংলা.

### Design

- Custom design system: navy accent, light/dark mode (via `prefers-color-scheme`, overridable per-user), a fixed categorical color palette for charts validated for colorblind-safe contrast.
- A hand-built, fully accessible `Dropdown` component (keyboard navigation, typeahead, `role="combobox"`/`listbox`) used everywhere instead of the native `<select>`, so it can be styled and positioned consistently — including correctly inside modals.
- Responsive throughout: a fixed sidebar with independently scrolling content, card grids that step from 4 → 2 → 1 columns as the screen narrows.
- Favicon and Apple touch icon are generated from the actual brand mark (`app/icon.tsx`, `apple-icon.tsx` via `next/og`) rather than a static export, so they can't drift out of sync with the logo.

### SEO

- Per-locale `sitemap.xml` with `hreflang` alternates linking each page to its other-language counterpart, and a `robots.txt` that allows the public marketing/auth routes while disallowing the authenticated app routes across both locales.
- Open Graph and Twitter card metadata, plus JSON-LD `SoftwareApplication` structured data, generated per-locale (`generateMetadata`) rather than a single static `<head>`.

### Localization

- **Full English + বাংলা (Bangla) UI** — every page, form, table, empty state, and confirmation dialog, via locale-prefixed routes (`extrack.me/en/...`, `extrack.me/bn/...`) so each language is independently indexable and shareable. Switch languages from the compact toggle in the header; the choice is preserved across navigation.
- **Real localized formatting, not just translated strings.** Amounts render in BDT (৳) using each locale's native digits and grouping — large stat-tile values use Bangla's own লাখ/কোটি compact-number system rather than a translated "K/M." Dates render with the full localized month name in both languages ("September 24, 2026" / "২৪ সেপ্টেম্বর, ২০২৬"). Percentages and counts inside translated sentences are formatted per-locale too, not left as raw Latin digits.
- Category and wallet-type names (Food & Dining, Salary, Cash, Debt, …) are translated for display only — the underlying values stored in the database and used for business logic stay canonical English strings, so filtering, matching, and historical data are unaffected by the language the UI happens to be in.
- Pluralization goes through ICU message format (`{count, plural, one {…} other {…}}`) rather than hand-rolled `s` suffixes, which also gets the numeral formatting for free inside the plural branch.

## Engineering highlights

A few things worth pointing out if you're skimming this as a portfolio piece rather than cloning it:

- **No client-side data-fetching library, and no third-party auth library.** Every page is a React Server Component reading straight from Prisma; every write is a Server Action called from `<form action={...}>`. Auth is `scrypt` password hashing + an HMAC-signed session cookie, both written from scratch against `node:crypto`.
- **Money math that can't drift.** Wallet balances are updated inside the same DB transaction as the transaction row that caused the change — a crash or concurrent edit can't leave a balance and its history out of sync. One signed-delta formula (`expense` subtracts, `income` adds, sign flipped for debt wallets) covers all four wallet types and all three transaction kinds, including "pay off a card" and "fund savings," which are both just transfers.
- **Comparison mode as a reusable pattern, not a one-off.** The same "pick a base month, pick a compare month, swap them" interaction and URL-param shape powers budget comparison *and* category-comparison on the Transactions page — one mental model, two features.
- **Zero charting-library dependency.** The trend chart and category breakdown are hand-built inline SVG, paired with a fixed categorical color palette assigned by category position (not generated), so a category is always the same color and the palette is checked for colorblind-safe contrast.
- **Filters live in the URL**, not component state — search, type, category, wallet, date range, sort, and comparison months are all query params, so every view is shareable and survives the back button.
- **Accessibility taken seriously for a solo project.** The custom `Dropdown` used everywhere implements real combobox/listbox ARIA semantics and keyboard/typeahead support instead of reaching for the native `<select>` and fighting its styling limits.
- **One `proxy.ts`, two jobs.** Locale detection/redirect (next-intl) and the auth guard run in the same request pipeline instead of two competing middlewares — a request is locale-resolved first, then checked against the session cookie using the locale-stripped path, so `/bn/wallets` and `/en/wallets` share one auth rule instead of two.
- **Formatting depth over string-swapping.** Bangla localization goes further than translated labels: currency, dates, and ICU plural/number interpolation all resolve through `Intl` for the active locale, and a naive month-name truncation for chart labels (`"Sep"` from slicing) was caught and replaced because slicing Bangla script mid-conjunct produces broken-looking text — the kind of bug that's invisible if you only ever test in English.

## Tech stack

| | |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Turbopack) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Icons | [lucide-react](https://lucide.dev) |
| Database | PostgreSQL via [Prisma](https://www.prisma.io) ORM |
| Auth | Custom cookie session — HMAC-signed (`node:crypto`), password hashing via `scrypt` — no third-party auth library |
| i18n | [next-intl](https://next-intl.dev) — locale-prefixed routing, ICU messages, `Intl`-backed number/date formatting |

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database. This project is built and tested against [Neon](https://neon.tech)'s serverless Postgres, but any Postgres instance works.

### 1. Clone and install

```bash
git clone https://github.com/Shazzadul-Shakib/extrack.git
cd extrack
npm install
```

`npm install` also runs `prisma generate` automatically (via `postinstall`), so the Prisma Client is ready right after.

### 2. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. If you're on Neon, use the **pooled** connection string (the one with `-pooler` in the hostname) — it's built for many short-lived serverless connections. |
| `SESSION_SECRET` | Yes | Signs session cookies. Generate one with `openssl rand -hex 32`. There's no fallback — the app won't sign a session without it. |

### 3. Set up the database

Push the Prisma schema to your database:

```bash
npm run db:push
```

(This project manages its schema with `prisma db push` rather than versioned migrations — there's no `prisma/migrations` folder. Use `npm run db:migrate` instead if you'd rather switch to a migration-based workflow.)

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/en/login` (or `/bn/login` based on your browser's language). Use "Create an account" to sign up (a new account starts with four default wallets: Cash, Main Bank, Savings, Credit Card, all in BDT), or click **"Try demo account"** to explore with existing data. Switch languages any time from the toggle in the header — no extra setup or environment variables needed.

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma Client |
| `npm run db:push` | Push `schema.prisma` to the database (no migration history) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio (a GUI for your database) |

## Project structure

```
src/
  app/
    [locale]/              # everything below is locale-prefixed: /en/..., /bn/...
      (auth)/               # /login, /signup — unauthenticated layout
      (app)/                # /dashboard, /wallets, /transactions, /budgets, /savings, /debts
      layout.tsx            # root <html lang>, NextIntlClientProvider, per-locale metadata
    actions/                # Server Actions (auth.ts, wallets.ts, transactions.ts, budgets.ts) — all writes go through these
    robots.ts, sitemap.ts   # locale-aware robots.txt / sitemap.xml (hreflang alternates per page)
    icon.tsx, apple-icon.tsx # favicon generated from the brand mark via next/og's ImageResponse
  i18n/
    routing.ts              # locales (en, bn), default locale, prefix mode
    navigation.ts           # locale-aware Link/redirect/useRouter/usePathname (wraps next/navigation)
    request.ts              # resolves the active locale + loads its message file per request
  components/
    ui.tsx                  # Button, Input, Select, Field, Card, Badge, EmptyState — the shared component kit
    Dropdown.tsx             # Custom accessible dropdown (used as `Select` everywhere)
    LanguageSwitcher.tsx     # Compact EN/বাং sliding toggle, in the app header
    dashboard/               # Stat cards (incl. toggleable), charts, month/trend-range pickers
    transactions/            # Transaction form, table, filters, month-comparison table
    budgets/                 # Budget form/table, progress chart, month-comparison table + toggle
    wallets/                 # Wallet cards, forms
    shell/                   # Sidebar / app shell
  lib/
    db.ts                    # Prisma client singleton + retry logic for transient connection errors
    session.ts               # Cookie session read/write, requireUser()/getCurrentUser()
    crypto.ts                # Password hashing (scrypt) + session token signing (HMAC)
    users.ts, queries.ts, mutations.ts   # Data access layer (incl. paginated transaction queries)
    finance.ts               # Wallet balance math, net worth, monthly aggregation, budget & category comparisons
    format.ts                # Locale-aware currency/date/number formatting (Intl-backed, not string-swapping)
    transactionFilters.ts    # URL search-param parsing + filtering/sorting
    categories.ts            # Fixed category lists (canonical English) + chart color slot assignment
  proxy.ts                  # Next.js 16's renamed `middleware.ts` — resolves the locale (next-intl) first,
                            # then guards the route using the locale-stripped path against the session cookie
messages/
  en.json, bn.json           # UI strings by namespace, ICU message format (plurals, rich text)
prisma/
  schema.prisma              # User, Wallet, Transaction, Budget models
```

## How it works

```mermaid
flowchart LR
    subgraph Browser
        UI[React Server Components<br/>+ client islands]
    end
    UI -- "reads (RSC)" --> Q[lib/queries.ts]
    UI -- "writes via &lt;form action&gt;" --> SA[Server Actions<br/>src/app/actions/*]
    SA --> M[lib/mutations.ts]
    Q --> DB[(PostgreSQL<br/>via Prisma)]
    M --> DB
    SA -- "revalidatePath" --> UI
    P[proxy.ts] -. "resolves locale, then guards<br/>via session cookie" .-> UI
    I[i18n/request.ts] -. "loads messages/&lt;locale&gt;.json" .-> UI
```

**Rendering**: pages are React Server Components that fetch data directly via Prisma (`lib/queries.ts`) — no client-side data-fetching library. All writes (create/update/delete wallet, transaction, or budget; auth) go through Server Actions in `src/app/actions/`, called directly from `<form action={...}>` and revalidating the affected routes on success.

**Auth**: there's no auth library. Signing up hashes the password with `scrypt` and a random salt (`lib/crypto.ts`); logging in issues an HMAC-signed, `httpOnly` cookie (`lib/session.ts`) containing the user id and an expiry. `src/proxy.ts` checks that cookie on every request and redirects accordingly. `getCurrentUser()` is wrapped in React's `cache()` so it only reads the cookie/DB once per request even if called from multiple components.

**Localization**: every route lives under `app/[locale]/`, so `requireUser()`'s redirects and every internal `<Link>` go through the locale-aware helpers in `i18n/navigation.ts` rather than plain `next/navigation` — otherwise a redirect from a Bangla page would silently drop the user back into English. `proxy.ts` resolves the locale for a request first (next-intl), then runs the auth check against the locale-stripped path, so both languages share one set of protected-route rules. UI strings live in `messages/en.json` / `messages/bn.json` as ICU messages (plurals, rich text for bold spans inside a sentence); `lib/format.ts` wraps `Intl` for currency, dates, and plain numbers so Bangla gets its own digits, month names, and large-number units (লাখ/কোটি) rather than a translated label glued onto English-formatted numbers. Category and wallet-type values stay canonical English in the database — translation happens only at the display layer, via a lookup keyed by that canonical value.

**Database**: `lib/db.ts` builds one Prisma Client, cached on `globalThis` so Next's dev-mode hot reload doesn't leak a new connection pool on every save, with automatic retry on transient connection errors (useful with Neon's serverless Postgres, which can cold-start). Money amounts are stored as `Decimal(14,2)` and converted to plain `number` at the data-access boundary.

**Comparisons**: Budgets and Transactions both support a "base month vs. compare month" view driven by the same `compare` / `cy` / `cm` URL params and the same swap interaction, backed by `compareBudgetProgress()` and `compareCategoryTotals()` in `lib/finance.ts`.

**Styling**: Tailwind v4 with the design system expressed as CSS custom properties in `globals.css` (colors, radius scale, shadows), so light/dark mode is a matter of swapping variable values rather than duplicating classes.

## Deploying

This app deploys cleanly to Vercel (or any Node.js host). Set `DATABASE_URL` and `SESSION_SECRET` in your platform's environment variables — both are required, there's no fallback for either. If you're deploying to a platform that runs multiple instances of your app (Vercel included), `SESSION_SECRET` **must** be the same fixed value across all of them, since it's what lets one instance verify a session token signed by another.

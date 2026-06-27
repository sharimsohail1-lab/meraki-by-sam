# CLAUDE.md — Engineering Guide for Meraki by Sam

Read this before touching any code. It encodes every decision that matters.

---

## What this is

A mobile-first single-file PWA business operating system for Sam — a Pakistani woman who sells traditional Pakistani clothing at NJ/NY exhibitions. Built by her son. One user. Not a SaaS product.

---

## Repository layout

```
index.html          — The entire app. All HTML, CSS, JS in one file (~3000+ lines).
api/
  claude.js         — Proxy to Anthropic API (server-side, injects key from env)
  ideogram.js       — Proxy to Ideogram v4 + GET handler for CORS image proxy
  db.js             — Unified Supabase CRUD proxy (action/table/id/data/filter)
  migrate.js        — Runs SQL migration files in order, tracks via migrations table
migrations/
  001_initial.sql   — Full schema: products, customers, exhibitions, exhibition_items
  002_marketing.sql — caption_en, caption_ur, hashtags, story_text, whatsapp_listing, price_card
  003_sharing.sql   — sharing_angle, catalog_blurb
MERAKI_PROJECT_BRIEF.md  — Full product brief, feature docs, honest gaps assessment
PRODUCT.md               — Workflow map and feature status
ARCHITECTURE.md          — Technical decisions and constraints
TASKS.md                 — Prioritized backlog
```

---

## Security rules — non-negotiable

- `ANTHROPIC_API_KEY`, `IDEOGRAM_API_KEY`, `SUPABASE_SERVICE_KEY`, `MIGRATION_SECRET` live ONLY in Vercel environment variables. Never in frontend code.
- `SUPABASE_SERVICE_KEY` is server-side only. The frontend never touches Supabase directly.
- All DB access goes through `/api/db.js`. All AI calls go through `/api/claude.js` and `/api/ideogram.js`.
- No authentication layer exists. The app URL must remain private. Do not add public-facing auth unless explicitly requested.

---

## Architecture constraints

**Frontend:**
- Single HTML file. No build tools. No npm on the frontend. No frameworks.
- Vanilla JS SPA. Bottom tab navigation. Bottom-sheet overlays for detail views.
- CDN: Google Fonts (Playfair Display, Inter) + Tabler Icons (jsDelivr)
- State: module-level variables (`inventory`, `customers`, `exhibitions`, `currentProduct`, etc.)
- DOM manipulation: direct (`innerHTML`, `textContent`, `classList`)

**Backend:**
- Vercel serverless functions (Node.js ES modules, `export default`)
- All functions set CORS headers on all responses
- No authentication on any endpoint (intentional for single-user personal app)

**Database:**
- Supabase PostgreSQL. RLS disabled (intentional for single-user). Service key server-side only.
- Photos stored as base64 data URLs in `products.photo` and `products.model_photo` — known scaling problem, do not make it worse without migrating to Supabase Storage first.

**Deployment:**
- Vercel auto-deploys on push to `main` branch of `sharimsohail1-lab/meraki-by-sam`
- Network policy in this remote session blocks outbound calls to Vercel. Sam must test via her phone or Hoppscotch.

---

## JS patterns — follow these exactly

**Safe onclick with dynamic string data:**
Always use `window._arrayName[i]` pattern. Never use `JSON.stringify(str)` inside HTML `onclick` attributes — HTML-escaping breaks the call.

```js
window._collActions = [];
const idx = window._collActions.length;
window._collActions.push(name);
html += `<div onclick="openCollectionDetail(window._collActions[${idx}])">`;
```

**Database calls:**
```js
// insert
await db('insert', 'products', { data: { ...fields } });
// update
await db('update', 'products', { id: productId, data: { field: value } });
// select
await db('select', 'products', { filter: { status: 'available' } });
// delete
await db('delete', 'products', { id: productId });
```

**Claude calls:**
```js
const result = await callClaude([{ role: 'user', content: '...' }], '', maxTokens);
```

**Toast:**
```js
showToast('Message');
```

**Sheets:**
```js
openSheet('sheetId');
closeSheet('sheetId');
```

---

## Collection name handling

`products.collection_name` is a comma-separated TEXT column. A product can be in multiple collections: `"Eid 2026, Summer Shadi"`.

Always split/join when reading/writing:
```js
// Read
const names = (p.collection_name || '').split(',').map(s => s.trim()).filter(Boolean);
// Write
collection_name = selected.join(', ') || null;
```

---

## Marketing package fields (all on products table)

`caption_en`, `caption_ur`, `story_text`, `hashtags`, `whatsapp_listing`, `price_card`, `sharing_angle`, `catalog_blurb`

Generated once by Claude → saved to product → never regenerate unless Sam explicitly chooses to.

---

## Key state variables

```js
let inventory, customers, exhibitions;
let uploadedPhotos = {}, extraSlots = [];
let garmentType = 'full-suit', intakeSeason = 'eid';
let currentProduct = null, currentAnalysis = null;
let currentCollection = null;
let catalogCollection = null, catalogSelected = new Set(), catalogItems = [];
let costCurrency = 'usd', usdPkrRate = null;
let stockFilter = 'all', stockView = 'items';
```

---

## What NOT to do

- Do not perform massive rewrites. One logical improvement at a time.
- Do not add features that require Sam to maintain data manually.
- Do not break existing workflows when adding new ones.
- Do not add error handling for scenarios that can't happen.
- Do not add comments explaining what the code does — only add them when the WHY is non-obvious.
- Do not create new files unless absolutely necessary. Prefer editing `index.html`.
- Do not push to branches other than `claude/meraki-setup-deploy-2lja1a` during active development sessions, or `main` for stable releases.

---

## Decision filter

Before implementing anything, answer:
1. Does this reduce Sam's workload?
2. Does this reduce thinking or typing?
3. Does this connect naturally with an existing workflow?

If no → redesign or skip.

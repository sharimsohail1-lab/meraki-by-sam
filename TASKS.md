# TASKS.md — Meraki by Sam

Prioritized backlog. Update this file as work is completed or reprioritized.

Format:
- `[ ]` — not started
- `[~]` — in progress
- `[x]` — done

---

## Critical (breaks core value at scale)

- [ ] **Migrate photos from base64 to Supabase Storage**
  - New `product-photos` bucket in Supabase
  - Upload file from intake wizard → store URL instead of base64
  - Display: swap `<img src="base64...">` for `<img src="https://...supabase.co/...">`
  - Existing data: leave as-is (base64 still works, just slow)
  - Files: `index.html` (intake photo upload), `api/db.js` (possibly), new `api/upload.js`

- [ ] **Offline support for exhibitions**
  - Service worker caches the app shell and current inventory on startup
  - Exhibition module uses cached data when offline
  - Queues status changes (sold/reserved) in IndexedDB
  - Syncs when connection returns
  - This is significant work. Consider as a dedicated sprint.

---

## High Priority (significant UX improvement)

- [ ] **Stock screen search**
  - Text input above the grid filters by name, color, occasion, collection, SKU
  - Client-side filter on in-memory `inventory` array
  - Clear button on input
  - `index.html` only

- [ ] **Save model_photo to Supabase**
  - After generating AI model photo in intake or detail sheet, save the data URL to `products.model_photo`
  - Show saved model photo in product detail sheet alongside primary photo
  - `index.html`: `saveProduct()` and `generateDetailModelPhoto()`

- [ ] **Replace vestigial settings modal**
  - Remove the "Anthropic API Key" field (does nothing)
  - Replace with useful settings: language preference, cost currency default, notification preferences
  - Or remove the settings tab entirely and put language toggle in the header permanently

- [ ] **Action plan: make it intelligent**
  - Replace rule-based action plan with a short Claude call at app startup
  - Context: inventory stats, upcoming exhibitions, customer list, current month/season
  - Output: 3–5 genuinely personalized, actionable bullets
  - Cache result for 24h in localStorage to avoid daily API cost

- [ ] **Link "Reserved For" to customers table**
  - In product detail sheet, "Reserved For" shows autocomplete from `customers.name`
  - Selecting a customer links `products.customer_id` to that customer
  - Display customer name as chip, tappable to open customer detail

---

## Medium Priority (fills gaps in workflow)

- [ ] **Purchase history on customer records**
  - When marking a product "Sold," prompt: "Who bought this?" (optional, dismissable)
  - Creates a `purchases` junction: `{ customer_id, product_id, sold_at, price }`
  - Customer detail sheet shows purchase history
  - Requires new migration: `004_purchases.sql`

- [ ] **Urdu AI content generation**
  - In the Claude call for marketing package, add: generate `description_ur` and `caption_ur` in authentic Pakistani Urdu (not formal/academic Urdu)
  - Also generate WhatsApp messages in Urdu when customer's `language` field is 'ur'
  - Add Noto Nastaliq Urdu font from Google Fonts for correct rendering

- [ ] **Draft auto-save in intake wizard**
  - Save step 1 form state + uploaded photo dataURLs to `localStorage` on each change
  - On app open, if draft exists, offer "Continue where you left off?"
  - Clear draft on successful save or explicit discard

- [ ] **Batch exhibition item insert**
  - Replace one-at-a-time loop in `addItemsToExhibition()` with a single `db('insert', ...)` call
  - Reduce failure surface and network round-trips

- [ ] **Payment tracking**
  - Add `payment_method` field (cash/venmo/zelle/other) and `payment_received` boolean to products
  - Show in exhibition revenue summary
  - Requires migration: `005_payments.sql`

- [ ] **"Copy last exhibition" shortcut**
  - When creating a new exhibition, offer "Copy items from [last exhibition name]"
  - Pre-selects the same item set in the picker

- [ ] **manifest.json**
  - Add `manifest.json` with app name, icons, theme color, display: standalone
  - Link from `index.html` `<head>`
  - Enables proper PWA install on Android

---

## Low Priority / Polish

- [ ] **Stock screen sort controls**
  - Sort by: newest, oldest, price (high/low), status
  - Toggle button above grid

- [ ] **Soft delete / archive**
  - Add `archived` boolean to products
  - "Remove from Inventory" → "Archive" (sets archived=true)
  - Archived items hidden from stock screen by default, accessible via filter

- [ ] **Re-analyze existing product**
  - In product detail sheet, allow uploading new photos and re-running Claude analysis
  - Updates description, colors, occasion, ideogram_prompt

- [ ] **Better Ideogram prompt visibility**
  - Show the Ideogram prompt (simplified/readable) before generating model photo
  - Allow Sam to tap to regenerate if she knows it's wrong

- [ ] **SKU collision fix**
  - Query max existing sequence for the type+season combo before generating new SKU
  - Replace `inventory.length + 1` with a DB-backed counter

- [ ] **Cost/margin display**
  - In product detail sheet, show: Cost / Price / Margin (if both set)
  - In home dashboard, show total margin on sold items this season

- [ ] **Packing list export for exhibitions**
  - "Print packing list" button on exhibition detail
  - Shows all assigned items with SKU, name, photo thumbnail
  - Uses `@media print` like the catalog

---

## Completed

- [x] Intake wizard: Camera + Gallery buttons per photo slot
- [x] PKR cost input with live exchange rate → USD conversion
- [x] AI model photo saves as primary stock photo (priority over flat photo)
- [x] Collections in stock: toggle view (items ↔ collections)
- [x] Collection detail sheet (list of pieces + marketing package)
- [x] Magazine-style collection catalog: selection → preview → print
- [x] Marketing package: 8 fields, one Claude call, saved to DB
- [x] Editable marketing fields (pencil → textarea → save)
- [x] AI collection name suggestions with Pakistani cultural calendar context
- [x] Seed-based collection name suggestions (builds on what Sam typed)
- [x] Existing collection chips in intake (multi-select, toggle)
- [x] Collection name field in product detail sheet (editable, comma-separated)
- [x] Collection rename from stock screen
- [x] Back buttons throughout
- [x] Next-steps nudge after saving product
- [x] Home dashboard nudges and action plan

---

## Documentation

- [x] CLAUDE.md — Engineering guide
- [x] PRODUCT.md — Workflow map and feature status
- [x] ARCHITECTURE.md — Technical decisions
- [x] TASKS.md — This file
- [x] MERAKI_PROJECT_BRIEF.md — Full product and user brief

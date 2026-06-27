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

### Add Flow Redesign — 2026-06-27

The Add New Piece flow was intentionally restructured. Do not revert these decisions.

**Step layout:**
- **Step 1:** Season/Occasion + Collection picker only. No price, no cost, no sizes.
- **Step 2:** Photo slots (structural + detail). Garment type selector. Unchanged.
- **Step 3:** AI analysis → item name → model generation → Price → Cost → Sizes Available → Save.

**Collection picker (Step 1):**
- Tappable field opens a bottom sheet (`collectionPickerSheet`)
- Sheet sections: Existing collections (from inventory), AI Suggested Names (✨ button, same Claude call), Create New (text input + Use)
- `collectionNameInput` is a hidden field; all JS reads `.value` as before
- Selected name shown in `collectionPickerLabel` span
- Multi-select supported (comma-separated, same as before)

**Price / Cost (moved to Step 3):**
- IDs unchanged: `priceInput`, `costInput`, `costUsdBtn`, `costPkrBtn`, `costConversionNote`
- Currency toggle and PKR→USD conversion work identically
- Translation IDs `t-priceLabel` / `t-costLabel` still in `applyTranslations()` map

**Size inventory (moved to Step 3):**
- `intakeSizeGrid` and `intakeSizeTotalNote` are in Step 3, inside `analysisResult` div
- `initIntakeSizeSteppers()` fires when `goToStep(3)` is called, guarded by `!window._sizeStates['intakeSizeGrid']`
- Size state persists if Sam goes Back to Step 2 and returns to Step 3
- `resetIntake()` clears state; next add re-inits with M:1 default
- Editable in Stock via Product Detail sheet (unchanged)

**Navigation guards:**
- `goHomeFromAdd()` prompts before leaving if photos, collection, item name, or price are set
- `← Home` button in header hidden on Home screen, visible on all other screens

**Known manual tests (see also INVENTORY_TESTS.md):**
1. Step 1 shows only Season + Collection. No sizes, price, cost.
2. Collection picker opens sheet; existing collections appear; tap selects and highlights.
3. AI suggest generates names; tapping one closes sheet and sets field.
4. Typing in Create New + Use sets field and closes sheet.
5. Clear button empties collection and closes sheet.
6. Step 3 shows price, cost, sizes after analysis completes.
7. Back (Step 3→2→3) does not reset price/cost/sizes.
8. Save stores season, collection, price, cost, size_inventory, analysis, photos.
9. Stock card shows size summary for new product.
10. Urdu mode: all labels translate; collection picker Urdu not yet added to T map (labels are in English only — acceptable for now).

**Remaining risks / future work:**
- Urdu labels inside collection picker sheet are hardcoded English. Add to T map if Urdu support is needed there.
- Draft auto-save (localStorage) would prevent data loss if Sam leaves mid-flow without confirming — still in backlog.
- `collPickerNewInput` is not cleared when sheet is closed via Done without using the value — minor, not a bug.

---

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
- [x] Existing collection chips in intake → replaced by collection picker bottom sheet
- [x] Collection name field in product detail sheet (editable, comma-separated)
- [x] Collection rename from stock screen
- [x] Back buttons throughout
- [x] Next-steps nudge after saving product
- [x] Home dashboard nudges and action plan
- [x] Size-based inventory (size_inventory JSONB, steppers, sold-by-size picker, status sync)
- [x] INVENTORY_TESTS.md — manual test checklist for size inventory
- [x] Logo: replaced 440 KB base64 LOGO_B64 with static PNG at /assets/meraki-logo.png
- [x] ← Home button in header (hidden on Home, visible on all other screens)
- [x] Add flow restructured: Step 1 = context only, Step 3 = final record (see section above)
- [x] Collection picker bottom sheet with existing/suggested/new sections
- [x] db.js: null-strip on insert/update to tolerate unrun migrations gracefully
- [x] Migration 008: detail_photos JSONB column
- [x] Migration 009: size_inventory JSONB column

---

## Documentation

- [x] CLAUDE.md — Engineering guide
- [x] PRODUCT.md — Workflow map and feature status
- [x] ARCHITECTURE.md — Technical decisions
- [x] TASKS.md — This file
- [x] MERAKI_PROJECT_BRIEF.md — Full product and user brief

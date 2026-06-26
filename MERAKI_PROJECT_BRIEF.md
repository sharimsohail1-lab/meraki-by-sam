# Meraki by Sam — Project Brief

> This document is written for an outside reader who has never seen this repository. It is a comprehensive, honest account of what this project is, who it is for, what has been built, and what still needs to be done.

---

## 1. Purpose

### Why this app exists

Meraki by Sam is a mobile-first progressive web app built for one specific person: Sam, a Pakistani woman who runs a small traditional clothing business in New Jersey. Her son is building this app for her. It is not a commercial product. It will never have multiple users. It will never be sold. The goal is entirely personal — to take a business that currently runs on WhatsApp messages, mental inventory, and physical memory, and give it a lightweight digital backbone that Sam can actually use.

The name "Meraki" is a Greek and Urdu-adjacent concept meaning "to do something with soul, creativity, and love." That framing is intentional. This app is not trying to turn Sam's business into a startup. It is trying to make her existing work less exhausting and more effective while preserving the warmth and personal touch that defines how she sells.

### Who Sam is

Sam is a first-generation Pakistani immigrant woman, likely in her 40s or 50s, who sources traditional Pakistani garments — primarily lawn suits, formal wear, bridal pieces, and occasion wear — from Pakistan and sells them to the South Asian diaspora community in New Jersey and New York. She attends periodic community exhibitions and melas (fairs), particularly around Eid, wedding season, and cultural events. She likely sells through her own social circle, WhatsApp, word of mouth, and at these exhibitions.

Her business is personal in the deepest sense. Her customers are friends, relatives, and community members. A sale is also a relationship. She remembers what her customers like, what size they wear, and what events they are dressing for. The business exists at the intersection of community, culture, fashion, and personal service. That context is essential to understanding every product decision in this app.

### How she currently runs her business

Sam currently operates with no software. Her workflow is:

1. She receives garments (shipped from Pakistan or brought by travelers).
2. She photographs them on a flat surface or hanging.
3. She shares photos in WhatsApp groups or individually to customers she thinks will like a piece.
4. Customers respond, ask prices, ask for more photos, or express interest.
5. Sam holds pieces mentally or physically for interested customers.
6. She packs up inventory and travels to exhibition venues where she sets up a stall.
7. At exhibitions, she manages sales verbally and through cash/Venmo.
8. After an exhibition, she mentally reconciles what sold and what came back.
9. She follows up with customers individually over WhatsApp.
10. Repeat customers come back each season.

Everything is in her head. Prices may or may not be set before a customer asks. There is no system for knowing which pieces are available, reserved, or sold at any given moment. There is no record of customer preferences. There is no consistent marketing content.

### Pain points

**Inventory chaos.** Sam does not always know what she has. After an exhibition, reconciling what sold, what came back, and what is still held for someone is a mental exercise that takes time and creates errors.

**WhatsApp overload.** Sending inventory photos to customers is manual. She takes a photo, goes to WhatsApp, selects contacts, sends. There is no way to broadcast a structured catalog. Messages lack professional presentation.

**No pricing system.** Prices are not always set at the time of receiving. Sometimes she decides on price when a customer asks. This creates inconsistency and missed sales.

**Marketing gap.** She has no ready-made Instagram captions. Creating content in two languages (English and Urdu) is time-consuming. The garments are beautiful but the presentation is amateur.

**Customer memory.** She remembers preferences informally. If a customer tells her "I need something green for my daughter's mehndi in April," that information lives only in Sam's head or in a WhatsApp message she may not find again.

**Exhibition preparation.** Packing for an exhibition involves manually deciding what to bring. There is no list, no tracking system, no way to quickly report what sold at the end of the day.

**No professional model photos.** The garments look significantly better on a model than flat-laid. Professional photography is expensive and logistically difficult. AI-generated model photos could close this gap.

### What success looks like

Success is not growth metrics. Success is Sam opening the app every morning, seeing a clear picture of her inventory, knowing what needs attention, sending a WhatsApp catalog in three taps, arriving at an exhibition with a printed or phone-based list of what she brought, and walking away from it having marked what sold in real time. Success is her customers saying "oh, did you make a website?" Success is Sam not losing a sale because she forgot she had something, or forgot a customer's preferences, or couldn't find the right photo.

---

## 2. User

### Technical ability

Sam is not technically inclined. She uses a smartphone (likely Android or iPhone) primarily for WhatsApp, voice calls, and photos. She may use YouTube. She almost certainly does not use apps that require accounts, passwords, complex navigation, or English-only interfaces. She is comfortable tapping and scrolling. She is not comfortable with forms, dropdowns, or anything that requires reading instructions. If something requires more than three taps to accomplish a common task, she will stop using it.

This is not a criticism. It is a design constraint that shapes every decision in the app. Large buttons, minimal text, familiar workflows (WhatsApp-style messages, photo-first interaction), and forgiveness for errors are all requirements, not nice-to-haves.

### Preferred language

Urdu is Sam's primary language. English is her second language. She can read and write in both, but she thinks, describes garments, and communicates with customers in Urdu. Any content she creates for her Pakistani-speaking customers will be in Urdu. Any app text she has to read quickly will be understood better in Urdu. The app currently supports bilingual toggling (EN/UR) throughout the interface.

### Business workflow

Sam's workflow is seasonal and event-driven. Her busiest periods are around Eid (spring and fall), wedding season (typically May–October), and cultural exhibitions. Between events, she receives new stock, manages inquiries, and maintains relationships. The flow is:

- **Receive** → photograph → add to mental inventory
- **Exhibition prep** → pack, travel, set up, sell, track
- **Follow-up** → WhatsApp existing customers with new stock
- **Social media** → occasional Instagram posts, mostly informal

### Marketing experience

Limited and informal. Sam likely posts on Instagram occasionally, sharing photos she took herself. She does not have a content strategy, does not use scheduled posts, and does not use professional photography or AI tools. Her marketing is entirely relationship-based — word of mouth, personal recommendations, and direct WhatsApp outreach. She may have never written a structured Instagram caption. She has never used a hashtag strategy deliberately.

### Customer interactions

Sam's customer relationships are personal and long-term. She knows her customers. They trust her taste. When a customer says "find me something for Eid," Sam can mentally match the request to a piece she has. The app should augment this instinct, not replace it. The customer CRM in the app is designed to capture what Sam already knows but cannot currently retrieve systematically.

### Inventory process

Currently: mental. Garments are physically stored (likely in bags or boxes). Sam knows roughly what she has but cannot give an accurate count without going through her stock physically. She does not consistently track cost vs. sale price, so her profitability is estimated, not measured.

### Exhibition workflow

Sam packs whatever she thinks will sell, travels to the venue, sets up, and sells. At the end of the day, she packs up what did not sell. She may have a rough mental note of what sold, but she does not systematically reconcile it against what she brought. Revenue for the day is whatever cash/Venmo she received.

### Social media habits

Instagram presence exists but is informal. She likely uses it to post photos of pieces she thinks are particularly beautiful. She does not use it as a storefront. She does not use link-in-bio tools, product tags, or Stories consistently. WhatsApp is her primary sales channel.

---

## 3. Current Features

### 3.1 Home Dashboard

**What it does:** Displays a greeting with Sam's name and the date, a three-number stat row (available / reserved / sold count), a dynamically generated "Today's Actions" list, four quick-action buttons, and a horizontal scroll of items that need attention (specifically items without a price set).

**Why it exists:** Sam needs to open the app and immediately understand the state of her business in under five seconds. She should not have to navigate anywhere to get a basic snapshot.

**Current implementation:** The greeting is time-aware (good morning / afternoon / evening) and adapts to the selected language. Stats are calculated from the in-memory inventory array loaded at startup from Supabase. The action plan is generated procedurally — it checks for items missing prices, upcoming exhibitions, and available items that haven't been promoted, and constructs a short bulleted list. The "Needs Attention" scroll filters inventory for items with no price set and shows them as tappable thumbnails. The four quick buttons navigate to Add, WhatsApp Catalog, Exhibitions, and Customers.

**Limitations:**
- The action plan is rule-based, not AI-generated. It will always say roughly the same things in the same situations. It will not notice subtle opportunities like "you have 3 green pieces and a customer who likes green."
- There is no notification or push alert system. The action plan only updates when Sam opens the app.
- Stats do not include revenue, profit, or cost-based metrics.
- The attention scroll only flags items missing prices. It does not flag items that have been reserved for a long time without converting to a sale, or items that have been in inventory for more than 60 days.
- There is no "good morning" voice or audio element, which might make the app feel warmer to a user like Sam.

**Future improvements:** AI-generated action plan that cross-references customers, inventory, and upcoming exhibitions. Revenue and margin display. Age-based alerts for slow-moving inventory. Pushable notifications for upcoming exhibitions.

---

### 3.2 Add / Intake Wizard

**What it does:** A three-step wizard for adding a new garment to inventory. Step 1 collects season/occasion (Eid, Wedding, Summer, Winter, Casual, Formal), collection name, price, and cost. Step 2 presents garment-type-specific required and optional photo slots with labels. Step 3 sends the photos to Claude for AI analysis and generates a SKU, garment name, description, color list, occasion, category, and a surgical Ideogram prompt for later model photo generation.

**Why it exists:** Adding a garment is the most frequent action Sam takes. The wizard structure forces completeness — she cannot skip to analysis without uploading required photos. The garment-type-aware slots ensure Claude receives the right angles (e.g., for a full suit: front kameez, back, shalwar, dupatta, neckline detail, hemline border).

**Current implementation:**

- Five garment types supported: Full Suit, Kameez, Lehenga, Dupatta, Other. Each type has a defined set of required and optional slots with meaningful labels.
- Photo slots are rendered as 3:4 aspect-ratio cards. Tapping opens the device camera or file picker. A green checkmark appears when a slot is filled. Required slots show a red border until filled.
- Extra detail slots can be added via preset chips (Side View, Lining, Buttons, Mirror Work, Print Pattern, Full Look) or a custom text label.
- On "Analyze Garment," all uploaded photos are sent as base64 images to Claude (claude-sonnet-4-6) in a single call with a structured JSON prompt. Claude returns name, description, colors, occasion, category, and a surgical Ideogram prompt. The prompt instructs Claude to describe embroidery placement "to the inch" — zone by zone.
- SKU is auto-generated: format `MRK-{TYPE}-{SEASON}{YEAR}-{SEQ}` (e.g., `MRK-FS-EID26-001`).
- The analysis result is displayed with the SKU badge, editable name, and analysis text. Sam can edit the name before saving.
- Saving inserts a row into Supabase `products` table with all metadata plus the primary photo as a base64 data URL stored directly in the `photo` column.

**Limitations:**
- Photos are stored as base64 strings in Supabase. This is a significant architectural problem. Base64 images embedded in a text column will bloat the database rapidly. A full suit with 6 photos at ~200KB each means ~1.2MB of base64 data per product row. After 100 products, the `products` table is carrying 120MB of image data. This will slow queries, increase costs, and eventually hit Supabase row size limits.
- There is no offline capability. If Sam is photographing garments in a basement or at an exhibition venue with poor signal, she cannot add items.
- The Claude analysis is in English only. The `name` and `description_en` fields are English. There is a `description_ur` column in the database schema but it is never populated.
- The SKU sequence is based on `inventory.length + 1` from the in-memory array. If two products are added in separate sessions, SKUs could collide (both sessions see the same inventory length before either saves).
- There is no draft/auto-save. If Sam takes photos, navigates away, and returns, her work is lost.
- The Ideogram prompt generated by Claude cannot be previewed or edited by Sam before generating a model photo.
- No barcode or physical tag system connects the digital SKU back to the physical garment.

**Future improvements:** Use Supabase Storage (or Cloudinary) for photos instead of base64 in database columns. Add Urdu name/description generation in the same Claude call. Add draft persistence in localStorage. Allow Sam to edit or regenerate the Ideogram prompt before using it. Add a simple label-printing flow (print a SKU sticker for the physical garment).

---

### 3.3 AI Model Photo Generation

**What it does:** After garment analysis, Sam can tap "Generate AI Model Photo" to produce a photorealistic image of a Pakistani model wearing the garment, generated by Ideogram v4. The Meraki by Sam logo is watermarked onto the bottom-right corner via a Canvas API overlay. The photo can be downloaded.

**Why it exists:** Photos of garments on a flat surface or hanger do not sell as well as photos on a model. Professional model photography is expensive. AI generation makes marketing-quality photos achievable at near-zero marginal cost per garment.

**Current implementation:**
- The Ideogram v4 API is called via `/api/ideogram` (server-side proxy). The API requires `text_prompt` as a direct multipart form field, which is a v4-specific requirement that took multiple debugging cycles to resolve (previous v2/v3 format was `image_request.prompt`).
- The generated image URL is proxied back through the server (`/api/ideogram?url=...`) to bypass CORS restrictions on the Ideogram CDN, allowing the Canvas API to load and watermark the image.
- Watermarking draws the logo in the bottom-right corner at 22% of image width, 85% opacity.
- The watermarked result is stored as a JPEG data URL and displayed. Download saves it as `{SKU}-model.jpg`.

**Limitations:**
- Ideogram v4 uses credits. Each generation costs real money. There is no per-session usage counter or monthly spend alert.
- The prompt quality is entirely dependent on Claude's analysis quality, which depends on the photo quality Sam uploads. Blurry or badly lit photos produce inaccurate descriptions produce inaccurate prompts produce wrong model photos.
- The model is AI-generated and not always accurate to the actual garment. Fine embroidery, subtle color gradients, and mirror work are frequently wrong or simplified.
- There is no way to see the Ideogram prompt before generating. Sam cannot know why a photo came out wrong unless she understands prompt engineering, which she does not.
- The feedback/regenerate system exists (see §3.4) but it is still relatively technical — zone chips and problem types are better than typing, but they do not translate into reliable prompt corrections.
- The generated photo does not persist in Supabase. If Sam closes the app, the model photo is gone unless she downloaded it first. The `model_photo` column exists in the database schema but is never populated.
- No support for generating multiple variations in one tap.

**Future improvements:** Save model_photo to Supabase Storage. Show the Ideogram prompt in a simplified, readable form. Add "Try again" one-tap regeneration without going through the feedback panel. Add cost tracking and a spend alert.

---

### 3.4 Feedback / Regeneration Panel

**What it does:** After a model photo is generated, a "Fix this photo" toggle reveals a panel where Sam can identify what is wrong without typing. She selects zones (Neckline, Chest, Sleeves, Hemline, etc. — adapted per garment type), selects problem types (Wrong Color, Wrong Embroidery, Wrong Shape, Completely Wrong), picks a reference photo from the uploaded set to show the correct version, and can record a voice note in Urdu or English. Tapping "Regenerate with Corrections" appends all this feedback as a correction instruction to the original Ideogram prompt and generates a new photo.

**Why it exists:** Sam cannot type a correction like "the embroidery on the neckline should be gold, not silver, and the dupatta should be deeper red." The feedback panel replaces typing with tapping. Zero-text feedback is a core design principle of this app.

**Current implementation:**
- Zone chips are dynamically generated based on the current `garmentType` constant. Selecting a zone reveals the problem type grid.
- Voice recognition uses the Web Speech API with `lang='ur-PK'` for Urdu. The transcript is appended to the correction prompt.
- The corrected prompt is constructed by appending "CORRECTION NEEDED: The [zones] area is [problems]. Reference photo [n] shows the correct version. [voice transcript]."
- This is a prompt-append strategy, not a structured correction system.

**Limitations:**
- The Web Speech API is not consistently supported across all mobile browsers, particularly on Android WebViews and some versions of Chrome Mobile. It works well on iOS Safari.
- The correction strategy (appending a sentence to the prompt) is crude. Ideogram does not accept corrections the way a conversational AI does. The "correction" is just additional context. It may or may not improve the output.
- There is no way to mark a correction as successful and save the corrected prompt as the canonical Ideogram prompt for future regenerations.
- The problem grid only has four types. Many real problems (wrong background, model looks wrong, garment proportions off, too many people) are not covered.
- There is no visual diff between the old and new generation.

**Future improvements:** Allow comparing before/after. Save the corrected prompt back to the product if Sam approves the result. Add more problem categories. Consider integrating Ideogram's in-painting (edit) API for targeted corrections rather than full regeneration.

---

### 3.5 Stock Screen

**What it does:** Displays all inventory in a 2-column grid with thumbnail photo, SKU overlay, name, price, and status pill. Filter tabs allow filtering by All, Available, Reserved, Sold, and Needs Price. Tapping a product opens a detail sheet.

**Why it exists:** Sam needs to see her full inventory at a glance and find specific items quickly.

**Current implementation:**
- Items load from Supabase at app startup and are filtered in-memory.
- The "Needs Price" filter shows all items with no price set, supporting the home screen "Needs Attention" flow.
- Products are ordered by `created_at` descending (newest first) from the DB query.
- Stock count is displayed next to the section title.

**Limitations:**
- No search. If Sam has 50+ items, there is no way to find "the green silk suit with gold embroidery" without scrolling.
- No sort options (by price, by date, by status change).
- No batch actions (mark multiple items as sold, bulk price update).
- No photo gallery view for a product (only the primary front photo shows).
- Items with base64 photos will cause the stock grid to be heavy to render at scale.

**Future improvements:** Full-text search by name, color, or occasion. Sort controls. Multi-photo gallery in the detail sheet. Batch status update.

---

### 3.6 Product Detail Sheet

**What it does:** A bottom sheet that opens on product tap. Shows the primary photo, SKU, name, metadata chips (garment type, season, category, colors), description, status buttons (Available / Reserved / Sold), a "Reserved For" field, content generation buttons (WhatsApp card, Instagram caption, AI model photo), a price/notes edit section, and a delete button.

**Why it exists:** Product management happens here. This is where Sam updates status after a sale, generates marketing content, and corrects pricing.

**Current implementation:**
- Status updates write directly to Supabase via the db proxy and update the in-memory inventory array.
- WhatsApp card generation calls Claude with the product metadata and produces a ready-to-copy conversational listing message.
- Instagram caption generation calls Claude and produces two captions (a long poetic version and a short punchy version) plus hashtags, displayed as selectable cards. A refine panel offers preset chips (Shorter, More Poetic, Add CTA, Formal) or a free-text instruction for further refinement.
- The detail model photo generation uses the stored `ideogram_prompt` field from the saved product.

**Limitations:**
- The `ideogram_prompt` field is only populated if the product was analyzed in the current app version. Products added before the Ideogram prompt feature existed will show an error.
- There is no way to re-run analysis on an existing product (e.g., if Sam wants to update the description or regenerate the prompt with new photos).
- WhatsApp card and caption generation cost Claude API credits on every tap. There is no caching.
- The "Reserved For" field is a free text input. It is not linked to the customers table. Reserving for "Aunty Nadia" does not create a connection to her customer record.
- No history log. If Sam marks an item reserved, then sold, there is no record of when those transitions happened beyond the `sold_at` timestamp.
- Delete is permanent. There is no archive or soft-delete.

**Future improvements:** Link "Reserved For" to customer records with autocomplete. Cache generated content. Re-analyze button with new photos. Soft delete / archive status. Full edit of all product fields.

---

### 3.7 WhatsApp Catalog

**What it does:** Generates a full catalog of all available items as a single WhatsApp-ready text message, with a "Copy" button and a direct "Open WhatsApp" deep link. Shows up to 15 available items.

**Why it exists:** Sam's primary sales channel is WhatsApp. Being able to broadcast a structured catalog to a group or a customer in two taps replaces a manual, inconsistent process.

**Current implementation:**
- Triggered from the home screen quick buttons.
- Calls Claude with a listing of available items (name, SKU, price, colors, occasion).
- Claude produces a formatted message with a warm header and CTA footer.
- The WhatsApp deep link uses `wa.me/?text=` with the encoded message, which opens WhatsApp on mobile with the message pre-filled.

**Limitations:**
- 15-item cap is arbitrary. If Sam has 30 available pieces, 15 are silently excluded.
- The catalog has no photos. WhatsApp text-only catalogs have lower engagement than photo-based ones.
- No ability to select which items to include. The catalog is always "all available."
- The generated message has no Urdu option.
- No way to save or reuse a catalog that was generated last week.

**Future improvements:** Select items to include. Urdu version. Per-item photo attachment guidance. WhatsApp Business API integration for broadcast lists (long-term).

---

### 3.8 Customer CRM

**What it does:** A customer list screen showing name, size, budget, and occasions. An "Add Customer" sheet collects name, phone, size (XS–XXL), max budget ($100–$500+), preferred colors, occasions (multi-select chips), and notes. A customer detail sheet shows preferences, allows Claude-powered item suggestions matching the customer's profile against available inventory, and generates a personalized WhatsApp message.

**Why it exists:** Sam's relationships are her business. Capturing customer preferences gives her the ability to proactively reach out when the right piece comes in, rather than relying on memory.

**Current implementation:**
- Customers are stored in Supabase `customers` table.
- Item suggestions call Claude with the customer profile and the full available inventory listing. Claude returns top 3 matches with reasoning.
- WhatsApp message generation produces a personalized outreach message referencing the customer's preferences and a few available pieces.

**Limitations:**
- No customer history. There is no record of what a customer has previously bought, looked at, or passed on.
- No purchase linkage. Marking a product as "sold" to a customer does not update the customer's record.
- No follow-up reminders. If a customer said "call me after Eid," there is no way to set a reminder.
- The phone field is free text with no WhatsApp integration. Tapping a phone number does not open WhatsApp to that contact.
- No import from WhatsApp contacts.
- Customer suggestions are generated fresh every time at API cost. There is no caching.

**Future improvements:** Purchase history linked to products. Tap-to-WhatsApp on phone numbers. Reminder/follow-up date field. Customer tags for quick filtering (e.g., "bridal," "regular," "high-budget").

---

### 3.9 Exhibition Module

**What it does:** Lists exhibitions with name, date, location, and status (upcoming / active / completed). Creating an exhibition opens a form for name, date, location. The detail sheet shows a summary of sold/reserved/revenue stats, a list of assigned items with per-item sold/reserved buttons, an item picker to select which inventory items to bring, and status update buttons (Mark Active, Mark Completed).

**Why it exists:** Exhibitions are Sam's primary point of sale. Having a structured list of what she brings, real-time sold marking, and an end-of-day summary is the difference between chaos and clarity.

**Current implementation:**
- Exhibitions stored in Supabase `exhibitions` table.
- Item assignment creates rows in `exhibition_items` junction table.
- Marking an item sold/reserved at an exhibition updates the `products` table directly (not exhibition-specific — the product's global status changes).
- Revenue is calculated by summing prices of sold items assigned to the exhibition.

**Limitations:**
- Status changes at an exhibition are global. If Sam marks a piece "sold" at an exhibition, it is marked sold everywhere. This is correct for the final sale but creates ambiguity if she marks it sold at the exhibition before receiving payment.
- The item picker shows all non-sold inventory. There is no "last exhibition" shortcut to rebring the same set.
- No offline mode. At most NJ exhibition venues, cell signal is often weak. The app cannot function without data.
- No packing list export. There is no printable or shareable summary of "what I need to pack for Edison Mela on June 15."
- The exhibition revenue figure only counts items with prices set. Items sold for "price on request" are excluded.
- Exhibition_items are inserted one at a time in a loop, which is inefficient and could partially fail.

**Future improvements:** Offline mode with sync (critical). Shareable packing list. "Copy last exhibition setup" shortcut. Batch insert for exhibition items. Exhibition-scoped status (separate from global product status).

---

### 3.10 Bilingual Interface (EN/UR)

**What it does:** A language toggle button in the header switches all UI labels between English and Urdu. The toggle persists via localStorage.

**Why it exists:** Sam is more comfortable in Urdu. At minimum, the app should not feel foreign to her.

**Current implementation:**
- A translation object `T` maps element IDs to English and Urdu strings for all nav labels, button text, section titles, and form labels.
- `applyTranslations()` iterates the map and updates textContent for each element.
- Body direction switches to RTL for Urdu.

**Limitations:**
- The Urdu translation covers UI chrome only. Generated content (garment analysis, WhatsApp messages, captions) is English only. A customer WhatsApp message generated in English is less useful to Sam than one in Urdu.
- RTL switching without a proper RTL CSS layout causes visual issues. Most components are designed LTR. Flipping `direction: rtl` on the body is a blunt instrument.
- The Urdu translations were written programmatically and have not been reviewed by a native Urdu speaker. Some translations may be technically correct but tonally wrong for Sam's register (formal vs. casual Urdu).
- Urdu text requires the Noto Nastaliq Urdu font for correct rendering. That font is referenced in CSS but is not loaded from Google Fonts — only Playfair Display and Inter are loaded.

**Future improvements:** Generate WhatsApp messages and captions in both languages. Proper Nastaliq font loading. Native Urdu speaker review of all translations. Proper RTL layout for each component rather than a global direction flip.

---

## 4. Architecture

### Frontend

A single HTML file (`index.html`) containing all HTML, CSS, and JavaScript. There are no build tools, no npm frontend dependencies, no frameworks. The app is a hand-written vanilla JavaScript SPA with a bottom navigation tab structure and bottom-sheet overlays for detail views.

This architecture was chosen deliberately. Sam's son is building this alone, probably as a side project. Having no build pipeline means no webpack config, no node_modules to manage, no deployment complexity beyond pushing to GitHub. The tradeoff is that the file grows large (currently ~1400 lines of HTML/CSS and ~700 lines of JavaScript, plus a ~440KB base64-encoded logo embedded directly in the file). The total file size is approximately 600KB+.

External dependencies loaded from CDN:
- Google Fonts: Playfair Display (serif, for headings) and Inter (sans-serif, for body text)
- Tabler Icons (icon font) from jsDelivr

No frontend state management library. State lives in module-level variables (`inventory`, `customers`, `exhibitions`, `currentProduct`, etc.). No reactive framework. DOM manipulation is direct (`innerHTML`, `textContent`, `classList`).

PWA configuration: `<meta name="apple-mobile-web-app-capable">` and `<meta name="theme-color">` are set, enabling add-to-home-screen on iOS. There is currently no `manifest.json` and no service worker, which means the app is not a true PWA — it cannot be installed from Android, cannot work offline, and does not appear as a standalone app on Android.

### Backend

Four Vercel serverless functions (Node.js ES modules):

| File | Purpose |
|------|---------|
| `api/claude.js` | Proxy to Anthropic Messages API. Forwards POST body, injects API key from env. |
| `api/ideogram.js` | Proxy to Ideogram v4 API. Constructs multipart/form-data manually. Also handles GET for image proxying (CORS workaround). |
| `api/db.js` | Unified CRUD proxy to Supabase. Accepts action/table/id/data/filter. Uses service role key server-side only. |
| `api/migrate.js` | Reads SQL files from `migrations/` folder, runs them against Supabase via `run_sql()` RPC, tracks completed migrations. Protected by `MIGRATION_SECRET` header. |

All functions use ES module syntax (`export default`). CORS headers are set on all responses. No authentication layer on any endpoint (this is intentional for a single-user personal app).

### Database

Supabase (hosted PostgreSQL). Project ID: `mtjfnfwvpqjxddgxlbgx`.

**Schema (from `migrations/001_initial.sql`):**

```
products
  id UUID PK
  sku TEXT UNIQUE
  name TEXT
  name_ur TEXT
  category TEXT
  garment_type TEXT
  season TEXT
  colors TEXT
  occasion TEXT
  buyer_type TEXT
  description_en TEXT
  description_ur TEXT
  price INTEGER
  cost INTEGER
  status TEXT (available/reserved/sold)
  reserved_for TEXT
  customer_id UUID
  photo TEXT  ← base64 data URL (problematic at scale)
  model_photo TEXT  ← base64 data URL (currently never populated)
  ideogram_prompt TEXT
  caption_en TEXT
  caption_ur TEXT
  hashtags TEXT
  collection_name TEXT
  exhibition_id UUID
  notes TEXT
  created_at TIMESTAMPTZ
  sold_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

customers
  id UUID PK
  name TEXT
  phone TEXT
  language TEXT
  size TEXT
  budget_max INTEGER
  preferred_colors TEXT
  preferred_occasions TEXT
  notes TEXT
  created_at TIMESTAMPTZ

exhibitions
  id UUID PK
  name TEXT
  date DATE
  location TEXT
  status TEXT (upcoming/active/completed)
  notes TEXT
  created_at TIMESTAMPTZ

exhibition_items
  id UUID PK
  exhibition_id UUID FK → exhibitions
  product_id UUID FK → products
  created_at TIMESTAMPTZ

migrations
  id SERIAL PK
  name TEXT UNIQUE
  run_at TIMESTAMPTZ
```

Row Level Security is disabled on all tables. This is appropriate for a single-user personal app with no public-facing database access (all access goes through the service role key on the server).

### AI

**Claude (Anthropic claude-sonnet-4-6)** via `/api/claude`. Used for:
- Garment analysis: multi-image vision call returning structured JSON
- WhatsApp card generation
- Instagram caption generation (with refinement)
- Customer item suggestions
- Customer WhatsApp message generation
- WhatsApp catalog generation
- Action plan generation (procedural, not AI — this is one of the few things that could benefit from being AI-driven)

All Claude calls use the `claude-sonnet-4-6` model hardcoded in the frontend `callClaude()` function. Max tokens varies by call (1024–1200). No streaming. No tool use. No conversation history — every call is a fresh context.

**Ideogram v4** via `/api/ideogram`. Used for:
- AI model photo generation
- Called with a surgical text prompt generated by Claude during garment analysis

### Image Generation

Ideogram v4 (`ideogram-v4`) at `https://api.ideogram.ai/v1/ideogram-v4/generate`. Aspect ratio `ASPECT_2_3` (portrait, appropriate for garment photography). The prompt is a detailed English-language description specifying fabric, colors, embroidery placement, silhouette, and photographic style.

Watermarking is done client-side via the Canvas API. The Meraki by Sam logo (extracted from a PDF, cropped to remove whitespace, converted to PNG, and base64-encoded at ~440KB) is embedded directly in the HTML file as a JavaScript constant and drawn onto the generated photo canvas.

### Hosting

Vercel. Deployment is triggered by pushing to the `main` branch of the GitHub repository `sharimsohail1-lab/meraki-by-sam`. No CI/CD pipeline beyond Vercel's automatic deployment. No staging environment.

Environment variables stored in Vercel project settings:
- `ANTHROPIC_API_KEY`
- `IDEOGRAM_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `MIGRATION_SECRET`

### Authentication

None. The app has no login screen. Anyone with the Vercel URL can access the app and make API calls. This is acceptable for a personal app where the URL is not publicly advertised. However, it means that if the URL were shared or discovered, anyone could read and modify Sam's inventory data.

There is a settings modal in the app that accepts an "Anthropic API Key" field, but this is vestigial from an earlier architecture where the API key was stored client-side. The backend proxy now handles API key injection from environment variables, and the settings modal does nothing useful.

### Storage

Photos are stored as base64 data URLs in the `photo` and `model_photo` columns of the `products` table. This is the primary architectural problem with the current implementation. There is no file storage system (no Supabase Storage buckets, no S3, no Cloudinary).

---

## 5. Business Workflow

### Receiving clothes

Sam receives garments either shipped from Pakistan or brought by community members/travelers. At this point in the current workflow, nothing is recorded. The garment goes into physical storage. In the app, the intended flow is: upon receipt, open the app → Add tab → photograph in the intake wizard.

**Gap:** There is no barcode, QR code, or physical tag system. The digital SKU (`MRK-FS-EID26-001`) exists only in the database. The physical garment has no corresponding label. Sam cannot scan a garment to find its record.

### Photography

The intake wizard guides Sam through garment-type-specific required photo slots. For a full suit: front kameez (required), back (required), shalwar/trouser (required), dupatta (optional), neckline detail (optional), hemline/border (optional). Additional slots can be added (side view, lining, buttons, mirror work, etc.).

**Gap:** The camera opens the device camera by default. Sam is photographing garments herself, likely in home lighting. Photo quality directly affects AI analysis quality and Ideogram prompt accuracy. There is no in-app guidance on how to photograph garments (lighting tips, background recommendations, how to lay out a dupatta).

### Inventory

After analysis, the garment is saved to Supabase with its SKU, name, description, colors, occasion, category, price (if set), and primary photo. It enters the stock screen with status "available."

**Gap:** If Sam doesn't set a price at intake time, the item goes into inventory as "no price" and appears on the home screen attention scroll. This is handled. What is not handled: cost tracking. The `cost` field exists but is never displayed or used in any calculation.

### Marketing

From any product in the stock screen, Sam can generate:
1. A WhatsApp listing message
2. An Instagram caption (long and short variants) with hashtags
3. An AI model photo

From the home screen, she can generate a full catalog of all available items.

**Gap:** The generated content is not saved back to the product. Every tap regenerates from scratch using API credits. If Sam generates a perfect caption today, and wants to use it tomorrow, she cannot find it in the app — she would need to have copied and saved it manually.

### WhatsApp

The WhatsApp card and catalog flows produce text that is copied to the clipboard. Sam then manually pastes into WhatsApp. The catalog sheet includes a "Open WhatsApp" deep link that pre-fills the message, but this only works in some environments and does not pre-select a recipient or group.

**Gap:** No WhatsApp Business API integration. No ability to save message templates. No per-customer send history.

### Instagram

Caption and hashtags are generated and displayed. Sam can copy them. There is no Instagram integration, no ability to post directly, no draft saving, no image export workflow that connects the model photo to the caption for a unified post package.

**Gap:** The entire Instagram workflow is manual after the AI generates content. Sam has to download the model photo, open Instagram, start a new post, upload the photo, paste the caption, paste the hashtags, and post. Five separate manual steps.

### Exhibitions

Sam creates an exhibition (name, date, location). She assigns inventory items to it using the item picker. At the exhibition, she opens the exhibition detail and taps "Sold" or "Reserve" on each item as transactions happen.

**Gap:** The exhibition module assumes reliable cell service. Most exhibitions in NJ/NY community spaces have unreliable signal. No offline mode means this module fails exactly when it's needed most.

### Customer follow-up

After an exhibition, Sam can view her customers, tap one, and generate a personalized WhatsApp message suggesting available items matching their preferences.

**Gap:** There is no reminder or follow-up queue. The app cannot tell Sam "you promised to follow up with Aunty Farrukh after Eid." The customer record has no time-based fields beyond `created_at`.

### Sales

Sales are marked through status updates (available → reserved → sold). Sold items show in the "Sold" filter tab. Revenue data is visible per exhibition.

**Gap:** No payment tracking. The app knows a piece is "sold" but not for how much (unless a price was set), not how payment was received (cash, Venmo, Zelle), and not whether payment was actually collected vs. just marked.

### Inventory updates

Status changes update Supabase immediately. The in-memory array is updated optimistically. The home stats refresh on each navigation to the home screen.

**Gap:** No `updated_at` trigger in the database. The `updated_at` column exists but is never set by the application. No webhook or real-time subscription for changes.

### Repeat customers

Customer records can accumulate purchase history — but currently do not. The CRM is preference-only. When a repeat customer comes back, Sam can look up their size and budget but cannot see what they previously bought.

**Gap:** No purchase linkage between products and customers. Marking a product sold does not record who bought it.

---

## 6. Future Vision

In one year, the ideal version of this app works as follows:

Sam opens the app every morning on her iPhone. The home screen greets her by name in Urdu and shows a genuinely intelligent action plan: "Mrs. Ahmed has a daughter's mehndi on July 4th — she has a $300 budget and likes pastels. You have a new mint georgette piece that might work. Send her a message?" She taps once. A personalized WhatsApp draft opens.

She receives new stock. She opens the Add screen, selects "Full Suit," and photographs it guided by soft on-screen prompts (light here, photograph this area now). The app analyzes in 15 seconds, generates a name in both English and Urdu, and shows her a surgical AI model photo that accurately depicts the embroidery. She prints a small SKU sticker from a connected Bluetooth label printer and attaches it to the bag.

Before an exhibition, she taps "Prepare for Edison Eid Mela." The app shows a suggested packing list based on customer preferences and season. She confirms or adjusts it. She gets a PDF she can print or screenshot. At the exhibition, the app works offline. She marks pieces sold with one tap. At the end of the day, she taps "Close exhibition" and gets a revenue summary.

At home, she opens Instagram. The app has already prepared post packages — model photo + caption + hashtags — for the 3 pieces she didn't sell. She posts in two taps.

Customer Zainab messages about Eid. Sam opens the app, searches "Zainab," sees her size, budget, last purchase, and the three pieces that match her profile. She taps "Send suggestions" and a warm Urdu WhatsApp message goes out.

None of this requires Sam to type anything. Ever.

---

## 7. Current Gaps

### Critical

1. **No offline support.** The exhibition module — the highest-stakes use case — requires cell service that may not exist at venues.
2. **Photos stored as base64 in database.** This will cause performance degradation and storage problems within months of regular use.
3. **No authentication.** Anyone with the URL can access and modify Sam's data.
4. **Generated content not saved.** Every WhatsApp card, caption, and model photo regenerates from scratch, burning API credits and producing inconsistent results.
5. **No Urdu content generation.** The bilingual toggle applies to UI chrome only. All AI-generated content is English.

### Important

6. **No purchase history on customer records.** The CRM cannot track who bought what.
7. **No payment tracking.** "Sold" does not mean "paid."
8. **No physical-digital link.** No SKU labels, no barcodes, no way to connect a physical garment bag to its database record.
9. **The settings modal is vestigial.** It was designed for a client-side API key architecture that no longer exists. It does nothing but confuse.
10. **No manifest.json or service worker.** The app cannot be properly installed as a PWA on Android.
11. **Action plan is rule-based, not AI.** It will say the same things repeatedly and miss context-aware opportunities.
12. **SKU generation can collide** across separate browser sessions.

### Minor

13. **No search in stock screen.**
14. **No sort controls in stock screen.**
15. **No draft save for intake form.**
16. **Urdu font (Nastaliq) not loaded.**
17. **RTL layout is a blunt instrument.**
18. **Exhibition items inserted one at a time in a loop.**
19. **No "re-analyze" for existing products.**
20. **model_photo never saved to database.**
21. **No cost/margin display.**
22. **No WhatsApp Business API integration.**
23. **No Instagram posting integration.**
24. **Delete is permanent, no archive.**

---

## 8. Open Problems

These are questions that require product decisions before implementation:

**1. Authentication model**
The app has no login. Is this acceptable long-term? If yes, the URL must remain private. If no, what is the right auth mechanism for a user like Sam? (A PIN code on the device is probably more appropriate than OAuth.)

**2. Photo storage architecture**
Should photos move to Supabase Storage, or stay in the database? Supabase Storage would require presigned URL handling, expiry management, and more complex client code. The tradeoff is correctness vs. complexity.

**3. Offline strategy**
How much of the app needs to work offline, and for how long? Full offline would require a service worker, IndexedDB sync, and conflict resolution. A lighter version might cache inventory at startup and queue writes.

**4. Urdu content generation**
Should AI-generated content (captions, WhatsApp messages, garment descriptions) be in English, Urdu, or both? Generating both doubles Claude API costs per call. Is that acceptable?

**5. Model photo accuracy vs. cost**
Is it worth prompting Claude for an extremely surgical Ideogram prompt, or is "good enough" more appropriate given the credit cost? Each regeneration attempt costs money. Is a less accurate but cheaper photo acceptable?

**6. Customer purchase history**
Should sold products be linked to customers in the database? This requires UI to prompt "who bought this?" at the moment of marking sold. Is this a flow Sam would complete, or would she skip it?

**7. Instagram workflow**
Is the value of Instagram high enough to warrant deeper integration, or is copy-paste acceptable? Instagram's API for posting is restrictive and changes frequently. A workaround (share sheet export) might be more practical.

**8. Exhibition offline strategy**
Is the exhibition module worth building with offline support? This is significant engineering work. The alternative is ensuring Sam has a personal hotspot at exhibitions.

**9. Price negotiation**
Sam likely negotiates prices at exhibitions and with direct customers. The app treats price as a fixed field. Should there be a "sale price" or "final sold price" separate from the listed price?

**10. Multi-language captions**
If a customer only speaks Urdu, should the generated WhatsApp message be in Urdu by default? Should it detect based on the customer's `language` field?

---

## 9. Honest Assessment

### Strengths

**The domain understanding is accurate.** The app is built by someone who knows Sam's business intimately. The garment type taxonomy (full suit, kameez, lehenga, dupatta) is correct for Pakistani women's wear. The photo slot system understands what angles matter (neckline detail, hemline border, dupatta flat). The feedback panel's zone chips (Neckline, Chest, Sleeves, Hemline, Dupatta) are accurate to how garments are discussed. This is not a generic inventory app with South Asian branding — it reflects real knowledge of the domain.

**The zero-typing principle is right.** Every major UX decision — zone chips instead of text boxes, voice notes instead of typed corrections, size pills instead of dropdowns — reflects an accurate understanding of Sam as a user. This is the single best design decision in the project.

**The architecture is pragmatically appropriate.** A single HTML file with no build tools is the right call for a solo developer building a personal app. It eliminates deployment friction, dependency maintenance, and cognitive overhead. The serverless function layer cleanly separates secrets from the frontend.

**The database schema is well-designed.** The `products` table anticipates future needs (caption columns, Urdu columns, ideogram_prompt, customer_id, exhibition_id). The migration system is professional and allows safe schema evolution. Disabling RLS for a single-user app is the correct tradeoff.

**The Ideogram integration work is well-documented in commit history.** The debugging journey from v2/v3 to v4 API format (text_prompt as direct multipart field) required real persistence. The CORS proxy for watermarking was a creative solution.

### Weaknesses

**The app has never been used by Sam.** This is the central weakness. Everything in this document is theoretical. The intake wizard was designed by Sam's son, not Sam. The garment types, photo slots, zone chips, action plan language, and Urdu translations have not been tested against Sam's real workflow. First contact with an actual user will likely expose multiple flows that need to change.

**The base64 photo storage is a ticking clock.** It will work for 20–30 products. After 100 products, the database will be slow and the app will feel sluggish. This needs to be addressed before regular use begins, not after.

**No offline means no exhibition support.** The single most valuable use case (real-time exhibition tracking) fails exactly when it's needed. An offline-capable exhibition module is arguably more important than most of the AI features.

**The settings modal is a lie.** It appears to save an API key but does nothing. If Sam explores the settings and saves something, she will believe she has done something meaningful. She has not. This erodes trust.

**Generated content is ephemeral.** If Sam generates a beautiful caption today, it is gone when she leaves the page. This is not how tools should work. Content that costs money to generate should be saved.

**The app has no error recovery.** If a Claude API call fails mid-intake-wizard, the user sees a toast and is returned to step 2. Their photos are still there, but the failed state is jarring. There is no retry button, no explanation of what went wrong.

**Urdu is cosmetic.** The language toggle changes labels. It does not change the language of any content Sam creates or receives. For a user who thinks in Urdu, this is worse than useless — it raises expectations that are not met.

**The logo base64 in the HTML file is 440KB.** The entire file is over 600KB before any user interaction. On a slow mobile connection, first load will take several seconds. There is no loading state.

**The action plan generates the same items every day.** If Sam has 5 items without prices, the action plan will say "set prices for 5 items" every single day until she does it. There is no acknowledgment, no snoozing, no way to say "I know, I'll do it later." It will start to feel like a nag.

**No testing exists.** No unit tests, no integration tests, no end-to-end tests. The only way to know if a code change broke something is to manually test the entire app. For a solo developer, this is understandable. For a production app used daily, it is a risk.

---

## If Sam used this app every single day for a year, what moments would still frustrate her?

**Day 1.** She opens the app and sees the settings modal mentions "Anthropic API Key." She enters one because it says "Stored only on this device." Nothing changes. She does not know if it worked. It did not — the field does nothing.

**Week 1.** She takes photos of her first garment. The front photo slot requires her to upload the front view, but she already photographed the garment flat on a bed and the photo is "back" in her phone gallery. The slot still says "Front (Kameez)" and won't let her label it differently. She uploads it anyway. The analysis gets confused.

**Week 2.** She generates a WhatsApp card for a piece she is proud of. The message comes out in English. Her customers speak Urdu. She pastes it into WhatsApp, rewrites it in Urdu herself, and wonders why the app didn't help with that.

**Week 3.** She generates an AI model photo. It looks wrong — the neckline embroidery is completely different from the actual piece. She opens the feedback panel, selects "Neckline" and "Wrong Embroidery," and taps regenerate. The second photo looks equally wrong in a different way. She gives up and uses the flat photo.

**Month 2.** She attends an exhibition. Cell signal is weak. She opens the exhibition module to mark things sold. The page spins. Nothing loads. She goes back to mentally tracking sales, which is what she was doing before.

**Month 3.** She adds a new piece and forgets to set the price. The home screen shows "Needs Attention: 1 item." She sets the price. The next morning, a different item shows "Needs Attention" because it also has no price. This happens every day. She stops looking at the Needs Attention section.

**Month 4.** She wants to find the green suit she added in March. She goes to stock, scrolls through 80 thumbnails. There is no search. She scrolls for two minutes. She finds it.

**Month 5.** Customer Fatima bought a piece three months ago and is asking about it. Sam wants to look up what Fatima bought. There is no purchase history. The customer record shows preferences, not history. Sam cannot find what Fatima bought.

**Month 6.** She generates a gorgeous caption for a piece. She wants to use the same caption again for a similar piece. She cannot find it anywhere in the app. She has to regenerate it from scratch, paying another API credit.

**Month 7.** She adds a new piece. The SKU is `MRK-FS-EID26-004` but the last few pieces she added were at an exhibition where she did not have signal and added them in a rush using someone else's phone on a different browser session. The sequence counter is off. She has two pieces with similar SKUs and cannot distinguish them.

**Month 8.** She opens the app on a day when the Anthropic API is having an outage. Every AI feature fails silently with a toast saying "Error: overloaded." She does not understand what "overloaded" means. She thinks the app is broken.

**Month 9.** She tries to mark a piece sold but the sold button is small and she taps "Reserved" instead. The status changes immediately. She does not know how to undo it. She taps "Available" then "Sold." The `sold_at` timestamp is now wrong. The piece is marked sold but the timestamp says it happened twice, confusingly.

**Month 10.** She has 150 pieces in the database. The app takes 8 seconds to load because 150 base64 photos are being transferred from Supabase. She gives up opening the stock screen. She starts using WhatsApp groups again.

**Month 11.** Her phone screen cracks. She gets a new phone. She opens the app URL in the browser. The language is back to English. Her inventory is there (it's in Supabase) but the language setting she saved is gone because it was in localStorage on the old phone. Small frustration.

**Month 12.** It's Eid season. She has 40 available pieces and 200 customers. She wants to send each customer a personalized message. The app generates one message at a time, one API call per customer, with a manual copy-paste step for each. At 3 minutes per customer, that is 10 hours of work. She sends to 10 customers and gives up.

The app solves real problems. It will make Sam's business meaningfully better than the all-mental, all-WhatsApp-improvised workflow she has today. But these are the moments where the gap between "demo" and "daily driver" becomes visible. Solving them — offline support, photo storage, Urdu content, saved outputs, purchase history, and search — would take this from a useful tool to an irreplaceable one.

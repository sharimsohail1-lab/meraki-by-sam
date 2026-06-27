# PRODUCT.md — Meraki by Sam

## Core Workflow

Every feature must serve this chain. If it doesn't, it shouldn't exist.

```
Receive Clothes
    ↓
Photograph (Intake Wizard — Step 2)
    ↓
AI Analysis → SKU + Name + Description + Ideogram Prompt (Intake Wizard — Step 3)
    ↓
Save to Inventory
    ↓
Marketing Package (one Claude call → 8 saved fields)
    ↓
Collection Assignment
    ↓
Collection Catalog (magazine-style, printable)
    ↓
WhatsApp / Instagram Sharing
    ↓
Exhibition Assignment
    ↓
Marked Sold at Exhibition or via Stock Screen
    ↓
Inventory Updated
    ↓
Customer Record Optionally Updated
```

**The app should answer "what next?" at every step. Sam should never wonder.**

---

## Feature Status

### ✅ Working

| Feature | Notes |
|---------|-------|
| Intake Wizard (3 steps) | Camera + gallery per slot, garment-type-specific slots |
| AI Garment Analysis | Claude vision → name, description, colors, occasion, Ideogram prompt |
| AI Model Photo | Ideogram v4, watermarked with Meraki logo |
| Model Photo Feedback / Regeneration | Zone chips, problem types, voice notes |
| Stock Screen | Grid view, filter tabs (all/available/reserved/sold/needs-price) |
| Collection view toggle | Items view ↔ Collections view in stock screen |
| Product Detail Sheet | Status update, price/notes/collection edit, generate AI model photo |
| Marketing Package | One call → caption_en, caption_ur, story_text, hashtags, whatsapp_listing, price_card, sharing_angle, catalog_blurb — saved to product |
| Editable Marketing Fields | Pencil icon → inline textarea → save to DB |
| Collection Catalog | Magazine cover, selection screen, preview, print/PDF |
| Collection Chips (Intake) | Multi-select existing collections, highlights when selected |
| Seed-based Collection Name AI | Claude builds off whatever Sam has typed |
| Collection Name in Detail Sheet | Editable, saves comma-separated |
| PKR Cost Input | Live exchange rate → converts to USD on save |
| WhatsApp Catalog | All available items → Claude-formatted message → deep link |
| Customer CRM | Preferences, AI item suggestions, personalized WhatsApp message |
| Exhibition Module | Create, assign items, mark sold/reserved at exhibition, revenue summary |
| Bilingual UI | EN/UR toggle, persisted in localStorage |
| Home Dashboard | Stats, action plan, needs-attention scroll |
| Next Steps Nudge | Shows recommended next action after saving a product |

### ⚠️ Partially Working / Known Issues

| Feature | Issue |
|---------|-------|
| AI model photo save | Saves to `currentAnalysis._modelPhotoUrl` but NOT to Supabase `model_photo` column |
| Urdu content | UI labels translate but AI-generated content is English-only |
| Action plan | Rule-based, not AI — says same things repeatedly |
| Settings modal | Vestigial API key field does nothing |

### ❌ Not Built

| Feature | Priority |
|---------|----------|
| Offline / service worker | Critical for exhibitions |
| Photo storage migration (base64 → Supabase Storage) | Critical at scale |
| Search in stock screen | High |
| Purchase history on customer records | High |
| Urdu AI content generation | Medium |
| manifest.json / true PWA install | Medium |
| Draft auto-save in intake | Medium |
| Payment tracking (cash/Venmo) | Medium |
| SKU label printing | Low |
| Instagram posting integration | Low |

---

## UX Rules

- Large buttons. Few decisions. Clear navigation.
- Every multi-step workflow must have: Back, Continue, Save, Cancel.
- Never trap Sam inside a flow. Never discard work without confirmation.
- Prefer chips, toggles, and buttons over text input.
- Every action should feel like it leads somewhere naturally.

---

## Dashboard Philosophy

The dashboard should not show statistics. It should show recommendations.

Not: "27 Available"
Instead: "4 items need pricing • 3 pieces have never been shared • Wedding season is approaching"

Every recommendation must be actionable with one tap.

---

## Collection Philosophy

Collections become shareable assets — not just groupings.

A Collection Catalog should feel like a boutique magazine:
- Meraki by Sam cover page with logo
- Product names, photos, prices
- Printable → PDF via browser print

Never auto-generate model photos. Only use existing model photos in catalog.

---

## Marketing Philosophy

Marketing is automatic, not on-demand.

After saving a product, the next recommended step is "Create Marketing Package."
The package is created once and saved. Never regenerated unless Sam explicitly asks.
Every field is editable inline with a pencil icon.

# MODEL_PIPELINE_CHANGELOG.md

Changes to the garment-to-model image pipeline.
Dates are approximate (UTC).

---

## 2026-06-27 — Composite reference image + canonical photo fix

### What changed

**1. Critical bug fix: canonical garment photo**

`products.photo` was being overwritten with the AI-generated model image at save time.
Every regeneration from the detail sheet was feeding Ideogram its own prior output
instead of the real garment. This silently degraded quality with every subsequent
generation.

*Before:*
```
products.photo    = model photo if generated, else garment photo
products.model_photo = model photo (duplicate)
```

*After:*
```
products.photo    = ALWAYS the original uploaded garment photo (front view)
products.model_photo = AI-generated model photo (if generated)
```

**2. Composite reference image**

Previously: only the front photo was sent to Ideogram as the reference image.
All other uploaded zone photos (back, neckline, sleeves, dupatta, hemline) were
sent to Claude for analysis but discarded before Ideogram received anything.

Now: `buildGarmentComposite()` assembles every uploaded zone photo into a labelled
canvas grid (front left full-height, others stacked right with zone labels) and
sends the composite to Ideogram as the single reference image.

If only one photo was uploaded, the single photo is sent directly (no change).
If regenerating from the detail sheet (no live uploads available), falls back to
`currentProduct.photo` — now guaranteed to be the original garment photo, not an
AI image.

**3. Improved Claude ideogramPrompt instruction**

The Claude prompt now explicitly requests zone-by-zone description in this order:
kameez body → neckline → sleeves → cuffs → hemline → dupatta → trouser.

Claude is instructed to leave zones blank rather than hallucinate details for zones
not visible in the photos. Previously the instruction was more generic.

**4. Debug observability**

`generateModelPhoto()` now logs a structured group to the browser console before
every generation:

```
[Meraki] Model photo generation
  Source: composite (4 zones) | single upload | saved garment photo
  Image weight: 0.95
  Prompt length: 312 chars
  Prompt preview: Professional fashion photograph, Pakistani woman model...
  Reference image size: 184 KB
```

`saveProduct()` logs after every save:
```
[Meraki] Product saved — photo: garment (142KB) | model_photo: AI model (89KB)
```

**5. View Reference Image button**

A "View reference" link appears below the generate button after generation completes.
Opens the exact image sent to Ideogram in a new tab. Useful to confirm:
- composite is being used when multiple photos were uploaded
- the reference is the garment photo, not an AI image

Button is hidden on page load and when opening a product detail sheet.

**6. Display logic**

All display locations now use `model_photo || photo` consistently:

| Location | Before | After |
|----------|--------|-------|
| Stock screen card | `p.photo` | `p.model_photo \|\| p.photo` |
| Product detail sheet header | `p.photo` | `p.model_photo \|\| p.photo` |
| Collection view thumbnails | `p.photo` | `p.model_photo \|\| p.photo` |
| Collection detail item list | `p.photo` | `p.model_photo \|\| p.photo` |
| Collection catalog (already correct) | `p.model_photo \|\| p.photo` | unchanged |
| Exhibition item thumbnails | `p.photo` | unchanged (garment photo preferred for packing context) |
| Exhibition product picker | `p.photo` | unchanged |

---

### Why it changed

The fundamental problem identified in MODEL_GENERATION_PIPELINE.md was information
loss before Ideogram receives the reference image. Two sources of loss:

1. The reference image was becoming an AI image (the regeneration loop problem)
2. Only one of Sam's uploaded photos was reaching Ideogram

Both are now addressed. The composite change is the higher-impact fix because it
gives Ideogram all the embroidery and zone detail that Claude was analysing but
Ideogram was never seeing.

---

### Risks remaining

**Composite image quality**
The composite is a JPEG canvas grid at 88% quality. The cells are small
(300×400px each) because Ideogram's remix endpoint receives a single image and
using very large composites risks hitting API payload limits. Small cells may lose
fine embroidery detail. This needs manual testing with real garments.

**Existing products in Supabase**
Products saved before this change have `products.photo` = model photo (if a model
was generated during intake). These products will:
- Display the model photo in stock (correct, unchanged)
- Regenerate from the detail sheet using the model photo as reference (broken, same
  as before — but now visibly broken since the reference shows in View Reference)
There is no migration for existing rows. Sam can identify these products because
View Reference will show a model image, not a flat lay.

**Composite vs. single-photo accuracy**
Sending a grid may confuse Ideogram if it tries to reproduce the composite layout
rather than treating it as a multi-zone reference. This is the primary unknown.
Manual testing required before drawing conclusions.

**Composite only available at intake time**
The composite is built from `uploadedPhotos` (in-memory, cleared after save).
Detail-sheet regeneration only has the one stored garment photo. The composite
benefit is therefore intake-only. Future solution: store all zone photos in
Supabase Storage (already in TASKS.md as critical).

---

### What must be tested manually

Use the browser console (Safari > Develop > Show Web Inspector, or Android DevTools)
to verify the log output during each test.

**Test 1 — New garment, one photo**
1. Upload only a front photo
2. Analyze → Generate Model Photo
3. Console: Source should say `single upload`
4. "View reference" → should show the uploaded flat lay
5. Save
6. Console: `photo: garment (...KB) | model_photo: AI model (...KB)`
7. Open stock → should display the model photo
8. Open product detail → should display the model photo

**Test 2 — New garment, multiple photos**
1. Upload front + back + neckline
2. Analyze → Generate Model Photo
3. Console: Source should say `composite (3 zones)`
4. "View reference" → should show a 2-column grid with labelled zones
5. Save, open stock → should display the model photo
6. Open product detail → should display the model photo

**Test 3 — Regenerate from detail sheet**
1. Open any existing product that has a model photo
2. Generate AI Model Photo
3. Console: Source should say `saved garment photo`
4. "View reference" → for newly saved products (post-fix): shows flat-lay garment
   For old products (pre-fix): shows a model photo (known limitation, see Risks)

**Test 4 — Products without model photo**
1. Save a product without generating a model photo
2. Open stock → should display the flat-lay garment photo
3. Open product detail → should display the flat-lay garment photo

**Test 5 — Collection catalog**
1. Create a collection with products (some with model_photo, some without)
2. Open catalog preview → products with model photos should display model photos
3. Products without should display garment photos

**Test 6 — Exhibition**
1. Add products to an exhibition
2. Exhibition item list should show garment photos (unchanged, intentional)

---

## 2026-06-27 — Regression fix: restore model generation

### What broke

The composite reference image (grid of all uploaded zone photos sent to Ideogram)
caused Ideogram to reproduce the flat-lay grid instead of generating a model.
High image_weight (0.95 default) reinforced this — Ideogram interpreted the
instruction as "recreate this reference" rather than "dress a model using this
garment as reference."

### What changed

**1. Composite no longer sent to Ideogram**

Ideogram now receives only the front photo (or first uploaded) as the image
reference. This is the same single-photo behaviour as before the composite was
introduced, except the source is now guaranteed to be the original garment photo
(not an AI image — canonical fix from previous commit remains in place).

The composite is still built when multiple photos are uploaded, but is used only
for the "View reference" debug preview. It is never sent to Ideogram.

`viewReferenceImage()` now shows the composite when multiple zones are uploaded,
with a tooltip clarifying: "Ideogram only receives the front photo."

**2. Default image_weight changed from 0.95 to 0.60**

0.95 was suppressing model generation — the reference dominated and Ideogram
preserved the flat-lay pose. 0.60 gives Ideogram more creative latitude to place
the garment on a model while still using the photo as a colour/pattern reference.
Slider range unchanged (20–95%). Sam can still adjust.

**3. ideogramPrompt instruction strengthened**

The Claude instruction for generating `ideogramPrompt` now:
- Requires the prompt to START with "Full-length professional fashion photograph
  of a Pakistani woman model wearing"
- Ends with explicit avoidance: "Not a flat-lay. Not a product photo. Not a
  collage or grid."
- Marks these requirements as CRITICAL in the instruction

**4. Fallback weight in callIdeogram updated**

The hardcoded fallback (used when no slider is visible) changed from 0.95 to
0.60 to match the new default.

### Why composite broke generation

Ideogram's remix endpoint takes one reference image and uses it primarily as a
structural/style template. A labelled grid of 4 photos looks like a product
reference sheet. At high image_weight, Ideogram tries to reproduce that structure
— it creates a product collage, not a model photo.

At lower weights (< 0.5) a composite might work as a loose colour reference, but
at those weights the prompt matters more than the reference anyway, making the
composite mostly redundant.

### Risks remaining

The single-photo approach gives Ideogram less garment detail than the composite
would have (if composite had worked). Neckline embroidery, sleeve detail, and
dupatta patterns are still conveyed only through the text prompt (written by
Claude from the photos during analysis). Accuracy improvement from multi-photo
information is now entirely prompt-dependent.

Composite remains available as a future option if Ideogram adds dedicated
multi-reference support, or if low-weight experiments show the composite can
improve colour accuracy without breaking model generation.

### What to test

Same 9 tests from previous matrix. Core confirmation: output must be a full-length
model wearing the garment — not a grid, not a flat-lay, not a hanger image.

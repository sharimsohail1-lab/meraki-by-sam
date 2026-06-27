# MODEL_GENERATION_PIPELINE.md
# Meraki by Sam — Garment-to-Model Image Pipeline
# Technical Report for External Review

---

## 1. Current Pipeline

The pipeline converts a flat-lay or hanger photograph of a Pakistani garment into a photorealistic image of a model wearing it. The full flow is:

```
Step 1: PHOTO UPLOAD
  Sam photographs the garment using the intake wizard.
  Each photo slot maps to a garment zone (front, back, neckline, sleeves, etc.).
  Photos are captured as File objects via <input type="file"> or camera capture.
  Each photo is read using FileReader.readAsDataURL() → stored in memory as base64 data URL.
  No resizing, compression, or preprocessing occurs before Claude.

Step 2: CLAUDE VISION ANALYSIS
  All uploaded photos (every slot filled) are sent to Claude claude-sonnet-4-6.
  Each photo is sent as a base64 image content block inside a single Messages API call.
  Claude receives ALL photos simultaneously in one multi-image vision call.
  Claude is asked to return structured JSON: name, description, colors, occasion, category, ideogramPrompt.
  The ideogramPrompt field is the critical output — it is a surgical text description of the garment.

Step 3: PROMPT CONSTRUCTION
  The ideogramPrompt string produced by Claude IS the Ideogram prompt.
  No post-processing, cleaning, or augmentation is applied to it.
  The prompt is stored in currentAnalysis.ideogramPrompt in JavaScript memory.
  It is also saved to the products.ideogram_prompt column in Supabase on product save.

Step 4: IDEOGRAM API REQUEST
  The frontend reads the front photo (or first available) as a base64 string.
  This is sent as image_b64 in a JSON POST body to /api/ideogram (Vercel serverless function).
  The backend tries TWO endpoints in sequence:
    → First: POST https://api.ideogram.ai/v1/ideogram-v4/remix (JSON body)
    → If that fails: POST https://api.ideogram.ai/remix (multipart, V_2 model)
  image_weight is currently 0.95 (95%), controllable via a slider Sam can adjust.
  No seed, no negative prompt, no style parameter, no guidance scale.

Step 5: RETURNED IMAGE
  Ideogram returns a JSON response containing a CDN URL to the generated image.
  Example: { "data": [{ "url": "https://ideogram.ai/assets/image/..." }] }
  The URL is a temporary CDN link, not a permanent storage URL.

Step 6: WATERMARK
  The frontend fetches the Ideogram CDN URL through /api/ideogram?url=... (GET proxy).
  This is necessary because the Ideogram CDN does not send CORS headers, blocking canvas access.
  The proxied image is drawn onto an HTML Canvas element.
  The Meraki by Sam logo (PNG, ~440KB, embedded as base64 in the HTML file) is drawn over it.
  Logo placement: bottom-right corner, 22% of image width, 3% margin, 85% opacity.
  The canvas is exported as JPEG at 0.92 quality using canvas.toDataURL('image/jpeg', 0.92).
  The result is a base64 JPEG data URL.

Step 7: SAVED PRODUCT
  The watermarked base64 JPEG is stored in JavaScript as currentAnalysis._modelPhotoUrl.
  When the product is saved, if a model photo was generated:
    → products.photo = model photo base64 (used as primary display image in stock grid)
    → products.model_photo = model photo base64 (stored separately)
  If no model photo was generated, products.photo = the flat-lay upload.
  Both are stored as full base64 strings in Supabase TEXT columns (not in file storage).
```

---

## 2. Photo Inputs

### Collection mechanism

Photos are captured via `<input type="file" accept="image/*">` elements — one per slot. Two inputs exist per slot:
- `<input type="file" accept="image/*" capture="environment">` — opens device camera directly
- `<input type="file" accept="image/*">` — opens photo library picker

On selection, JavaScript reads the file:
```javascript
const reader = new FileReader();
reader.onload = e => {
  uploadedPhotos[slotId] = {
    dataUrl: e.target.result,  // full base64 data URL: "data:image/jpeg;base64,/9j/..."
    file: file,                 // original File object (used for MIME type)
    label: slotLabel
  };
};
reader.readAsDataURL(file);
```

### Photo slot definitions per garment type

```
full-suit (required):
  - front       "Front (Kameez)"       REQUIRED
  - back        "Back View"            REQUIRED
  - bottom      "Shalwar / Trouser"    REQUIRED
  optional:
  - dupatta     "Dupatta"
  - neckline    "Neckline Detail"
  - sleeves     "Sleeves Detail"
  - hemline     "Hemline / Border"

kameez (required):
  - front       "Front"                REQUIRED
  - back        "Back"                 REQUIRED
  optional:
  - neckline    "Neckline"
  - sleeves     "Sleeves"

lehenga (required):
  - skirt-front "Skirt Front"          REQUIRED
  - blouse      "Blouse / Choli"       REQUIRED
  optional:
  - dupatta     "Dupatta"
  - sleeves     "Sleeves Detail"
  - skirt-detail "Skirt Detail / Embroidery"

dupatta (required):
  - full        "Full Dupatta"         REQUIRED
  optional:
  - border      "Border Detail"
  - embroidery  "Embroidery Close-up"

other (required):
  - front       "Front"                REQUIRED
  optional:
  - detail      "Detail View"
```

Additional extra slots can be added via preset chips: Side View, Sleeves, Lining, Buttons, Mirror Work, Print Pattern, Full Look — or a custom free-text label.

### Image preprocessing

**None.**

There is zero preprocessing applied before any photo is sent to Claude or Ideogram:
- No resizing
- No compression beyond what the device camera applies natively
- No cropping
- No background removal
- No normalization or color correction
- No format conversion (JPEG stays JPEG, PNG stays PNG)
- No downscaling

Images are sent to Claude exactly as the device produces them. Phone camera photos are typically 2–6MB JPEGs at 3000–4000px on a side. The base64 encoding adds ~33% overhead, so a 3MB JPEG becomes ~4MB of base64 characters.

### What Claude receives

All uploaded photos in a single API call, as an array of image content blocks:

```javascript
const photoContents = allPhotos.map(p => ({
  type: 'image',
  source: {
    type: 'base64',
    media_type: p.file.type || 'image/jpeg',
    data: p.dataUrl.split(',')[1]   // strips "data:image/jpeg;base64," prefix
  }
}));
```

The array is ordered by upload slot order (`Object.values(uploadedPhotos)`), not explicitly by importance. Front is first only if Sam uploaded it first.

---

## 3. Claude Vision Prompt

The complete prompt sent to Claude (user turn content array):

```
[
  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '<photo1_base64>' } },
  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '<photo2_base64>' } },
  ...all uploaded photos...,
  {
    type: 'text',
    text: `You are analyzing a Pakistani garment for Meraki by Sam, a clothing boutique.
Garment type: ${garmentType}, Season/Occasion: ${intakeSeason}.
Photos provided: ${allPhotos.map(p => p.label).join(', ')}.

Respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "name": "Short evocative English name (3-5 words)",
  "description": "2-3 sentence poetic description for customers. Mention fabric, key colors, embroidery placement, standout design details. Do NOT mention APPNA.",
  "colors": "comma-separated list of main colors",
  "occasion": "best occasion for this garment",
  "category": "Formal/Semi-Formal/Casual/Bridal",
  "ideogramPrompt": "SURGICAL Ideogram v4 prompt for Pakistani fashion model photo. Format: 'Professional fashion photograph, Pakistani model wearing [garment type]. FABRIC: [exact fabric description]. COLORS: [precise colors zone by zone]. EMBROIDERY: [exact placement — e.g. heavily embroidered neckline extending 3 inches down chest in gold thread, mirror work on sleeves cuffs, plain hemline]. SILHOUETTE: [cut and shape]. STYLE: editorial lighting, white seamless background, full length shot, sharp focus, 8k'"
}`
  }
]
```

System prompt:
```
You are a luxury Pakistani fashion expert. Always respond with valid JSON only.
```

Max tokens: 1200.
Model: claude-sonnet-4-6.

### Why each instruction exists

- `Garment type: ${garmentType}` — Claude needs to know what it's looking at (full suit vs lehenga vs dupatta) to use correct terminology and understand what slots mean.
- `Season/Occasion: ${intakeSeason}` — provides context for description tone and styling language (Eid = festive language, casual = relaxed language).
- `Photos provided: ${labels}` — tells Claude which angles it is seeing so it doesn't try to infer them.
- `EXACTLY this JSON format` — prevents Claude from adding markdown code fences, explanation text, or extra keys that would break `JSON.parse()`.
- `Do NOT mention APPNA` — APPNA is a Pakistani-American physicians' association. An earlier Claude response hallucinated a reference to it. This was added as a defensive measure.
- `SURGICAL Ideogram v4 prompt` — the word "surgical" was added to push Claude toward precision rather than poetic generality. The intent is extreme specificity about embroidery placement.
- `zone by zone` — instructs Claude to describe colors per garment zone rather than globally.
- `e.g. heavily embroidered neckline extending 3 inches down chest` — an example of the desired specificity level to guide Claude's output style.
- `8k` — common Ideogram/Stable Diffusion quality token intended to push for high-detail output.

---

## 4. Claude Output

### JSON schema returned

```json
{
  "name": "string — 3-5 words, evocative, English",
  "description": "string — 2-3 sentences, poetic, customer-facing",
  "colors": "string — comma-separated, e.g. 'ivory, gold, dusty rose'",
  "occasion": "string — e.g. 'Eid', 'Wedding', 'Formal Dinner'",
  "category": "string — one of: Formal, Semi-Formal, Casual, Bridal",
  "ideogramPrompt": "string — full text prompt for Ideogram"
}
```

### Example real output

```json
{
  "name": "Ivory Pearl Chiffon Suit",
  "description": "A luminous ivory chiffon three-piece suit adorned with delicate pearl-white thread embroidery cascading from the neckline down the chest. The dupatta is embellished with a scalloped gold border, catching light with every movement. An effortlessly elegant choice for Eid or formal gatherings.",
  "colors": "ivory, pearl white, gold",
  "occasion": "Eid",
  "category": "Formal",
  "ideogramPrompt": "Professional fashion photograph, Pakistani model wearing a three-piece chiffon suit. FABRIC: lightweight chiffon kameez with matching chiffon dupatta and straight-cut trouser. COLORS: kameez is ivory white, trouser is ivory white, dupatta is ivory with gold border edging. EMBROIDERY: dense pearl-white thread embroidery on neckline extending 4 inches down chest in floral motif, scattered pearl embroidery on sleeve cuffs, plain hemline. SILHOUETTE: straight cut kameez to knee length, wide leg trouser, rectangular dupatta draped over shoulders. STYLE: editorial lighting, white seamless background, full length shot, sharp focus, 8k"
}
```

### Field analysis

- `name` — stored as `products.name`. Editable by Sam after analysis. Used in stock grid, catalog, WhatsApp messages.
- `description` — stored as `products.description_en`. Shown in product detail sheet. Used in marketing package generation.
- `colors` — stored as `products.colors`. Used for customer matching ("find something green for Aunty Farrukh").
- `occasion` — stored as `products.occasion`. Used for customer matching and WhatsApp catalog grouping.
- `category` — stored as `products.category`. Filter and display metadata.
- `ideogramPrompt` — stored as `products.ideogram_prompt`. **The entire visual accuracy of the generated model photo depends on this field.** It is the only channel through which Claude's visual understanding of the garment reaches Ideogram (apart from the reference image recently added).

---

## 5. Ideogram Prompt

The Ideogram prompt is entirely generated by Claude. There is no template with fixed boilerplate added by the application. Claude writes the complete string inside the `ideogramPrompt` JSON field.

### The instructed format

Claude is told to follow this structure:

```
Professional fashion photograph, Pakistani model wearing [garment type].
FABRIC: [exact fabric description].
COLORS: [precise colors zone by zone].
EMBROIDERY: [exact placement — e.g. heavily embroidered neckline extending 3 inches down chest in gold thread, mirror work on sleeves cuffs, plain hemline].
SILHOUETTE: [cut and shape].
STYLE: editorial lighting, white seamless background, full length shot, sharp focus, 8k
```

### Example prompt actually sent to Ideogram

```
Professional fashion photograph, Pakistani model wearing a three-piece chiffon suit. FABRIC: lightweight chiffon kameez with matching chiffon dupatta and straight-cut trouser. COLORS: kameez is ivory white, trouser is ivory white, dupatta is ivory with gold border edging. EMBROIDERY: dense pearl-white thread embroidery on neckline extending 4 inches down chest in floral motif, scattered pearl embroidery on sleeve cuffs, plain hemline. SILHOUETTE: straight cut kameez to knee length, wide leg trouser, rectangular dupatta draped over shoulders. STYLE: editorial lighting, white seamless background, full length shot, sharp focus, 8k
```

### What is NOT in the prompt

- No negative prompts
- No seed
- No style token (e.g. "photorealistic", "fashion photography style")
- No model pose instruction (no "standing", "hands at sides", etc.)
- No background specification beyond "white seamless"
- No lighting specification beyond "editorial lighting"
- No camera angle (no "front-facing", "three-quarter view")
- No instruction to show the full garment including trouser/bottom
- No instruction about dupatta placement on the model

### Correction mode prompt modification

When Sam uses the feedback panel, a correction string is appended to the original prompt:

```javascript
const refinedPrompt = currentAnalysis.ideogramPrompt +
  ` CORRECTION NEEDED: The ${zones} area is ${problems}.${refNote}${voice} Please fix these specific areas while keeping everything else exactly the same.`;
```

Example correction:
```
[original prompt] CORRECTION NEEDED: The Neckline, Sleeves area is wrong embroidery, wrong color. Reference photo 1 shows the correct version. Please fix these specific areas while keeping everything else exactly the same.
```

---

## 6. Ideogram API Request

### Endpoint priority

The backend tries two endpoints in order:

**Primary: Ideogram v4 remix (JSON)**
```
POST https://api.ideogram.ai/v1/ideogram-v4/remix
Content-Type: application/json
Api-Key: [IDEOGRAM_API_KEY]

{
  "text_prompt": "[Claude-generated prompt string]",
  "aspect_ratio": "ASPECT_2_3",
  "image_weight": 0.95,
  "image_file": "[base64 string of garment photo, no data: prefix]"
}
```

**Fallback: Ideogram v2 remix (multipart)**
```
POST https://api.ideogram.ai/remix
Content-Type: multipart/form-data; boundary=[timestamp-boundary]
Api-Key: [IDEOGRAM_API_KEY]

--boundary
Content-Disposition: form-data; name="image_request"

{"prompt":"[Claude prompt]","aspect_ratio":"ASPECT_2_3","image_weight":95,"model":"V_2"}
--boundary
Content-Disposition: form-data; name="image_file"; filename="garment.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

### Parameters used

| Parameter | Value | Notes |
|-----------|-------|-------|
| `text_prompt` | Claude-generated string | Only text channel to Ideogram beyond reference image |
| `aspect_ratio` | `ASPECT_2_3` | Portrait, appropriate for full-length fashion |
| `image_weight` | 0.95 (v4) / 95 (v2) | User-adjustable via slider, range 0.2–0.95 |
| `image_file` | Base64 garment photo | Only the front/first uploaded photo |
| `model` | `ideogram-v4` (primary) / `V_2` (fallback) | |

### Parameters NOT used

| Parameter | Status |
|-----------|--------|
| Negative prompt | Not sent |
| Seed | Not sent (non-deterministic) |
| Style preset | Not sent |
| Rendering speed | Not sent (uses API default) |
| Guidance scale | Not sent |
| Number of outputs | Not sent (default: 1) |
| Color palette | Not sent |
| Magic prompt | Not sent / default unknown |

---

## 7. Image Reference Strategy

### What Ideogram receives

**One image only.** The selection logic:

```javascript
const garmentPhoto = uploadedPhotos['front']?.dataUrl         // 1st choice: front slot
  || uploadedPhotos[Object.keys(uploadedPhotos)[0]]?.dataUrl  // 2nd choice: first uploaded slot
  || currentAnalysis._uploadedPhotoB64                        // 3rd choice: cached from analysis time
  || null;                                                     // fallback: no image (text-only)
```

When regenerating from the product detail sheet (after the product is saved and the intake form is gone):
```javascript
currentAnalysis = {
  ideogramPrompt: currentProduct.ideogram_prompt,
  sku: currentProduct.sku,
  _uploadedPhotoB64: currentProduct.photo || null   // uses saved product photo (may be model photo, not garment)
};
```

**Critical problem:** If Sam generated a model photo and saved the product, `currentProduct.photo` is the AI-generated model photo, not the original garment flat-lay. Re-generating from the detail sheet sends the AI output back to Ideogram as the reference input, not the original garment.

### What Ideogram does NOT receive

- The back photo
- The neckline detail photo
- The sleeves photo
- The dupatta photo
- The hemline/border photo
- Any extra slot photos (mirror work, lining, buttons)
- Multiple images simultaneously
- A composite or collage of multiple angles
- Any indication of which zones in the reference image correspond to which garment zones

### Image influence

`image_weight: 0.95` means Ideogram is instructed to follow the reference image at 95% fidelity. In practice this means Ideogram will try to reproduce the overall color and composition of the flat-lay photo rather than generate a model-on-photo. This directly explains the current "no model" failure observed at 1.0 weight, and the poor accuracy at lower weights.

### How reference images are ordered

There is no ordering mechanism. Only one image is sent. The selection is priority-first: front slot, then first uploaded.

---

## 8. Failure Analysis

### Wrong neckline embroidery
**Why:** The neckline is the most intricate zone and the most photographically ambiguous. A flat-lay front photo compresses 3D neckline structure into 2D. Claude interprets embroidery density and pattern from a compressed perspective. Ideogram receives that text description plus a 2D reference image where neckline detail may be obscured by fold shadows, lighting hotspots, or camera angle. Even at high image_weight, Ideogram tends to hallucinate embroidery patterns that match the broad color rather than the precise motif.

### Wrong sleeve detail
**Why:** Sleeves in a flat-lay photo are typically folded under or alongside the kameez body. The reference image sent to Ideogram often shows sleeves as indistinct fabric strips. No separate sleeve photo is sent to Ideogram even if Sam uploaded one. Claude may describe the sleeves accurately from the dedicated sleeve slot photo, but Ideogram sees only the front photo where sleeves are poorly represented.

### Wrong dupatta
**Why:** The dupatta is almost never visible in the front kameez photo that gets sent to Ideogram. It's either folded separately or draped in a different shot. Claude may have seen the dupatta in a dedicated slot photo and described it accurately in the prompt, but Ideogram's reference image shows no dupatta — so it invents one based on text description alone.

### Wrong silhouette
**Why:** Pakistani garments on a flat surface do not convey silhouette accurately. A wide-leg trouser looks identical to a narrow trouser when flat. An A-line kameez and a straight-cut kameez have the same width when lying flat. Ideogram cannot infer 3D silhouette from a 2D flat reference, and the text prompt may not describe silhouette precisely enough.

### Wrong colors
**Why:** Phone camera auto-white-balance frequently shifts colors. A dusty rose can appear peach or salmon depending on lighting temperature. The flat-lay reference at high image_weight will anchor Ideogram to the camera-shifted color, not the true fabric color. Additionally, embellishments (gold thread, mirror work) may appear as bright spots that Ideogram interprets as structural elements.

### Hallucinated embroidery
**Why:** When the text prompt says "heavily embroidered" but the reference image shows a flat-lay where embroidery is subtle due to angle or lighting, Ideogram resolves the contradiction by inventing embroidery that satisfies both the text description and the visual reference. The invented embroidery is statistically plausible for Pakistani garments but not accurate to the actual piece.

### Missing borders
**Why:** Hemline and border embroidery is usually at the very bottom of the garment. In most flat-lay photos, the hemline is folded under or cropped out. The dedicated "Hemline / Border" photo slot exists for this reason, but it is optional and not sent to Ideogram even when uploaded. Claude may describe the border from that photo, but Ideogram's reference image shows nothing at the bottom.

### No model (at high image_weight)
**Why:** At image_weight approaching 1.0, Ideogram treats the flat-lay photograph as the target output to reconstruct, not as a reference for what to dress a model in. It reproduces the garment layout on a flat surface. The model generation capacity is suppressed because generating a model requires significant deviation from the reference image.

---

## 9. Existing Feedback System

### How it works

After a model photo is generated, Sam can open a "Fix this photo" panel. She selects:

1. **Zones** (chips): Neckline, Chest, Sleeves, Hemline, Dupatta, Bottom (for full-suit). Populated per garment type from `GARMENT_ZONES` constant.
2. **Problem type** (chips): Wrong Color, Wrong Embroidery, Wrong Shape, Completely Wrong.
3. **Reference photo** (thumbnails): One of the uploaded slot photos to point to the correct version.
4. **Voice note**: Web Speech API transcript (Urdu or English).

These selections are serialized into a correction string appended to the original ideogram prompt:

```javascript
const refinedPrompt = currentAnalysis.ideogramPrompt +
  ` CORRECTION NEEDED: The ${zones} area is ${problems}.${refNote}${voice} Please fix these specific areas while keeping everything else exactly the same.`;
```

### Whether this actually works

**Mostly no.** The correction string is appended as natural language to a prompt that Ideogram treats as a bag of visual tokens, not as instructions in a conversational AI sense. Several reasons this is ineffective:

1. Ideogram is not a conversational model. It does not interpret "CORRECTION NEEDED" as an instruction to modify a previous generation. It treats the entire string as a new prompt.
2. The phrase "keeping everything else exactly the same" has no meaning to Ideogram. It does not have memory of the previous generation.
3. Appending contradictory information ("COLORS: gold... CORRECTION NEEDED: wrong color") may confuse the model rather than guide it.
4. The voice note is appended verbatim in Urdu or English, mixed into a structured technical prompt. The model may not parse natural language corrections inside an otherwise structured prompt.
5. The reference photo selection ("Reference photo 1 shows the correct version") is noted in the text but that photo is not actually sent to Ideogram. Ideogram still only sees the one front photo.

### Net effect

The correction system gives Sam a sense of agency but produces marginal improvement. It occasionally improves output when the correction phrase happens to add a missing token the original prompt lacked.

---

## 10. Existing Experiments

| Experiment | Value Tested | Result |
|------------|-------------|--------|
| Text-only generation | No reference image | Wrong garment colors and embroidery consistently. Fast but inaccurate. |
| image_weight: 0.4 | First attempt with remix | Model was generated but ignored garment colors and embroidery details |
| image_weight: 0.85 | Second attempt | Slightly better color match, still inaccurate embroidery |
| image_weight: 1.0 | Maximum | No model generated — Ideogram reproduced the flat-lay photo |
| image_weight: 0.7 | Back to 0.7 | Same as initial 0.4 result — improvement was marginal |
| image_weight: 0.95 | Current default | Still under evaluation — slider added for Sam to tune |
| v4 remix endpoint (multipart) | Wrong format | HTTP 400: "Parsed body must be a mapping" — v4 expects JSON |
| v4 remix endpoint (JSON) | Current attempt | Under evaluation |
| v2 remix endpoint (multipart) | Fallback | Works (generates image) but uses older model with less photorealism |
| Surgical prompt template | "extend 3 inches down chest" | Marginal improvement in embroidery zone accuracy |
| Feedback panel corrections | Append CORRECTION NEEDED | Minimal effect — Ideogram treats it as new prompt content not an instruction |

---

## 11. Current Limitations

### Most critical architectural weaknesses

**1. Only one image reaches Ideogram.**
The entire reference input is a single front/first photo. The neckline detail, sleeve detail, dupatta, hemline border, and back photos that Sam carefully uploads are used only by Claude — they never reach Ideogram. Ideogram cannot see the intricate mirror work on the sleeves because only the front photo is sent.

**2. The reference image and the prompt often contradict each other.**
Claude describes the garment from all uploaded photos (including dedicated detail shots). Ideogram sees only the front photo. The prompt may say "heavily embroidered border" because Claude saw the hemline photo, but the reference image shows no border at all. Ideogram resolves this contradiction by hallucinating.

**3. The reference image may be the AI output, not the garment.**
When Sam regenerates from the product detail sheet after already having generated a model photo, `currentProduct.photo` is the previously generated model image. Ideogram receives a generated model photo as the reference for the next generation — compounding errors.

**4. No preprocessing increases noise.**
A 4000×3000px flat-lay JPEG with shadows, wrinkles, floor texture, and off-white-balance colors is sent directly to both Claude and Ideogram. Relevant garment information competes with irrelevant background information. Claude handles this reasonably well. Ideogram's reference interpretation does not.

**5. Claude's ideogramPrompt is the sole structured channel.**
Claude encodes everything it knows about the garment into one text string. If Claude misses or under-describes a detail (which happens frequently with complex embroidery at small scale), that information is permanently lost. There is no way to correct Claude's description without re-running the full analysis.

**6. image_weight creates a tradeoff with no good middle ground.**
Low weight (0.3–0.5): model is generated but garment colors and structure are ignored.
High weight (0.85–0.95): garment structure followed but model generation is suppressed.
This is a fundamental Ideogram architectural constraint, not a parameter tuning problem.

**7. No style/pose consistency.**
Each generation produces a different model pose, skin tone, background, and lighting. There is no seed, no pose ControlNet, no consistent model. Sam cannot build a consistent visual brand identity across garments.

**8. No negative prompt.**
No instruction exists to suppress common failure modes: wrong background, wrong number of people, front-facing flat layout, wrong ethnic presentation, non-Pakistani styling.

**9. The feedback system sends no additional images.**
When Sam selects "Reference photo 1 shows the correct version," only the text reference is sent. The actual reference photo is not sent to Ideogram as an additional image reference. The correction is therefore a text hint, not a visual correction.

---

## 12. How to Improve Accuracy by 5x Without Changing Image Providers

Ranked by expected impact:

---

### 1. Send multiple reference images per generation (highest impact)

**Current:** One image (front only).  
**Proposed:** Combine all uploaded photos into a grid collage on the server before sending to Ideogram.

Create a 2×N canvas:
- Left column: front + neckline detail
- Right column: back + sleeve detail + hemline

Send this single composite image as the reference. Ideogram sees all critical zones simultaneously. The text prompt continues to describe zone-by-zone detail, and the reference image now supports those descriptions visually.

**Why this helps:** The most damaging failures (wrong dupatta, wrong border, wrong sleeves) happen because those elements are not in the single front photo. A composite collapses all visual information into one reference.

**Implementation:** Server-side Canvas composition using node-canvas or sharp. Create the collage in the Vercel function before forwarding to Ideogram.

---

### 2. Add a background removal step before sending to Ideogram

**Current:** Full flat-lay photo including floor, surface, shadows, wrinkles in background fabric.  
**Proposed:** Remove background from the front photo before sending as reference.

Use an external removal API (remove.bg, Clipdrop) or a lightweight WASM model. The result is a clean garment on a white/transparent background. This eliminates background noise from the reference image and forces Ideogram to focus on garment color and structure.

**Why this helps:** Ideogram's reference interpretation is distracted by non-garment elements. A clean garment silhouette on white gives Ideogram an unambiguous color and structure reference that directly matches the white seamless background in the prompt.

---

### 3. Run Claude analysis twice — second pass focused only on Ideogram prompt quality

**Current:** One Claude call produces name, description, colors, occasion, category, AND ideogramPrompt in a single pass at 1200 tokens.  
**Proposed:** A second Claude call receives only the photos and the first-pass description, and is asked exclusively to write a maximally detailed Ideogram prompt.

Second-pass prompt:
```
You are writing a photorealistic image generation prompt for a Pakistani fashion model photo.
You have already analyzed this garment. Here is your analysis: [description, colors, category]
Now write the Ideogram prompt with extreme precision.
For each garment zone, describe: fabric, color (with hex approximation if possible), embroidery motif and density, embroidery thread color, placement measurement, any mirror work or stonework.
Write the dupatta placement on the model's body explicitly.
Write the trouser/bottom visibility and cut explicitly.
State the model's pose, stance, hand position.
State the background and lighting setup.
```

**Why this helps:** The current prompt template gives Claude one shot to do both customer-facing description AND technical image generation prompt construction. These are completely different tasks. The ideogramPrompt is constrained to ~200 tokens because of the 1200 max token budget shared with five other fields. A dedicated 800-token ideogramPrompt would be 4× more detailed.

---

### 4. Use a structured zone-by-zone JSON for the prompt instead of a free-text string

**Current:** `ideogramPrompt` is an unstructured text string Claude writes freely.  
**Proposed:** Ask Claude to return a structured JSON with explicit fields per zone:

```json
{
  "garment_type": "three-piece chiffon suit",
  "zones": {
    "neckline": { "embroidery": "dense floral zardozi", "color": "gold", "extent": "4 inches down chest", "density": "heavy" },
    "chest": { "embroidery": "scattered floral motifs", "color": "gold", "density": "light" },
    "sleeves": { "embroidery": "cuff band 2 inches", "color": "gold", "density": "medium" },
    "hemline": { "embroidery": "none", "notes": "plain" },
    "dupatta": { "border": "4cm gold zari border", "body": "plain ivory chiffon", "drape": "over both shoulders" }
  },
  "fabric": "chiffon",
  "base_color": "ivory",
  "silhouette": "straight cut kameez knee length, wide leg trouser",
  "special_features": ["mirror work on cuffs"]
}
```

Then construct the Ideogram prompt programmatically from this structured data, ensuring no zone is omitted and each zone gets appropriate weight in the prompt.

**Why this helps:** Free-text prompts have inconsistent coverage. If Claude writes 3 sentences about the neckline and one word about the sleeves, Ideogram will allocate attention accordingly. A structured zone schema ensures every garment zone is explicitly represented in the final prompt.

---

### 5. Implement ControlNet-equivalent pose locking via Ideogram's style reference

**Current:** Every generation produces a different model pose, lighting, and presentation.  
**Proposed:** Maintain a curated set of "reference model photos" (full-body Pakistani model, front-facing, white background, standard pose) and use Ideogram's style reference feature to lock pose and model consistency.

This requires Ideogram's style image parameter (distinct from the content reference image). Separate the reference into:
- **Content reference (image_file):** the garment composite
- **Style reference:** a consistent model pose template

**Why this helps:** Consistent pose means embroidery placement descriptions in the prompt are spatially anchored. "Neckline extending 4 inches down chest" means the same thing in every generation. Currently, a 3/4-pose model and a front-facing model would render the same neckline description differently.

---

### 6. Implement a quality scoring loop

**Current:** One generation attempt, shown to Sam, she manually decides to regenerate.  
**Proposed:** Generate 2–3 candidates per request, run a Claude vision evaluation of each against the original garment photo, automatically select the best, surface the top result to Sam.

Evaluation prompt:
```
Compare this generated model photo to the reference garment photo.
Score from 1-10:
- Color accuracy
- Embroidery placement accuracy
- Silhouette accuracy
- Overall garment representation
Return JSON: {"color": 7, "embroidery": 4, "silhouette": 8, "overall": 6, "winner": true/false}
```

**Why this helps:** At 3 attempts per generation, even without changing the prompt, the best-of-3 result will be significantly better than a single attempt due to Ideogram's stochastic sampling. The evaluation loop removes Sam from having to manually judge accuracy.

---

### 7. Normalize photo quality before sending

**Current:** Raw device photos sent with variable white balance, exposure, and perspective.  
**Proposed:** Run a lightweight normalization pass:
- Auto-level white balance (identify the background color, shift to neutral)
- Perspective correction if garment is shot at an angle
- Crop to garment bounding box (remove excess background)

**Why this helps:** Color accuracy failures are frequently caused by camera white balance shifting ivory to cream or dusty rose to coral. Normalizing to a neutral background before sending to Ideogram ensures the reference color is closer to the true fabric color. This is implementable with Canvas API on the frontend or sharp on the backend.

---

### 8. Separate the "embroidery detail" and "silhouette" into different Ideogram calls

**Current:** One Ideogram call must simultaneously get the model, the silhouette, the base colors, and all embroidery details right.  
**Proposed:** Use Ideogram's inpainting/edit endpoint to build the image in layers:

1. First call: Generate model with correct silhouette and base fabric color. Low detail on embroidery.
2. Second call: Use the output of call 1 as the reference with high image_weight, add embroidery prompt focused exclusively on the specific zones where embroidery exists.

**Why this helps:** The conflicting demands (put this on a model + get every embroidery detail right) are separated. Step 1 locks the model and silhouette. Step 2 adds detail to an already-correct base. This is how professional image generation pipelines handle complex garments — layered generation rather than single-shot.

---

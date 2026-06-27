# FASHN Virtual Try-On — Evaluation Guide

## Purpose

Compare FASHN virtual try-on against Ideogram v4 remix on representative garments
before deciding whether to make FASHN the default provider.

---

## Setup

### 1. Get FASHN API Key

1. Create an account at fashn.ai
2. Go to Settings → API
3. Generate an API key
4. Add it to Vercel environment variables as `FASHN_API_KEY`

### 2. Upload a Model Photo (Settings → FASHN Model Photo)

FASHN requires a base model image to dress in the garment.

**For best results, use:**
- Full-length photo (head to toe)
- Pakistani/South Asian woman
- Neutral, relaxed standing pose — arms slightly away from body
- Studio background (white or plain)
- Front-facing
- Modest clothing on the model (FASHN will replace with the garment)

The model photo is stored in localStorage on the device. Re-upload if you change devices.

### 3. Select Provider

In the Generate AI Model Photo section, tap the **FASHN** pill to switch.
The weight slider is hidden (not used by FASHN).
Tap **Ideogram v4** to switch back.

---

## FASHN API Settings (current defaults)

| Parameter | Value | Notes |
|-----------|-------|-------|
| model_name | tryon-v1.6 | Latest production model |
| category | one-pieces | Full Pakistani suits → one-pieces |
| garment_photo_type | flat-lay | Our garment photos are flat-lays |
| mode | balanced | Speed/quality balance |
| segmentation_free | true | Improves garment extraction |
| num_samples | 1 | One image per request (cost control) |

---

## Test Garments

Run both providers on the same garment in the same session. Use the Provider Lab
(Settings → Provider Lab) to store results and compare scores.

### Recommended test set

| # | Garment Type | Why it's challenging |
|---|-------------|---------------------|
| 1 | Embroidered full suit | Tests embroidery preservation |
| 2 | Bird motif kameez | Tests motif placement accuracy |
| 3 | Floral print suit | Tests pattern color accuracy |
| 4 | Mirror work suit | Tests reflective embellishment |
| 5 | Bridal with heavy dupatta | Tests dupatta drape and color |
| 6 | Simple lawn suit | Baseline — should be easy for both |
| 7 | Formal suit with contrast border | Tests border color accuracy |
| 8 | Printed fabric (digital print) | Tests print reproduction |

---

## Scoring Criteria (1–5 scale)

Use the Provider Lab scoring panel after each generation.

| Criterion | What to check |
|-----------|--------------|
| Overall realism | Does it look like a real fashion photo? |
| Garment color accuracy | Do the colors match the original garment photo? |
| Embroidery accuracy | Is embroidery/stitching visible and in the right zone? |
| Motif accuracy | Are motifs (birds, florals, etc.) in the right placement? |
| Neckline accuracy | Does the neckline shape match the garment? |
| Sleeve accuracy | Are sleeve length and style correct? |
| Border accuracy | Are borders/hemlines in the right position and color? |
| Dupatta accuracy | Is the dupatta visible, correct color, proper drape? |
| Silhouette accuracy | Does the overall outfit silhouette match the garment? |
| Overall similarity | Overall: how closely does the model photo match the garment? |

---

## Migration Threshold

Switch FASHN to default only if:

1. Average score across all criteria ≥ 0.8 higher than Ideogram on the same garments
2. Embroidery accuracy specifically ≥ 1.0 higher
3. No significant regression in realism or silhouette

---

## Known Limitations

**FASHN async behavior:**
Generation takes ~15–60 seconds. The app polls every 3 seconds.
Do not navigate away from the generate screen while polling.

**Model photo dependency:**
FASHN requires a separate model photo. Ideogram does not.
Model photo is stored in localStorage — needs re-upload on new devices.

**Category mapping:**
Pakistani full suits (kameez + shalwar + dupatta) are mapped to `one-pieces`.
Tops and bottoms only → could use `tops` / `bottoms` but untested.

**Garment photo:**
FASHN always receives the original `products.photo` (garment flat-lay).
It never receives a previously generated model photo.

**Timeout:**
If generation exceeds 2 minutes, the app shows a timeout error.
This is a cost-safety measure — the prediction may still complete on FASHN's side.

---

## Issues Log

| Date | Issue | Status |
|------|-------|--------|
| (fill in during testing) | | |

---

## Preliminary Recommendation

**Not yet determined.** Run the test garment set and fill in scores above.

Expected hypothesis: FASHN will preserve embroidery and motif placement significantly
better than Ideogram, because FASHN uses the actual garment image as a geometric
constraint (virtual try-on) rather than as a loose style reference (Ideogram remix).

The key unknown is whether FASHN handles Pakistani full suits (one-pieces) well —
they are longer and more layered than typical Western one-piece garments.

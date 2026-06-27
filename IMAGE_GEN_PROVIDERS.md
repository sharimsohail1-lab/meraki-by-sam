# Image Generation Provider Research

Research compiled 2026-06-27. Do not migrate until objective benchmark scores demonstrate
a significant improvement over the current Ideogram pipeline.

---

## Current provider: Ideogram v4

Already integrated. The baseline all others are measured against.

| Attribute | Detail |
|-----------|--------|
| Type | Text-to-image + image-conditioned remix |
| Image conditioning | Yes — single reference image, `image_weight` 0–1 |
| Garment fidelity | Moderate — good color/silhouette, embroidery varies |
| Aspect ratio control | Yes — ASPECT_2_3 used |
| API | `/api/ideogram` proxy (POST JSON with base64 reference) |
| Pricing | Pay-per-generation (Ideogram v4 API pricing) |
| Licensing | Generated images owned by caller |
| Implementation complexity | Already done |

**Known limitations:** High `image_weight` reproduces flat-lay pose instead of placing garment on model. Embroidery detail accuracy depends heavily on prompt quality.

---

## Virtual Try-On / Fashion-Specific Providers

These are purpose-built for garment-on-model tasks rather than generic text-to-image.
They typically accept a garment image AND a model image as separate inputs.

### Fashn.ai

| Attribute | Detail |
|-----------|--------|
| Type | Virtual try-on (garment + model → dressed model) |
| Image conditioning | Yes — separate garment input + model input |
| Garment fidelity | High — preserves garment texture, embroidery, print |
| API | REST API, commercial |
| Pricing | Per-generation, subscription tiers available |
| Licensing | Caller owns output |
| Implementation complexity | Low — POST garment image + model image |

**Notes:** Designed specifically for e-commerce. Accepts any model photo (can reuse a fixed base model photo). Likely the highest garment-preservation accuracy of any commercial API. The model input means Sam can choose consistent model appearance.

**Migration path:** Add `FashnProvider` to `IMAGE_GEN_PROVIDERS`. Requires storing a base model photo (configurable in Settings). The `/api/ideogram` proxy needs a companion `/api/fashn` proxy.

### Replicate — hosted VTON models

Replicate hosts multiple open-source virtual try-on models as deployable endpoints:

- **IDM-VTON** (Improved Diffusion Model for Virtual Try-On) — high garment fidelity, widely tested
- **CatVTON** — category-conditioned, good for traditional clothing
- **StableVITON** — Stable Diffusion based, fast

| Attribute | Detail |
|-----------|--------|
| Type | Virtual try-on (garment + model) |
| Image conditioning | Garment image + model image, separate inputs |
| Garment fidelity | High for IDM-VTON, very good embroidery preservation |
| API | Replicate REST API, `replicate.run(model_version, input)` |
| Pricing | ~$0.05–0.20 per generation depending on model |
| Licensing | Model-dependent (most are Apache 2.0 / CC) |
| Implementation complexity | Low — Replicate has a clean API |

**Notes:** IDM-VTON specifically was trained on diverse clothing including ethnic wear. May handle embroidery/print better than Ideogram remix. Requires a base model photo.

**Migration path:** New `/api/replicate` Vercel proxy. `ReplicateVTONProvider` in provider registry.

### Revery.ai

| Attribute | Detail |
|-----------|--------|
| Type | Fashion-specific try-on platform |
| Image conditioning | Garment image + model selection |
| Garment fidelity | High — explicitly designed for e-commerce product photos |
| API | Commercial REST API |
| Pricing | Enterprise / per-call pricing |
| Licensing | Platform-dependent |
| Implementation complexity | Medium — may require model catalog |

**Notes:** More enterprise-focused. May have minimum volume requirements. Worth evaluating if Fashn.ai is not sufficient.

---

## General Text-to-Image Providers

These do not natively accept a model+garment input; they rely entirely on prompt accuracy.
Lower garment fidelity for complex embroidery than virtual try-on providers.

### Flux (Black Forest Labs)

| Attribute | Detail |
|-----------|--------|
| Type | Text-to-image, image-conditioned (Flux Redux variant) |
| Image conditioning | Yes — Flux Redux accepts a reference image |
| Garment fidelity | Good prompt following, higher realism than Ideogram |
| API | Via Replicate or BFL direct API |
| Pricing | ~$0.03–0.05 per image |
| Licensing | Output owned by caller |
| Implementation complexity | Low |

**Notes:** Flux 1.1 Pro Ultra + Redux variant supports image conditioning. Better photorealism than Ideogram. Still prompt-dependent for embroidery detail. Worth benchmarking.

**Migration path:** `FluxProvider` calling `/api/replicate` or `/api/flux`. Image conditioning via `redux` endpoint with reference image.

### Google Imagen 3 / Imagen 3 Fast

| Attribute | Detail |
|-----------|--------|
| Type | Text-to-image |
| Image conditioning | Limited — no direct garment reference mode as of research date |
| Garment fidelity | Very high photorealism but prompt-only garment description |
| API | Vertex AI / Google Cloud |
| Pricing | Per image, Vertex AI pricing |
| Licensing | Caller owns output under Google ToS |
| Implementation complexity | High — requires GCP service account, Vertex AI setup |

**Notes:** Best-in-class photorealism but no image conditioning for garments. Not a good fit for this use case unless combined with a try-on layer.

---

## Recommendation Matrix

| Provider | Garment Fidelity | Embroidery Accuracy | Model Realism | Implementation Effort | Priority |
|----------|-----------------|---------------------|---------------|----------------------|----------|
| Ideogram v4 (current) | Moderate | Moderate | Good | Done | Baseline |
| Fashn.ai | Very High | Very High | Good | Low | **Test first** |
| Replicate IDM-VTON | High | High | Good | Low | **Test second** |
| Flux Redux | Good | Prompt-dependent | Very High | Low | Test third |
| Replicate CatVTON | High | High | Moderate | Low | Optional |
| Google Imagen 3 | Prompt-only | Prompt-only | Best | High | Skip for now |

---

## What "significant improvement" means before migrating

Switch from Ideogram only if a challenger provider achieves, on the benchmark garment set:

- Average score across all 10 criteria ≥ 0.8 points higher than Ideogram
- Embroidery accuracy specifically ≥ 1 point higher
- No regression in overall realism or silhouette accuracy

These thresholds can be adjusted. The benchmark framework in the app stores scores to measure against them.

---

## Adding a new provider

1. Create `/api/<provider>.js` Vercel function (proxy to provider API)
2. In `index.html`, call `registerImageGenProvider('id', { id, label, generate(prompt, refB64, weight) })` anywhere after the provider registry block
3. The Settings provider selector and Lab benchmark UI will automatically include the new provider
4. Run benchmark garments through it and score before switching Sam's active provider

No other app code needs to change.

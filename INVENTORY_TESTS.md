# Size Inventory — Manual Test Checklist

Run these after any change to size inventory logic, catalog rendering, or product status.

---

## 1. New product with sizes

1. Tap **Add New Piece** → Step 1
2. Set sizes: S:1, M:2, L:1 using the steppers
3. Confirm "Total available: 4" note appears
4. Complete intake and save
5. Open **Stock** → find the product
6. Confirm stock card shows: `S ×1 · M ×2 · L ×1`
7. Confirm status pill shows **available**

---

## 2. Old product without sizes

1. Open any product created before the size_inventory migration
2. Confirm Product Detail opens without errors
3. Confirm size steppers show all zeros (no crash)
4. Confirm stock card shows no size summary (only status pill)
5. Confirm it still appears under the Available filter if status = available
6. Save without touching sizes — confirm it stays available

---

## 3. Selling one unit (multi-size product)

1. Open product with S:1, M:2, L:1
2. Tap **Sold** button
3. Confirm picker sheet appears: "Which size was sold?" with buttons S, M, L
4. Tap **M**
5. Confirm M count drops to 1
6. Confirm status remains **available**
7. Confirm stock card shows `S ×1 · M ×1 · L ×1`
8. Confirm "Total available: 3" in detail steppers

---

## 4. Selling the final unit

1. Continue from test 3 (or set product to S:0, M:1, L:0)
2. Tap **Sold** → tap M (or only size available)
3. Confirm status auto-changes to **sold**
4. Confirm sold_at is set
5. Confirm stock card shows **Sold Out** size summary
6. Confirm product appears under Sold filter, not Available filter

---

## 5. Restoring stock on a sold product

1. Open a product with status=sold and size_inventory all zeros
2. In the Edit Sizes steppers, set M:1
3. Tap **Save Changes**
4. Confirm status changes back to **available**
5. Confirm stock card shows `M ×1`
6. Confirm product re-appears under Available filter

---

## 6. Catalog sold stamp

1. Open a sold-out product (all sizes = 0 or status = sold)
2. Open its collection → Create Catalog
3. Confirm sold-out product is unchecked by default ("Sold out — excluded by default")
4. Manually check it → tap Preview
5. Confirm product page shows SOLD stamp over the image
6. Confirm "Sold Out" text appears under the price
7. Confirm no available sizes are shown

---

## 7. Catalog available sizes

1. Open a product with S:1, M:2 available
2. Include it in a catalog preview
3. Confirm "Sizes: S · M" appears under the price
4. Confirm XS, L, XL, XXL (all zero) do not appear

---

## 8. Home count (smart recommendations)

1. On Home, check the "ready to share" or "needs price" counts
2. Mark one product as sold out (sell all sizes)
3. Return to Home
4. Confirm the sold-out product is no longer counted as available
5. Confirm the count decreased by 1

---

## 9. Product Detail — edit sizes

1. Open any product from Stock
2. Scroll to Sizes section in Product Detail
3. Confirm all 6 sizes (XS–XXL) show with current counts
4. Increment M by 1 → confirm "Total available" note updates
5. Decrement XS below 0 → confirm it stays at 0
6. Tap **Save Changes**
7. Confirm sizes saved correctly by reopening the product

---

## 10. Collections available count

1. Open Collections from Home or Stock
2. Check the "X available" count shown on a collection card
3. Sell out one product in the collection
4. Re-open Collections
5. Confirm available count decreased by 1

---

## Rules reminder

- `size_inventory` is the source of truth when present
- `status` field is the source of truth for old products without `size_inventory`
- Reserved status is never auto-changed by size edits
- Counts can never go below 0
- `normalizeSizeInventory()` is always called before saving size data

-- One-time cleanup of garment-detail capitalisation already in the database.
--
-- The app now capitalises these values as it saves them, but that only reaches
-- a piece when Saima opens and saves it. Everything entered before then is
-- still stored as it was typed — "gold", "silk", "navy blue" — and the
-- storefront prints what it is given. This rewrites the history once.
--
-- THE RULE, identical to normalizeGarmentValue() in the app:
--
--   trim the value
--   if what remains begins with A-Z or a-z, uppercase that one character
--   leave everything after it exactly as it was
--
-- Sentence case and nothing else. Not title case: "navy blue" is a colour and
-- "Navy Blue" is a brand name, and "made in Lahore" must not become "Made In
-- Lahore". Caps already typed are kept, because LAHORE is a decision. A value
-- that does not start with a letter is trimmed and otherwise left alone, so
-- "100% cotton" stays as written.
--
-- IDEMPOTENT: the rule is a fixed point. "Gold" trims to "Gold", starts with a
-- letter, and uppercasing an already-uppercase character changes nothing. Run
-- this file, or this statement, as many times as you like.
--
-- SAFETY: only products.garment_details and the five legacy mirror columns are
-- written. Every other column is untouched by construction — they are not named
-- in the SET clause. Ids, SKUs, slugs, slug aliases, prices, stock, images,
-- collections, availability and descriptions cannot move.
--
-- SHAPE: keys, key order within a descriptor, value order, and every `show`
-- flag are preserved. Descriptors are never added or removed. A value that
-- trims to nothing is dropped from its array — which is what the app does on
-- read and on save, and what the storefront does when it projects — but the
-- descriptor itself stays, even if that leaves it with an empty list.
--
-- MALFORMED ROWS: nothing is assumed about shape. A row whose garment_details
-- is null or not an object is skipped. A descriptor that is not an object, or
-- whose `values` is not an array, is passed through untouched. A non-string
-- element inside `values` is passed through untouched. Only strings are
-- rewritten.
--
-- EVERY PRODUCT: drafts, hidden, published and archived alike. The stored data
-- should be consistent whatever the piece's publication state, and an archived
-- piece can be restored later.
--
-- NOTE: /api/migrate splits this file on the semicolon character. Do not use DO
-- blocks or function bodies here, and keep semicolons out of comments. Every
-- statement below must stand alone.

-- 1. The canonical column.
--
-- Read bottom-up: elements are normalised, re-aggregated in their original
-- order into a values array, folded back into their descriptor beside its
-- untouched other members, and the descriptors re-aggregated into the object.
UPDATE products AS p
SET garment_details = fixed.details
FROM (
  SELECT d.id,
         jsonb_object_agg(d.key, d.descriptor) AS details
  FROM (
    SELECT prod.id,
           each.key,
           CASE
             WHEN jsonb_typeof(each.value) <> 'object'
               OR jsonb_typeof(each.value -> 'values') <> 'array'
             THEN each.value
             ELSE jsonb_set(each.value, '{values}', COALESCE(vals.arr, '[]'::jsonb))
           END AS descriptor
    FROM products AS prod
    CROSS JOIN LATERAL jsonb_each(prod.garment_details) AS each
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(elem.fixed ORDER BY elem.ord) AS arr
      FROM (
        SELECT e.ord,
               CASE
                 WHEN jsonb_typeof(e.val) <> 'string' THEN e.val
                 WHEN btrim(e.val #>> '{}') ~ '^[A-Za-z]'
                   THEN to_jsonb(upper(left(btrim(e.val #>> '{}'), 1)) || substr(btrim(e.val #>> '{}'), 2))
                 ELSE to_jsonb(btrim(e.val #>> '{}'))
               END AS fixed
        -- The guard lives on the argument, not on the CASE above: a lateral is
        -- evaluated whether or not its result is used, so handing
        -- jsonb_array_elements a scalar would fail the whole statement on the
        -- first malformed row rather than skipping it.
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(each.value) = 'object'
                     AND jsonb_typeof(each.value -> 'values') = 'array'
                    THEN each.value -> 'values'
                    ELSE '[]'::jsonb
               END
             ) WITH ORDINALITY AS e(val, ord)
        WHERE jsonb_typeof(e.val) <> 'string' OR btrim(e.val #>> '{}') <> ''
      ) AS elem
    ) AS vals ON true
    WHERE jsonb_typeof(prod.garment_details) = 'object'
  ) AS d
  GROUP BY d.id
) AS fixed
WHERE p.id = fixed.id AND p.garment_details IS DISTINCT FROM fixed.details;

-- 2. The five legacy scalar mirrors, rebuilt from the values just written.
--
-- Exactly _buildLegacyMirrors() in the app: a descriptor that has values and is
-- not switched off prints them joined with ", ", and anything else prints
-- empty. `show` is absent-means-visible, matching getGarmentSpecs(), so only an
-- explicit false blanks a mirror.
--
-- Derived from the canonical column in the same file as the canonical rewrite,
-- so the two cannot end up disagreeing about a value's capitalisation.
UPDATE products AS p
SET fabric = COALESCE(m.fabric, ''),
    pieces = COALESCE(m.pieces, ''),
    color  = COALESCE(m.color,  ''),
    made   = COALESCE(m.made,   ''),
    care   = COALESCE(m.care,   '')
FROM (
  SELECT prod.id,
         max(j.txt) FILTER (WHERE k.key = 'fabric') AS fabric,
         max(j.txt) FILTER (WHERE k.key = 'pieces') AS pieces,
         max(j.txt) FILTER (WHERE k.key = 'color')  AS color,
         max(j.txt) FILTER (WHERE k.key = 'made')   AS made,
         max(j.txt) FILTER (WHERE k.key = 'care')   AS care
  FROM products AS prod
  CROSS JOIN LATERAL (VALUES ('fabric'), ('pieces'), ('color'), ('made'), ('care')) AS k(key)
  CROSS JOIN LATERAL (
    SELECT CASE
             WHEN jsonb_typeof(prod.garment_details -> k.key) <> 'object' THEN ''
             WHEN COALESCE(prod.garment_details -> k.key ->> 'show', 'true') = 'false' THEN ''
             WHEN jsonb_typeof(prod.garment_details -> k.key -> 'values') <> 'array' THEN ''
             ELSE COALESCE((
               SELECT string_agg(a.v #>> '{}', ', ' ORDER BY a.o)
               FROM jsonb_array_elements(prod.garment_details -> k.key -> 'values') WITH ORDINALITY AS a(v, o)
             ), '')
           END AS txt
  ) AS j
  WHERE jsonb_typeof(prod.garment_details) = 'object'
  GROUP BY prod.id
) AS m
WHERE p.id = m.id;

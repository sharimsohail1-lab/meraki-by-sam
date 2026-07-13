// FASHN virtual try-on API proxy.
// POST  /api/fashn  { model_image, garment_image, category?, mode?, garment_photo_type? }
//   → { id: "pred_xxx" }          (prediction started; client polls for status)
// GET   /api/fashn?id=pred_xxx
//   → { id, status, output_url? }   (output_url present only when completed)
//
// Auth: FASHN_API_KEY environment variable (never exposed to frontend).

const FASHN_BASE  = 'https://api.fashn.ai/v1';
const FASHN_BUILD = '86b95af-size-guard-v2';        // bump on every deploy; proves which code ran
const POLL_RESPONSE_LIMIT_BYTES = 100_000;

// All GET responses go through here.  The payload is serialized once, measured, and
// sent as a raw string so the byte count Vercel sees matches the count logged here.
function sendPollResponse(res, statusCode, payload, branch) {
  const body          = JSON.stringify(payload);
  const responseBytes = Buffer.byteLength(body, 'utf8');

  console.log('[fashn poll] SEND', {
    build: FASHN_BUILD,
    branch,
    statusCode,
    keys: Object.keys(payload),
    responseBytes
  });

  res.setHeader('Content-Type',              'application/json; charset=utf-8');
  res.setHeader('Cache-Control',             'no-store, no-cache, must-revalidate');
  res.setHeader('CDN-Cache-Control',         'no-store');
  res.setHeader('Vercel-CDN-Cache-Control',  'no-store');

  if (responseBytes > POLL_RESPONSE_LIMIT_BYTES) {
    console.error('[fashn poll] GUARD_TRIGGERED', {
      build: FASHN_BUILD,
      branch,
      responseBytes,
      limit: POLL_RESPONSE_LIMIT_BYTES
    });
    const fallback = JSON.stringify({
      status: 'failed',
      error:  'The generation result was unexpectedly large.',
      _build: FASHN_BUILD
    });
    return res.status(502).send(fallback);
  }

  return res.status(statusCode).send(body);
}

// Extracts a safe short string from any FASHN error value; never embeds the raw body.
function safeErr(raw, upstreamStatus) {
  if (!raw)                              return `FASHN error (HTTP ${upstreamStatus})`;
  if (typeof raw === 'string')           return raw.slice(0, 300);
  if (typeof raw !== 'object')           return `FASHN error (HTTP ${upstreamStatus})`;
  const msg = raw.message || raw.detail || raw.error;
  if (typeof msg === 'string')           return msg.slice(0, 300);
  return `FASHN error (HTTP ${upstreamStatus})`;
}

export default async function handler(req, res) {
  // Log build marker and method at the absolute start of every invocation.
  console.log('[fashn] BUILD', FASHN_BUILD, { method: req.method, urlLength: req.url?.length });

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FASHN_API_KEY not configured' });

  const authHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type':  'application/json'
  };

  // ── GET: poll prediction status ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id, _rid } = req.query;
    // Entry log — if BUILD appears in Vercel logs for a 413 invocation but this
    // line does NOT, the request was rejected before the GET branch was reached.
    console.log('[fashn poll] ENTRY', {
      build: FASHN_BUILD,
      rid:   _rid || 'none',
      id:    id   || 'missing',
      queryKeys: Object.keys(req.query).join(',')
    });

    if (!id) {
      return sendPollResponse(res, 400, { status: 'failed', error: 'Missing prediction id', _build: FASHN_BUILD }, 'missing-id');
    }

    try {
      console.log('[fashn poll] fetching upstream', { build: FASHN_BUILD, rid: _rid || 'none', id });

      const r = await fetch(`${FASHN_BASE}/status/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const upstreamContentType   = r.headers.get('content-type')   || 'unknown';
      const upstreamContentLength = r.headers.get('content-length') || 'unknown';
      console.log('[fashn poll] upstream headers', {
        build:               FASHN_BUILD,
        rid:                 _rid || 'none',
        id,
        upstreamStatus:      r.status,
        upstreamContentType,
        upstreamContentLength
      });

      // Read body into memory but never forward the raw object.
      const data = await r.json();

      // Log shape only — never log output values.
      const _outputSample = Array.isArray(data.output) ? data.output[0] : data.output;
      const _outputType   = (() => {
        if (!_outputSample)                                      return 'absent';
        if (typeof _outputSample !== 'string')                   return typeof _outputSample;
        if (_outputSample.startsWith('data:'))                   return 'base64-data-url';
        if (_outputSample.startsWith('https://'))                return 'https-url';
        return 'unknown-string';
      })();
      console.log('[fashn poll] upstream body', {
        build:        FASHN_BUILD,
        rid:          _rid || 'none',
        jobStatus:    data.status,
        outputType:   _outputType,
        outputLength: _outputSample?.length ?? 'n/a',
        outputPrefix: typeof _outputSample === 'string' ? _outputSample.slice(0, 60) : 'n/a',
        topLevelKeys: Object.keys(data).join(',')
      });

      // ── upstream non-2xx ─────────────────────────────────────────────────────
      if (!r.ok) {
        const errStr = safeErr(data?.error ?? data?.detail, r.status);
        return sendPollResponse(res, 502,
          { status: 'failed', upstream_status: r.status, error: errStr, _build: FASHN_BUILD },
          'upstream-error');
      }

      // ── completed ────────────────────────────────────────────────────────────
      if (data.status === 'completed') {
        const _raw      = Array.isArray(data.output) ? data.output[0] : data.output;
        const _isStr    = typeof _raw === 'string';
        const _isData   = _isStr && _raw.startsWith('data:');
        const _isHttps  = _isStr && _raw.startsWith('https://') && _raw.length < 4096;

        console.log('[fashn poll] completed shape', {
          build:    FASHN_BUILD,
          rid:      _rid || 'none',
          isString: _isStr,
          isDataUrl: _isData,
          isHttpsUrl: _isHttps,
          rawLength: _raw?.length ?? 'n/a'
        });

        if (_isData) {
          const _mime = (_raw.match(/^data:([^;]+);base64,/) || [])[1] ?? 'unknown';
          console.error('[fashn poll] base64 output', { build: FASHN_BUILD, rid: _rid || 'none', mime: _mime, length: _raw.length });
          return sendPollResponse(res, 200,
            { id: data.id, status: 'failed', error: `FASHN returned base64 image (${_mime}, ${_raw.length} chars) instead of a URL. Please try again.`, _build: FASHN_BUILD },
            'completed-base64');
        }

        if (!_isHttps) {
          const _prefix = _isStr ? _raw.slice(0, 60) : typeof _raw;
          console.error('[fashn poll] unexpected output format', { build: FASHN_BUILD, rid: _rid || 'none', prefix: _prefix });
          return sendPollResponse(res, 502,
            { status: 'failed', error: 'FASHN returned an unexpected output format. Please try again.', _build: FASHN_BUILD },
            'completed-bad-format');
        }

        // Validated HTTPS CDN URL — construct response from primitives only.
        const outputUrl = String(_raw);
        console.assert(typeof outputUrl === 'string' && outputUrl.startsWith('https://') && outputUrl.length < 4096, 'output_url assertion failed');
        return sendPollResponse(res, 200,
          { id: String(data.id), status: 'completed', output_url: outputUrl, _build: FASHN_BUILD },
          'completed-ok');
      }

      // ── failed ───────────────────────────────────────────────────────────────
      if (data.status === 'failed') {
        return sendPollResponse(res, 200,
          { id: String(data.id), status: 'failed', error: safeErr(data.error, r.status), _build: FASHN_BUILD },
          'job-failed');
      }

      // ── processing / queued / starting ───────────────────────────────────────
      return sendPollResponse(res, 200,
        { id: String(data.id), status: data.status, _build: FASHN_BUILD },
        'in-progress');

    } catch (err) {
      console.error('[fashn poll] CATCH', { build: FASHN_BUILD, rid: _rid || 'none', err: err.message });
      return sendPollResponse(res, 500, { status: 'failed', error: err.message, _build: FASHN_BUILD }, 'catch');
    }
  }

  // ── POST: start prediction ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { model_image, garment_image, category, mode, garment_photo_type } = req.body;

    if (!model_image || !garment_image) {
      return res.status(400).json({ error: 'model_image and garment_image are required' });
    }

    const resolvedCategory = (category === 'auto' || !category) ? 'tops' : category;

    // Redacted diagnostics — never logs base64 content.
    const _mimeOf = v => (typeof v === 'string'
      ? (v.match(/^data:([^;]+);base64,/) || [])[1]
          ?? (v.startsWith('https://') ? 'https-url' : v.startsWith('blob:') ? 'blob-url' : 'unknown')
      : typeof v);
    console.log('[fashn] received payload fields:', {
      model_image:   { type: typeof model_image,   mime: _mimeOf(model_image),   prefix: model_image?.slice(0,32),   length: model_image?.length },
      garment_image: { type: typeof garment_image, mime: _mimeOf(garment_image), prefix: garment_image?.slice(0,32), length: garment_image?.length },
      category:      resolvedCategory,
      garment_photo_type: garment_photo_type || 'flat-lay',
      mode:          mode || 'balanced',
    });

    try {
      const payload = {
        model_name: 'tryon-v1.6',
        inputs: {
          model_image,
          garment_image,
          category:           resolvedCategory,
          garment_photo_type: garment_photo_type || 'flat-lay',
          mode:               mode || 'balanced',
          segmentation_free:  true,
          num_samples:        1
        }
      };

      console.log('[fashn] upstream payload fields:', {
        model_name: payload.model_name,
        inputs: {
          model_image:   { mime: _mimeOf(payload.inputs.model_image),   length: payload.inputs.model_image?.length },
          garment_image: { mime: _mimeOf(payload.inputs.garment_image), length: payload.inputs.garment_image?.length },
          category:      payload.inputs.category,
          garment_photo_type: payload.inputs.garment_photo_type,
          mode:          payload.inputs.mode,
        }
      });

      const r = await fetch(`${FASHN_BASE}/run`, {
        method:  'POST',
        headers: authHeaders,
        body:    JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) {
        console.error('[fashn] run failed:', r.status, 'keys:', Object.keys(data), JSON.stringify(data));
        return res.status(r.status).json(data);
      }
      console.log('[fashn] Prediction started:', data.id);
      return res.status(200).json({ id: data.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

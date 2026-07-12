// FASHN virtual try-on API proxy.
// POST  /api/fashn  { model_image, garment_image, category?, mode?, garment_photo_type? }
//   → { id: "pred_xxx" }          (prediction started; client polls for status)
// GET   /api/fashn?id=pred_xxx
//   → { id, status, output?, error? }   (output is array of CDN image URLs when completed)
//
// Auth: FASHN_API_KEY environment variable (never exposed to frontend).

const FASHN_BASE = 'https://api.fashn.ai/v1';
const POLL_RESPONSE_LIMIT_BYTES = 100_000;

// Routes every polling GET response through one place: measures size, logs safely,
// and hard-refuses to send anything over the limit so Vercel never sees a large body.
function sendPollResponse(res, statusCode, payload, meta) {
  const responseBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  console.log('[fashn poll] sending', {
    ...meta,
    statusCode,
    keys: Object.keys(payload),
    responseBytes
  });
  if (responseBytes > POLL_RESPONSE_LIMIT_BYTES) {
    console.error('[fashn poll] PAYLOAD_TOO_LARGE — refusing to send', {
      ...meta,
      responseBytes,
      limit: POLL_RESPONSE_LIMIT_BYTES
    });
    return res.status(502).json({ status: 'failed', error: 'The generation result was unexpectedly large and could not be returned safely.' });
  }
  return res.status(statusCode).json(payload);
}

// Extracts a safe short string from any FASHN error field.
function safeErrorString(raw, upstreamStatus) {
  if (!raw) return `FASHN upstream error (status ${upstreamStatus})`;
  if (typeof raw === 'string') return raw.slice(0, 300);
  if (typeof raw === 'object' && raw !== null) {
    const msg = raw.message || raw.detail || raw.error;
    if (typeof msg === 'string') return msg.slice(0, 300);
    return `FASHN error (status ${upstreamStatus})`;
  }
  return `FASHN error (status ${upstreamStatus})`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FASHN_API_KEY not configured' });

  const authHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // ── GET: poll prediction status ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id, _rid } = req.query;
    // Entry-point log — if this appears in Vercel logs alongside a 413, the function
    // ran and the oversized response came from within the handler. If 413 appears but
    // this log does not, Vercel's edge rejected before invocation.
    console.log('[fashn poll] ENTRY | rid:', _rid || 'none', '| id:', id || 'missing', '| query keys:', Object.keys(req.query).join(','));
    if (!id) return res.status(400).json({ error: 'Missing prediction id' });
    try {
      console.log('[fashn poll] fetching upstream | rid:', _rid || 'none', '| id:', id);
      const r = await fetch(`${FASHN_BASE}/status/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const upstreamContentType   = r.headers.get('content-type') || 'unknown';
      const upstreamContentLength = r.headers.get('content-length') || 'unknown';
      console.log('[fashn poll] upstream response | rid:', _rid || 'none', '| id:', id,
        '| upstream status:', r.status,
        '| content-type:', upstreamContentType,
        '| content-length:', upstreamContentLength);

      // Parse the upstream body but never include it in any client response.
      const data = await r.json();

      // Log response shape without exposing output data.
      const _outputSample = Array.isArray(data.output) ? data.output[0] : data.output;
      const _outputType = Array.isArray(data.output)
        ? (_outputSample?.startsWith?.('data:') ? 'base64-data-url' : 'url-array')
        : (typeof _outputSample === 'string'
            ? (_outputSample.startsWith('data:') ? 'base64-data-url' : 'url-string')
            : typeof _outputSample);
      console.log('[fashn poll] upstream body | rid:', _rid || 'none',
        '| status:', data.status,
        '| output type:', _outputType,
        '| output length:', _outputSample?.length ?? 'n/a',
        '| output prefix:', typeof _outputSample === 'string' ? _outputSample.slice(0, 60) : 'n/a',
        '| response keys:', Object.keys(data).join(','));

      // Upstream returned a non-2xx — send only a minimal safe error, never the body.
      if (!r.ok) {
        const errStr = safeErrorString(data?.error || data?.detail, r.status);
        return sendPollResponse(res, 502, { status: 'failed', upstream_status: r.status, error: errStr },
          { rid: _rid || 'none', branch: 'upstream-error', upstreamStatus: r.status });
      }

      // ── completed ────────────────────────────────────────────────────────────
      if (data.status === 'completed') {
        // Extract the output value. FASHN may return an array or a plain string.
        const _raw = Array.isArray(data.output) ? data.output[0] : data.output;
        const _isString  = typeof _raw === 'string';
        const _isDataUrl = _isString && _raw.startsWith('data:');
        const _isHttpsUrl = _isString && _raw.startsWith('https://') && _raw.length < 4096;

        console.log('[fashn poll] completed | rid:', _rid || 'none',
          '| output is string:', _isString,
          '| is data url:', _isDataUrl,
          '| is https url:', _isHttpsUrl,
          '| raw length:', _raw?.length ?? 'n/a');

        if (_isDataUrl) {
          // FASHN returned base64 image bytes instead of a CDN URL — cannot proxy safely.
          const _mime = (_raw.match(/^data:([^;]+);base64,/) || [])[1] ?? 'unknown';
          console.error('[fashn poll] base64 output — mime:', _mime, '| length:', _raw.length);
          return sendPollResponse(res, 200,
            { id: data.id, status: 'failed', error: `FASHN returned image as base64 (${_mime}, ${_raw.length} chars) instead of a URL. Please try again.` },
            { rid: _rid || 'none', branch: 'completed-base64', mime: _mime, rawLen: _raw.length });
        }

        if (!_isHttpsUrl) {
          const _prefix = _isString ? _raw.slice(0, 60) : typeof _raw;
          console.error('[fashn poll] unexpected output format | rid:', _rid || 'none', '| prefix:', _prefix);
          return sendPollResponse(res, 502,
            { status: 'failed', error: 'FASHN returned an unexpected output format. Please try again.' },
            { rid: _rid || 'none', branch: 'completed-bad-format', prefix: _prefix });
        }

        // Normal case: valid short HTTPS CDN URL.
        return sendPollResponse(res, 200,
          { id: data.id, status: 'completed', output_url: _raw },
          { rid: _rid || 'none', branch: 'completed-ok', outputUrlLen: _raw.length });
      }

      // ── failed ───────────────────────────────────────────────────────────────
      if (data.status === 'failed') {
        const errStr = safeErrorString(data.error, r.status);
        return sendPollResponse(res, 200,
          { id: data.id, status: 'failed', error: errStr },
          { rid: _rid || 'none', branch: 'failed' });
      }

      // ── processing / queued / starting ───────────────────────────────────────
      return sendPollResponse(res, 200,
        { id: data.id, status: data.status },
        { rid: _rid || 'none', branch: 'in-progress', upstreamStatus: data.status });

    } catch (err) {
      console.error('[fashn poll] catch | rid:', _rid || 'none', '| err:', err.message);
      return res.status(500).json({ status: 'failed', error: err.message });
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
    const _mimeOf = v => (typeof v === 'string' ? (v.match(/^data:([^;]+);base64,/) || [])[1] ?? (v.startsWith('https://') ? 'https-url' : v.startsWith('blob:') ? 'blob-url' : 'unknown') : typeof v);
    console.log('[fashn] received payload fields:', {
      model_image:    { type: typeof model_image,   mime: _mimeOf(model_image),   prefix: model_image?.slice(0,32),   length: model_image?.length,   hasWhitespace: typeof model_image === 'string' && /\s/.test(model_image.slice(32)) },
      garment_image:  { type: typeof garment_image, mime: _mimeOf(garment_image), prefix: garment_image?.slice(0,32), length: garment_image?.length, hasWhitespace: typeof garment_image === 'string' && /\s/.test(garment_image.slice(32)) },
      category:       resolvedCategory,
      garment_photo_type: garment_photo_type || 'flat-lay',
      mode:           mode || 'balanced',
    });

    try {
      const payload = {
        model_name: 'tryon-v1.6',
        inputs: {
          model_image,
          garment_image,
          category: resolvedCategory,
          garment_photo_type: garment_photo_type || 'flat-lay',
          mode: mode || 'balanced',
          segmentation_free: true,
          num_samples: 1
        }
      };

      console.log('[fashn] upstream payload fields:', {
        model_name: payload.model_name,
        inputs: {
          model_image:    { mime: _mimeOf(payload.inputs.model_image),   length: payload.inputs.model_image?.length },
          garment_image:  { mime: _mimeOf(payload.inputs.garment_image), length: payload.inputs.garment_image?.length },
          category:       payload.inputs.category,
          garment_photo_type: payload.inputs.garment_photo_type,
          mode:           payload.inputs.mode,
        }
      });

      const r = await fetch(`${FASHN_BASE}/run`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) {
        // Return the complete FASHN error response so the client can log all fields.
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

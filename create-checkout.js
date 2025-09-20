// netlify/functions/create-checkout.js
// Unified: accepts { type: 'personal'|'premium' } OR legacy { product: 'personal'|'premium' }
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const json = (status, obj) => ({
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST')   return json(405, { error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');

    // NEW param 'type', fallback to legacy 'product'
    const t = String(body.type || body.product || '').toLowerCase();
    if (!t || !['personal', 'premium'].includes(t)) {
      return json(400, { error: 'Unknown product type' });
    }

    // Resolve price from env
    const price =
      t === 'premium'
        ? process.env.STRIPE_PRICE_PREMIUM
        : process.env.STRIPE_PRICE_PERSONAL;

    if (!price) {
      return json(400, { error: 'Missing Stripe price env var' });
    }

    // Determine origin for success/cancel urls (works for prod/preview/local)
    const originHeader = event.headers.origin || '';
    const hostHeader   = event.headers.host || '';
    const origin = (body.origin || (originHeader ? originHeader : `https://${hostHeader}`)).replace(/\/$/, '');

    const score = body.score ?? '';
    const band  = body.band ?? '';
    const flags = body.flags ?? '';
    const email = body.email || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/success.html?product=${encodeURIComponent(t)}&session_id={CHECKOUT_SESSION_ID}&score=${encodeURIComponent(score)}&band=${encodeURIComponent(band)}&flags=${encodeURIComponent(flags)}`,
      cancel_url:  `${origin}/index.html`,
      client_reference_id: t,
      customer_email: email,
      metadata: { score: String(score), band: String(band), flags: String(flags), product: t },
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      customer_creation: 'always',
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('[create-checkout] error:', err);
    return json(500, { error: 'Failed to create checkout session' });
  }
};

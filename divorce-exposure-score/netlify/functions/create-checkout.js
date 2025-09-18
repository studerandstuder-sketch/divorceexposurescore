const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { product, score, band, flags, email } = JSON.parse(event.body || '{}');
    if (!product) return { statusCode: 400, body: JSON.stringify({ error: 'Missing product' }) };
    const priceId = product === 'premium' ? process.env.STRIPE_PRICE_PREMIUM : process.env.STRIPE_PRICE_PERSONAL;
    if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing price id env var' }) };

    const originHeader = event.headers.origin || '';
    const hostHeader = event.headers.host || '';
    const origin = (originHeader ? originHeader : `https://${hostHeader}`).replace(/\/$/, '');

    const success_url = `${origin}/success.html?product=${encodeURIComponent(product)}&session_id={CHECKOUT_SESSION_ID}&score=${encodeURIComponent(score||'')}&band=${encodeURIComponent(band||'')}&flags=${encodeURIComponent(flags||'')}`;
    const cancel_url = `${origin}/index.html`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      client_reference_id: product,
      customer_email: email || undefined,
      metadata: { score: String(score||''), band: String(band||''), flags: String(flags||''), product }
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
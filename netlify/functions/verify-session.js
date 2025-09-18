const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { session_id } = event.queryStringParameters || {};
    if (!session_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session && session.payment_status === 'paid';
    return { statusCode: 200, body: JSON.stringify({ paid, product: session.client_reference_id || '' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
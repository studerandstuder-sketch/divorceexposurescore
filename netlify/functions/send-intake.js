// netlify/functions/send-intake.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { name='', email='', score='', band='', flags='' } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Missing email' }) };

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';
    const subject = 'Your Premium Marital Risk Analysis – Intake Packet';
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial">
        <h2>Premium Marital Risk Analysis – Intake</h2>
        <p>Thanks${name?`, ${name}`:''}! We received your request.</p>
        <ul>
          <li>Score: <b>${score}</b></li>
          <li>Exposure: <b>${band}</b></li>
          <li>Red Flags: <b>${flags}</b></li>
        </ul>
        <p>Reply to this email with any documents you'd like reviewed (prenup/postnup, last 3 years of tax returns, titles, statements).</p>
        <p>We’ll follow up with next steps.</p>
      </div>`;

    if (!RESEND_API_KEY) {
      console.log('[send-intake] Missing RESEND_API_KEY; simulating success.');
      return { statusCode: 200, body: JSON.stringify({ ok: true, simulated: true }) };
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html })
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Resend error', t);
      return { statusCode: 502, body: JSON.stringify({ error: 'Email send failed', detail: t }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) };
  }
};

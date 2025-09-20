// netlify/functions/send-report.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { name='', email='', score='', band='', flags='', html='' } = JSON.parse(event.body || '{}');
    const ADMIN_EMAIL   = process.env.ADMIN_EMAIL; // where you want to receive copies
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL     = process.env.FROM_EMAIL || 'no-reply@example.com';

    if (!ADMIN_EMAIL) {
      console.log('[send-report] Missing ADMIN_EMAIL; simulating success.');
      return { statusCode: 200, body: JSON.stringify({ ok: true, simulated: true }) };
    }

    const subject = `Report copy – ${name || 'Client'} (${score || '?'}/${band || '—'}; flags: ${flags || '0'})`;

    if (!RESEND_API_KEY) {
      console.log('[send-report] Missing RESEND_API_KEY; sending is disabled. Would have sent to:', ADMIN_EMAIL);
      return { statusCode: 200, body: JSON.stringify({ ok: true, simulated: true }) };
    }

    // Send HTML inline and attach the same HTML file for archival
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html: `
          <div style="font-family:system-ui,Segoe UI,Arial">
            <p><b>Client:</b> ${name || '—'}<br/>
               <b>Email:</b> ${email || '—'}<br/>
               <b>Score:</b> ${score || '—'}<br/>
               <b>Exposure:</b> ${band || '—'}<br/>
               <b>Red Flags:</b> ${flags || '—'}</p>
            <hr/>
            <p>This is an exact HTML copy of the page the client saw:</p>
            <div style="border:1px solid #eee; padding:10px; border-radius:8px; background:#fafbff">
              ${html || ''}
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'report.html',
            content: Buffer.from(html || '', 'utf8').toString('base64')
          }
        ]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend error', text);
      return { statusCode: 502, body: JSON.stringify({ error: 'Email send failed', detail: text }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) };
  }
};

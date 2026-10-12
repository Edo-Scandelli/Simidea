/* ==========================================================================
   SIMIDEA — modulo contatti
   Funzione serverless su Vercel. Riceve il modulo del sito e recapita la
   richiesta a info@simidea.it passando da Brevo.

   Perche' una funzione e non una chiamata diretta dal browser: la chiave API
   di Brevo da' pieno accesso all'account (contatti, campagne, invii). In una
   pagina pubblica sarebbe leggibile da chiunque. Qui resta in una variabile
   d'ambiente, sul server, e non raggiunge mai il browser.

   Variabile richiesta su Vercel: BREVO_API_KEY
   ========================================================================== */

const DESTINATARIO = { email: 'info@simidea.it', name: 'Simidea' };
// il mittente deve essere uno dei mittenti verificati nell'account Brevo
const MITTENTE     = { email: 'info@simidea.it', name: 'Sito Simidea' };

const LIMITI = { nome: 80, cognome: 80, email: 180, telefono: 40, messaggio: 1500, pagina: 120 };

// il testo dell'utente finisce dentro una mail HTML: va neutralizzato,
// altrimenti un "<" spedito per sbaglio rompe il messaggio
const pulito = (v = '') => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const taglia = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, errore: 'Metodo non consentito' });
  }

  const chiave = process.env.BREVO_API_KEY;
  if (!chiave) {
    // non si dice al visitatore che manca una chiave: e' un problema nostro
    console.error('BREVO_API_KEY non configurata');
    return res.status(500).json({ ok: false, errore: 'Servizio non disponibile' });
  }

  let corpo = req.body;
  if (typeof corpo === 'string') {
    try { corpo = JSON.parse(corpo); } catch { corpo = {}; }
  }
  corpo = corpo || {};

  // trappola: compilata solo dai bot, che leggono il campo nel sorgente
  if (taglia(corpo.azienda, 40)) return res.status(200).json({ ok: true });

  const dati = {
    nome:      taglia(corpo.nome, LIMITI.nome),
    cognome:   taglia(corpo.cognome, LIMITI.cognome),
    email:     taglia(corpo.email, LIMITI.email),
    telefono:  taglia(corpo.telefono, LIMITI.telefono),
    messaggio: taglia(corpo.messaggio, LIMITI.messaggio),
    pagina:    taglia(corpo.pagina, LIMITI.pagina),
  };

  // stessi controlli del browser: chi salta la pagina non salta questi
  const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dati.email);
  const cifre = dati.telefono.replace(/\D/g, '').length;
  if (!dati.nome || !dati.cognome || !emailValida || cifre < 8) {
    return res.status(400).json({ ok: false, errore: 'Dati incompleti' });
  }

  const righe = [
    ['Nome',      dati.nome + ' ' + dati.cognome],
    ['Email',     dati.email],
    ['Telefono',  dati.telefono],
    ['Pagina',    dati.pagina || '/'],
  ];

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c1c1c">
      <p style="margin:0 0 18px;font-size:18px;font-weight:bold">Nuova richiesta dal sito</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${righe.map(([k, v]) => `
          <tr>
            <td style="padding:4px 18px 4px 0;color:#6f6b67;white-space:nowrap">${k}</td>
            <td style="padding:4px 0"><strong>${pulito(v)}</strong></td>
          </tr>`).join('')}
      </table>
      ${dati.messaggio ? `
        <p style="margin:22px 0 6px;color:#6f6b67">Messaggio</p>
        <div style="padding:14px 16px;background:#f3ece4;border-radius:10px;white-space:pre-wrap">${pulito(dati.messaggio)}</div>`
        : '<p style="margin:22px 0 0;color:#6f6b67">Nessun messaggio allegato.</p>'}
    </div>`;

  const testo = righe.map(([k, v]) => `${k}: ${v}`).join('\n')
    + (dati.messaggio ? `\n\nMessaggio:\n${dati.messaggio}` : '');

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': chiave, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: MITTENTE,
        to: [DESTINATARIO],
        // rispondendo alla mail si scrive direttamente alla persona
        replyTo: { email: dati.email, name: `${dati.nome} ${dati.cognome}` },
        subject: `Nuova richiesta — ${dati.nome} ${dati.cognome}`,
        htmlContent: html,
        textContent: testo,
      }),
    });

    if (!r.ok) {
      const dettaglio = await r.text().catch(() => '');
      console.error('Brevo ha rifiutato l\'invio:', r.status, dettaglio.slice(0, 300));
      return res.status(502).json({ ok: false, errore: 'Invio non riuscito' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Errore di rete verso Brevo:', e && e.message);
    return res.status(502).json({ ok: false, errore: 'Invio non riuscito' });
  }
};

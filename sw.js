/* ==========================================================================
   SIMIDEA — service worker: il sito funziona anche senza connessione
   --------------------------------------------------------------------------
   Come ragiona:
   - PAGINE: prima la rete (cosi' online si vede sempre l'ultima versione),
     e intanto se ne tiene una copia. Senza rete si mostra la copia; se la
     pagina non e' mai stata salvata, /offline.
   - CSS, JS, SVG, ICONE, FOTO, FONT: prima la copia (si apre subito), e
     in sottofondo si aggiorna dalla rete. CSS e JS hanno ?v= nella URL:
     alzando la versione la URL cambia e si riscarica da sola.
   - /api e i moduli (POST) non passano di qui: senza rete falliscono e il
     sito lo dice.
   All'installazione si salvano subito pagine e file di base (poche
   centinaia di KB). Le foto (~4 MB) si scaricano tutte solo dentro l'app,
   quando main.js lo chiede: nel browser si salvano man mano che si vedono.

   QUANDO SI AGGIUNGE UNA PAGINA O UNA FOTO: aggiungerla qui sotto e alzare
   VERSIONE. Alzare VERSIONE anche quando cambiano ?v= di CSS e JS.
   ========================================================================== */
const VERSIONE = 'simidea-1';
const BASE  = VERSIONE + '-base';
const FOTO  = VERSIONE + '-foto';
const FONT  = 'simidea-font';           // non dipende dalla versione

const PAGINE = [
  '/', '/servizi', '/progetti', '/studio',
  '/blog', '/blog/arancy-apre', '/blog/il-menu-lavora-per-te',
  '/blog/la-foto-col-telefono', '/blog/simidea-sul-telefono',
  '/blog/un-logo-e-una-decisione',
  '/cookie-policy', '/privacy', '/termini', '/iscritto',
  '/offline',
];
const FILE = [
  '/assets/css/style.css?v=110',
  '/assets/js/main.js?v=46',
  '/site.webmanifest', '/favicon.svg',
  '/assets/svg/favicon.svg', '/assets/svg/simidea-logo.svg',
  '/assets/svg/simidea-mark.svg', '/assets/svg/simidea-wordmark.svg',
  '/assets/icone/icona-180.png', '/assets/icone/icona-192.png',
  '/assets/icone/icona-512.png',
];
const IMMAGINI = [
  'angelo-social', 'arancy-logo', 'arancy', 'aria', 'as-club', 'aureo',
  'billboard-orange', 'chiara-moroni', 'gs-fashion-show', 'gs', 'jamile',
  'la-studio', 'lillium', 'patty-burger', 'pexo', 'red-shift-moodboard',
  'red-shift-tracklist', 'red-shift', 'rusty', 'saporito', 'shooting-fieno',
  'simoa', 'web-app', 'web-design-mockup', 'weknowsomeone',
  'wrong-desire-moodboard', 'wrong-desire-tracklist', 'wrong-desire',
].map(n => `/assets/img/${n}.jpg`);
// i fogli di Google Fonts usati dalle pagine (stessa URL, & e non &amp;)
const G = 'https://fonts.googleapis.com/css2?family=';
const CARATTERI = [
  G + 'Anton&family=Archivo:wght@500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap',
  G + 'Archivo:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
  G + 'Anton&family=Archivo:wght@500;600;700;800&family=Inter:wght@300;400;500&display=swap',
];

/* ------------------------------------------------------- installazione */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(BASE);
    // una alla volta e senza fermarsi: se una pagina manca, le altre restano
    await Promise.all([...PAGINE, ...FILE].map(u => salva(c, u)));
    await salvaCaratteri();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const tieni = [BASE, FOTO, FONT];
    for (const k of await caches.keys()) if (!tieni.includes(k)) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

/* main.js, dentro l'app, chiede di scaricare tutte le foto */
self.addEventListener('message', e => {
  if (e.data === 'scarica-tutto') {
    e.waitUntil(caches.open(FOTO).then(c => Promise.all(IMMAGINI.map(u => salva(c, u, true)))));
  }
});

/* --------------------------------------------------------- richieste */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api/') || u.pathname === '/sw.js') return;
    if (r.mode === 'navigate') return e.respondWith(pagina(e));
    const cache = u.pathname.startsWith('/assets/img/') ? FOTO : BASE;
    return e.respondWith(primaLaCopia(e, cache));
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    return e.respondWith(primaLaCopia(e, FONT));
  }
});

async function pagina(e) {
  const r = e.request;
  const c = await caches.open(BASE);
  // la stessa pagina con ?webapp, ?app=ios o #contatti e' sempre lei
  const chiave = new URL(r.url);
  chiave.search = ''; chiave.hash = '';
  try {
    const rete = (await e.preloadResponse) || await fetch(r);
    // i redirect (/news -> /blog) non si salvano: il browser li rifiuterebbe
    if (rete.ok && !rete.redirected && rete.type === 'basic') {
      c.put(chiave.href, rete.clone());
    }
    return rete;
  } catch {
    return (await c.match(chiave.href))
      || (await c.match(chiave.href.replace(/\/$/, '')))
      || (await c.match('/offline'))
      || new Response('Sei offline.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function primaLaCopia(e, nome) {
  const r = e.request;
  const c = await caches.open(nome);
  const copia = await c.match(r);
  const aggiorna = fetch(r).then(rete => {
    if (rete.ok || rete.type === 'opaque') c.put(r, rete.clone());
    return rete;
  }).catch(() => null);
  if (copia) { e.waitUntil(aggiorna); return copia; }
  const rete = await aggiorna;
  if (rete) return rete;
  // senza rete e senza copia esatta: un CSS/JS con un ?v= diverso va bene lo stesso
  return (await caches.match(r, { ignoreSearch: true }))
    || new Response('', { status: 504, statusText: 'Offline' });
}

/* i fogli di Google Fonts e i file .woff2 che richiamano: alla prima
   visita la pagina li scarica prima che il service worker sia attivo,
   quindi senza questo offline mancherebbero i caratteri */
async function salvaCaratteri() {
  const c = await caches.open(FONT);
  await Promise.all(CARATTERI.map(async u => {
    try {
      if (await c.match(u)) return;
      const r = await fetch(u);
      if (!r.ok) return;
      const css = await r.clone().text();
      await c.put(u, r);
      // solo l'alfabeto latino: greco, cirillico e vietnamita il sito non li usa
      const blocchi = css.split('/* ').filter(b => /^latin(-ext)? \*\//.test(b));
      const file = [...new Set(blocchi.flatMap(b => [...b.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1])))];
      await Promise.all(file.map(f => salva(c, f, true)));
    } catch {}
  }));
}

/* salva una URL nella cache; con soloSeManca non riscarica cio' che c'e' gia' */
async function salva(c, url, soloSeManca) {
  try {
    if (soloSeManca && await c.match(url)) return;
    const rete = await fetch(url, { cache: 'no-cache' });
    if (rete.ok && !rete.redirected) await c.put(url, rete);
  } catch {}
}

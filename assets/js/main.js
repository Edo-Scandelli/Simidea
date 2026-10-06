/* ==========================================================================
   SIMIDEA — interazioni homepage
   Vanilla JS, nessuna dipendenza. Tutto disattivato con prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const mqMobile = window.matchMedia('(max-width: 860px)');

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------ intro neon al caricamento */
  /* Tre fasi: il tubo si traccia, si accende, lo strato si ritira.
     Un timeout di sicurezza smonta tutto comunque, così un'animazione
     mancata non può lasciare la pagina coperta. */
  /* Si gioca una volta per sessione: tornando sulla home da un'altra pagina
     non si rivede. sessionStorage si svuota chiudendo la scheda, quindi una
     visita nuova la rivede comunque. In finestra privata può lanciare
     un'eccezione: in quel caso l'intro parte, non si rompe niente. */
  const intro = $('#intro');
  let introGiaVista = false;
  try { introGiaVista = sessionStorage.getItem('simidea:intro') === '1'; } catch {}

  if (intro && !reduced && !introGiaVista) {
    try { sessionStorage.setItem('simidea:intro', '1'); } catch {}
    const root = document.documentElement;
    const T_TRACCIA = 1250;   // marchio + wordmark
    const T_ACCENDI = 780;
    const T_VIA     = 600;    // totale ~2,6s

    root.classList.add('intro-on', 'intro-draw');
    document.body.classList.add('is-locked');

    let smontato = false;
    const smonta = () => {
      if (smontato) return;
      smontato = true;
      root.classList.remove('intro-on', 'intro-draw', 'intro-on-light', 'intro-out');
      document.body.classList.remove('is-locked');
      intro.remove();
    };

    setTimeout(() => root.classList.add('intro-on-light'), T_TRACCIA);
    setTimeout(() => root.classList.add('intro-out'), T_TRACCIA + T_ACCENDI);
    setTimeout(smonta, T_TRACCIA + T_ACCENDI + T_VIA);
    // rete di sicurezza: qualunque cosa vada storta, dopo 6s lo strato non c'è più
    setTimeout(smonta, 6000);
    // e si può sempre saltare
    intro.addEventListener('click', smonta);
    addEventListener('keydown', e => { if (e.key === 'Escape') smonta(); }, { once: true });
  } else if (intro) {
    intro.remove();
  }

  /* ---------------------------------------------------------------- anno */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------------------------------- menu mobile */
  const burger = $('#burger');
  const menu   = $('#menu');

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    menu.dataset.open = String(open);
    document.body.classList.toggle('is-locked', open);
  };

  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    mqMobile.addEventListener('change', e => { if (!e.matches) setMenu(false); });
  }

  /* --------------------------------------------------------- reveal on scroll */
  /* I titoli con <br> diventano righe mascherate: ogni riga sale da sotto
     un taglio, con ritardo progressivo. */
  $$('[data-lines]').forEach(el => {
    const righe = el.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    if (righe.length < 2) return;
    el.innerHTML = righe
      .map((r, i) => `<span class="line" style="--i:${i}"><span>${r}</span></span>`)
      .join('');
    el.classList.add('lines');
    el.removeAttribute('data-reveal');   // la maschera sostituisce la dissolvenza
    el.dataset.revealLines = '';
  });

  const revealables = $$('[data-reveal], [data-reveal-lines]');
  if (revealables.length) {
    if (reduced) {
      revealables.forEach(el => el.classList.add('is-in'));
    } else {
      // Due osservatori con un compito ciascuno: entrare un po' prima del
      // bordo inferiore, e azzerarsi solo quando l'elemento è del tutto
      // fuori schermo — così l'uscita non si vede mai a metà pagina e
      // rientrando l'animazione si ripete.
      const entra = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-in'); });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });

      const esce = new IntersectionObserver(es => {
        es.forEach(e => { if (!e.isIntersecting) e.target.classList.remove('is-in'); });
      }, { rootMargin: '0px', threshold: 0 });

      revealables.forEach(el => { entra.observe(el); esce.observe(el); });
    }
  }

  /* ------------------------------------ manifesto: rivelazione parola per parola */
  const split = $('[data-split]');
  if (split) {
    // avvolge ogni parola preservando <em> e gli altri inline
    const wrapWords = (node) => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          if (parts.length < 2) return;
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      });
    };
    wrapWords(split);

    const words = $$('.w', split);
    if (reduced) {
      words.forEach(w => w.classList.add('on'));
    } else {
      const paint = () => {
        const r = split.getBoundingClientRect();
        // Parte appena il blocco entra e finisce quando è tutto a schermo:
        // la corsa dipende dall'altezza del testo, non da una distanza fissa,
        // così non si scorre mai oltre l'ultima riga per vederla accendersi.
        const start = window.innerHeight * 0.92;
        const span  = r.height + window.innerHeight * 0.38;
        const p = clamp((start - r.top) / span, 0, 1);
        const upTo = Math.ceil(p * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < upTo));
      };
      onScroll(paint);
      paint();
    }
  }

  /* ------------------------------------------ nav: nascondi/mostra + tema */
  const nav = $('#nav');
  if (nav) {
    const sections = $$('[data-nav]');

    const paintNav = () => {
      const y = window.scrollY;
      const probe = nav.getBoundingClientRect().bottom - 8;

      // tema in base alla sezione sotto la barra
      let theme = 'dark';
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = s.dataset.nav; break; }
      }
      nav.dataset.theme = theme;
      nav.dataset.surface = theme;   // serve anche al cursore

      // resta sempre visibile: scorrendo si limita a compattarsi
      nav.dataset.compact = String(y > 40);
    };

    onScroll(paintNav);
    paintNav();

    // voce attiva
    // solo le voci che puntano a un'ancora: le altre sono pagine esterne
    const links = $$('.nav__links a[href^="#"]');
    const targets = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (targets.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          links.forEach(a => a.removeAttribute('aria-current'));
          const active = links.find(a => a.getAttribute('href') === '#' + e.target.id);
          if (active) active.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      targets.forEach(t => spy.observe(t));
    }
  }

  /* ----------------------------------------- servizi: scala delle card impilate */
  const cards = $$('[data-card]');
  if (cards.length && !reduced) {
    const paintCards = () => {
      const vh = window.innerHeight;
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        // le card sono tutte incollate allo stesso `top`: l'unico segnale utile
        // è quanto la card successiva si è già sovrapposta a questa.
        const stickyTop = parseFloat(getComputedStyle(card).top) || 0;
        const p = clamp((vh - next.getBoundingClientRect().top) / (vh - stickyTop), 0, 1);
        card.style.transform = `scale(${(1 - p * 0.06).toFixed(4)})`;
        card.style.filter = `brightness(${(1 - p * 0.22).toFixed(3)})`;
      });
    };
    onScroll(paintCards);
    onResize(paintCards);
    paintCards();
  }

  /* ------------------------------------------ progetti: scroll orizzontale pinnato */
  const workSection = $('#progetti');
  const track       = $('#workTrack');
  const viewport    = $('#workViewport');
  const bar         = $('#workBar');
  const idxOut      = $('#workIndex');

  if (workSection && track && viewport) {
    let distance = 0;
    let current = 0, target = 0;
    let running = false;

    const measure = () => {
      if (mqMobile.matches || reduced) {
        workSection.style.height = '';
        track.style.transform = '';
        distance = 0;
        return;
      }
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      // altezza dello "scroll virtuale": 1 schermata + la distanza da percorrere
      workSection.style.height = `${window.innerHeight + distance}px`;
    };

    const progress = () => {
      const r = workSection.getBoundingClientRect();
      return clamp(-r.top / (workSection.offsetHeight - window.innerHeight), 0, 1);
    };

    const tick = () => {
      current = lerp(current, target, 0.12);
      if (Math.abs(target - current) < 0.15) current = target;
      track.style.transform = `translate3d(${-current}px,0,0)`;
      if (Math.abs(target - current) > 0.15) {
        requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const paintWork = () => {
      if (!distance) {
        if (bar) bar.style.transform = 'scaleX(0)';
        return;
      }
      const p = progress();
      target = p * distance;
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (idxOut) {
        const total = $$('.project', track).length - 1; // esclude la card CTA
        const n = clamp(Math.round(p * (total - 1)) + 1, 1, total);
        idxOut.textContent = String(n).padStart(2, '0');
      }
      if (!running) { running = true; requestAnimationFrame(tick); }
    };

    measure();
    paintWork();
    onScroll(paintWork);
    onResize(() => { measure(); current = target; paintWork(); });
    window.addEventListener('load', () => { measure(); paintWork(); });
  }

  /* ------------------------------------------- filigrana del marchio nella hero */
  const watermark = $('.hero__watermark');
  if (watermark && !reduced) {
    const paintMark = () => {
      const y = window.scrollY;
      if (y > window.innerHeight) return;
      watermark.style.transform = `translate3d(0, ${(y * 0.09).toFixed(1)}px, 0) scale(${(1 + y / 9000).toFixed(4)})`;
    };
    onScroll(paintMark);
    paintMark();
  }

  /* --------------------------------------------------------------- parallax */
  const parallaxImgs = $$('[data-parallax]');

  if (parallaxImgs.length && !reduced) {
    const paintParallax = () => {
      const vh = window.innerHeight;

      parallaxImgs.forEach(img => {
        const r = img.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const amt = parseFloat(img.dataset.parallax) || 0.1;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = `scale(1.06) translate3d(0, ${(-p * amt * 100).toFixed(2)}px, 0)`;
      });
    };
    onScroll(paintParallax);
    onResize(paintParallax);
    paintParallax();
  }

  /* ------------------------------------------------------------- cursore */
  const cur = $('#cursor');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cur && finePointer && !reduced) {
    document.documentElement.classList.add('has-cursor');
    const ring = $('.cursor__ring', cur);
    const dot  = $('.cursor__dot', cur);
    const RING = 34, DOT = 7;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my, dx = mx, dy = my;
    let scale = 1, scaleTo = 1;
    let last = null, raf = null;

    const frame = () => {
      rx = lerp(rx, mx, 0.16);  ry = lerp(ry, my, 0.16);
      dx = lerp(dx, mx, 0.45);  dy = lerp(dy, my, 0.45);
      scale = lerp(scale, scaleTo, 0.18);

      ring.style.transform =
        `translate3d(${(rx - RING / 2).toFixed(1)}px, ${(ry - RING / 2).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      dot.style.transform =
        `translate3d(${(dx - DOT / 2).toFixed(1)}px, ${(dy - DOT / 2).toFixed(1)}px, 0)`;

      const settled = Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1 &&
                      Math.abs(scaleTo - scale) < 0.002;
      raf = settled ? null : requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (cur.dataset.on !== 'true') { rx = dx = mx; ry = dy = my; cur.dataset.on = 'true'; }

      // il target è già l'elemento sotto: il cursore ha pointer-events: none
      const el = e.target;
      if (el !== last) {
        last = el;
        const surf = el.closest?.('[data-surface], [data-nav]');
        cur.dataset.surface = surf ? (surf.dataset.surface || surf.dataset.nav) : 'dark';

        const state = el.closest?.('a, button, [data-magnetic]') ? 'link'
                    : el.closest?.('.project, .shot, .card__media') ? 'media'
                    : '';
        cur.dataset.state = state;
        scaleTo = state === 'link' ? 1.85 : state === 'media' ? 2.5 : 1;
      }
      kick();
    }, { passive: true });

    // feedback al clic
    window.addEventListener('pointerdown', () => { scaleTo *= 0.78; kick(); });
    window.addEventListener('pointerup',   () => { scaleTo /= 0.78; kick(); });

    const hide = () => { cur.dataset.on = 'false'; };
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) hide(); });
    window.addEventListener('blur', hide);
  }

  /* ------------------------------------------------------ bottoni magnetici */
  /* Il bottone si sposta sotto al cursore: se ascoltassimo pointermove
     sull'elemento, ogni spostamento farebbe scattare pointerleave e il
     bottone oscillerebbe. Quindi ascoltiamo la finestra e calcoliamo il
     centro "a riposo", sottraendo la traslazione già applicata. */
  const magnets = $$('[data-magnetic]');
  if (magnets.length && !isTouch && !reduced) {
    const STRENGTH = 0.16;
    const MAX      = 9;     // px: oltre questo non si muove più
    const RADIUS   = 70;    // px oltre il bordo entro cui reagisce

    const state = magnets.map(el => ({ el, tx: 0, ty: 0, cx: 0, cy: 0 }));
    let raf = null;

    const frame = () => {
      let moving = false;
      for (const s of state) {
        s.cx = lerp(s.cx, s.tx, 0.16);
        s.cy = lerp(s.cy, s.ty, 0.16);
        if (Math.abs(s.tx - s.cx) > 0.08 || Math.abs(s.ty - s.cy) > 0.08) moving = true;
        else { s.cx = s.tx; s.cy = s.ty; }
        s.el.style.transform = (s.cx || s.cy)
          ? `translate3d(${s.cx.toFixed(2)}px, ${s.cy.toFixed(2)}px, 0)`
          : '';
      }
      raf = moving ? requestAnimationFrame(frame) : null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      for (const s of state) {
        const r = s.el.getBoundingClientRect();
        // centro a riposo = centro attuale meno lo spostamento già applicato
        const cx = r.left + r.width / 2 - s.cx;
        const cy = r.top + r.height / 2 - s.cy;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const inside = Math.abs(dx) < r.width / 2 + RADIUS &&
                       Math.abs(dy) < r.height / 2 + RADIUS;
        s.tx = inside ? clamp(dx * STRENGTH, -MAX, MAX) : 0;
        s.ty = inside ? clamp(dy * STRENGTH, -MAX, MAX) : 0;
      }
      kick();
    }, { passive: true });

    window.addEventListener('blur', () => {
      state.forEach(s => { s.tx = 0; s.ty = 0; });
      kick();
    });
  }

  /* --------------------------------- voci che puntano a pagine non ancora fatte */
  $$('[data-soon]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ----------------------------------------------- scroll fluido sulle ancore */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      // sezione non renderizzata (es. nascosta dall'anteprima): non saltare a vuoto
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') { e.preventDefault(); return; }
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ------------------------------------------------------------- utilities */
  /* ------------------------------------------------ patti: la luce nella card */
  /* Solo due variabili CSS per card, aggiornate su pointermove e limitate al
     riquadro sotto il cursore. Niente stato da sincronizzare, niente rAF:
     il movimento del puntatore e' gia' il clock. */
  const patti = $('#patti');
  if (patti && !reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.patto', patti).forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--px', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--py', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        card.style.setProperty('--pr', Math.round(clamp(r.width * .8, 180, 300)) + 'px');
      }, { passive: true });
    });
  }

  /* ------------------------------------------------ pagina servizi: indice vivo */
  /* La cifra dell'area corrente cambia mentre si scorre: quella che esce sale,
     quella che entra arriva da sotto sfocata e si accende. Il segmento acceso
     del binario segue la voce attiva. Senza JS resta un indice statico e i
     blocchi si leggono comunque: l'effetto e' in aggiunta, non al posto. */
  const indice = $('#srvIndice');
  if (indice) {
    const cifra   = $('.srv__cifra', indice);
    const uscita  = $('.srv__cifra-uscita', indice);
    const entrata = $('.srv__cifra-entrata', indice);
    const salti   = $$('.srv__salto', indice);
    const binario = $('.srv__salti', indice);
    const blocchi = salti.map(b => $('#' + b.dataset.va)).filter(Boolean);

    let attivo = -1;

    const muoviBinario = b => {
      const r = b.getBoundingClientRect();
      const rb = binario.getBoundingClientRect();
      binario.style.setProperty('--rail-top', Math.round(r.top - rb.top + 6) + 'px');
      binario.style.setProperty('--rail-h', Math.round(r.height - 12) + 'px');
    };

    const attiva = i => {
      if (i === attivo || i < 0) return;
      const nuovo = salti[i].querySelector('.srv__salto-num').textContent.trim();
      const vecchio = attivo >= 0 ? salti[attivo].querySelector('.srv__salto-num').textContent.trim() : '';

      if (!reduced && vecchio) {
        uscita.textContent = vecchio;
        entrata.textContent = nuovo;
        cifra.classList.remove('cambia');
        void cifra.offsetWidth;          // forza il reflow: senza, la classe non rianima
        cifra.classList.add('cambia');
      } else {
        entrata.textContent = nuovo;
      }

      salti.forEach((b, k) => k === i
        ? b.setAttribute('aria-current', 'true')
        : b.removeAttribute('aria-current'));
      muoviBinario(salti[i]);
      attivo = i;
    };

    // l'area attiva e' quella il cui blocco taglia la fascia alta della finestra
    const scegli = () => {
      const linea = window.innerHeight * 0.34;
      let scelto = 0;
      blocchi.forEach((b, i) => { if (b.getBoundingClientRect().top <= linea) scelto = i; });
      attiva(scelto);
    };

    salti.forEach((b, i) => b.addEventListener('click', () => {
      blocchi[i].scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    }));

    onScroll(scegli);
    onResize(() => { if (attivo >= 0) muoviBinario(salti[attivo]); });
    scegli();
    attiva(0);
  }

  /* ------------------------------------------------ carosello recensioni */
  /* La pista scorre davvero (overflow-x + scroll-snap): swipe, trackpad e
     tastiera funzionano senza codice. Frecce e pallini muovono lo stesso
     scroll, non una posizione parallela da tenere sincronizzata. */
  $$('[data-carosello]').forEach(giostra => {
    const pista    = $('.carosello__pista', giostra);
    const puntiBox = $('.carosello__punti', giostra);
    const frecce   = $$('.carosello__freccia', giostra);
    const card     = pista ? $$('.review', pista) : [];
    if (!pista || !card.length) return;

    const stile = () => getComputedStyle(pista);
    const padSx = () => parseFloat(stile().paddingLeft) || 0;
    const passo = () => card.length < 2
      ? card[0].offsetWidth
      : card[1].getBoundingClientRect().left - card[0].getBoundingClientRect().left;
    const contenuto = () => pista.clientWidth - padSx() - (parseFloat(stile().paddingRight) || 0);
    // quante card ci stanno intere: e' il "passo di pagina"
    const visibili = () => clamp(Math.round(contenuto() / passo()), 1, card.length);
    const pagine   = () => Math.ceil(card.length / visibili());
    const paginaOra = () => clamp(Math.round(pista.scrollLeft / (passo() * visibili())), 0, pagine() - 1);

    const vaiA = (p, liscio = true) => {
      const i  = clamp(p * visibili(), 0, card.length - 1);
      const dx = card[i].getBoundingClientRect().left - pista.getBoundingClientRect().left - padSx();
      pista.scrollBy({ left: dx, behavior: liscio && !reduced ? 'smooth' : 'instant' });
    };

    let timer = null, inVista = false, congelato = false;
    const pausa = () => { clearInterval(timer); timer = null; };
    const avvia = () => {
      if (reduced || timer || congelato || !inVista || pagine() < 2) return;
      timer = setInterval(() => vaiA((paginaOra() + 1) % pagine()), 6000);
    };
    // dopo un gesto esplicito il comando resta all'utente: non si riparte
    const congela = () => { congelato = true; pausa(); };

    const disegnaPunti = () => {
      const n = pagine();
      if (puntiBox.children.length !== n) {
        puntiBox.innerHTML = '';
        for (let i = 0; i < n; i++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', `Vai al gruppo ${i + 1} di ${n}`);
          b.addEventListener('click', () => { vaiA(i); congela(); });
          puntiBox.append(b);
        }
      }
      const ora = paginaOra();
      [...puntiBox.children].forEach((b, i) => b.setAttribute('aria-current', i === ora ? 'true' : 'false'));
      giostra.classList.toggle('carosello--unico', n < 2);
    };

    frecce.forEach(f => f.addEventListener('click', () => {
      const n = pagine();
      vaiA((paginaOra() + Number(f.dataset.dir) + n) % n);
      congela();
    }));

    let attesa = false;
    pista.addEventListener('scroll', () => {
      if (attesa) return;
      attesa = true;
      requestAnimationFrame(() => { disegnaPunti(); attesa = false; });
    }, { passive: true });

    ['pointerdown', 'wheel', 'touchstart'].forEach(e =>
      pista.addEventListener(e, congela, { passive: true, once: true }));

    giostra.addEventListener('mouseenter', pausa);
    giostra.addEventListener('mouseleave', avvia);
    giostra.addEventListener('focusin', pausa);
    giostra.addEventListener('focusout', avvia);
    document.addEventListener('visibilitychange', () => document.hidden ? pausa() : avvia());

    new IntersectionObserver(es => {
      inVista = es[0].isIntersecting;
      inVista ? avvia() : pausa();
    }, { threshold: 0.25 }).observe(giostra);

    onResize(() => { disegnaPunti(); vaiA(paginaOra(), false); });
    disegnaPunti();
  });

  function onScroll(fn) {
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { fn(); ticking = false; });
    };
    window.addEventListener('scroll', handler, { passive: true });
  }

  function onResize(fn) {
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(fn, 140);
    }, { passive: true });
  }
})();

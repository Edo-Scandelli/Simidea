# Simidea — Homepage (bozza 01)

Sito statico, nessun build step. Apri `index.html` in un browser, oppure — meglio,
per evitare limitazioni sui file locali — servilo:

```bash
cd "$(dirname "$0")"
python3 -m http.server 4545 --bind ::
# poi apri http://localhost:4545
```

## Struttura

```
index.html            pagina unica (contiene lo sprite SVG del marchio)
assets/css/style.css  stili, tutti i token in :root
assets/js/main.js     animazioni (vanilla, zero dipendenze)
assets/img/           immagini del portfolio, ricavate dal sito attuale
assets/svg/           logo vettorializzato + favicon
```

## Palette (ripresa dal sito attuale)

| Token | Valore | Uso |
|---|---|---|
| `--ink` | `#1c1c1c` | testo, fondi scuri |
| `--ink-deep` | `#0a0908` | hero, sezioni "cinema" |
| `--orange` | `#ff9900` | accento del brand |
| `--cream` | `#f9f9f9` | fondo chiaro |
| `--sand` | `#f3ece4` | card alternativa |

Font: **Anton** (titoli poster), **Archivo** (headline/UI), **Inter** (testo).

## Sezioni

1. Hero — gradiente animato + muro di parole, come sul profilo Instagram
2. Ticker dei servizi
3. Manifesto — rivelazione parola per parola legata allo scroll
4. Servizi — 4 card che si impilano in sticky
5. Lavori — scroll orizzontale "pinnato" (su mobile diventa swipe con snap)
6. Fotografia — colonne in parallasse
7. Processo — 3 step
8. CTA contatti + footer

## Intro neon al caricamento

Al primo disegno della pagina uno strato copre lo schermo e il marchio viene
**tracciato come un tubo di neon**, poi si accende con uno sfarfallio. Durata
complessiva ~2,6s, poi lo strato si ritira e viene rimosso dal DOM.

Il tracciato anima `stroke-dashoffset`: le lunghezze dei percorsi sono
misurate sul posto (marchio 1671, wordmark 1932) e scritte nel CSS. Se il
logo viene rivettorializzato, vanno rimisurate con `path.getTotalLength()`.

Due vincoli da non rompere:

- i `viewBox` degli SVG dell'intro sono **allargati di 4 unità per lato**
  (`-4 -4 242 281` e `-4 -4 313 73`): il tratto del neon sporge di metà
  spessore oltre il contorno del tracciato pieno e altrimenti viene tagliato
- l'animazione `accendi` **ridichiara `stroke-dashoffset: 0` in ogni
  fotogramma**: sostituisce `traccia`, e senza quella riga la proprietà
  torna al valore di base ri-nascondendo il tubo appena disegnato
- il bagliore sta su `.intro__stage` (un div), non sugli SVG: dentro un SVG
  il filtro viene ritagliato dal viewport dell'elemento

I percorsi dello sprite **non dichiarano `fill`**: lo assegna la regola
`svg use { fill: currentColor }`. Serve all'intro, che deve poter imporre
`fill: none` per tracciare il contorno. Togliendo quella regola i loghi
diventano neri.

Tre reti di sicurezza: lo strato è `display: none` per difetto e si mostra
solo se il JS lo attiva; un timeout a 6s lo smonta comunque; si salta con
un clic o con Esc. Con `prefers-reduced-motion` non viene creato affatto.

Ora parte a **ogni caricamento**. Per limitarlo al primo della sessione,
avvolgere l'attivazione in un controllo su `sessionStorage`.

## Banner SIMIDEA (header)

L'header è il banner in vetro del sito: resta **sempre visibile**, non si
nasconde scorrendo. Scorrendo si compatta (da 64 a 50px di altezza e da
1361 a 1120px di larghezza) tramite `data-compact` sul tag `<header>`,
impostato dal JS oltre i 40px di scroll.

Il colore si adatta da solo alla sezione sotto la barra, leggendo
`data-nav="dark|light"`. Quando faremo le altre pagine, l'header va
copiato così com'è: è un componente condiviso, senza dipendenze dalla home.

## Cursore

Il cursore di sistema è sostituito da un punto + anello che lo insegue.
L'anello cambia colore da solo in base alla superficie sotto al puntatore:
le sezioni portano `data-nav="dark|light"`, e i blocchi che fanno eccezione
(card chiare o arancioni) portano `data-surface`. Per aggiungerne uno nuovo
basta mettere `data-surface="light"` o `"dark"` sull'elemento.

Si attiva solo con puntatore fine (`hover: hover`); su touch e con
`prefers-reduced-motion` resta il cursore di sistema.

## Animazioni dei testi

Tre livelli, scelti con un attributo nel markup:

| attributo | effetto | dove |
|---|---|---|
| `data-reveal` | dissolvenza + risalita + velatura (blur 5px) | testi correnti, elenchi, pulsanti |
| `data-lines` | ogni riga sale da sotto una maschera, in sequenza | titoli di sezione (ricava le righe dai `<br>`) |
| `data-split` | parola per parola, legato allo scroll | frase del manifesto |

Entrata e uscita sono gestite da **due osservatori**: uno rivela poco prima
del bordo inferiore, l'altro azzera solo quando l'elemento è del tutto fuori
schermo. Così l'uscita non si vede mai a metà pagina e, tornando indietro,
l'animazione si ripete.

Le maschere usano `overflow-clip-margin`: senza, i discendenti (q, g, p)
dei titoli verrebbero tagliati.

Tutte le animazioni si disattivano con `prefers-reduced-motion: reduce`.

## Sfondo neon della sezione Contatti

La CTA finale (`.contact`) ha una cornice di luce che corre lungo i quattro lati
e si ingrossa negli angoli, su un interno nero. Solo nero e arancione.

- **Come e' fatta.** `.contact__mesh` non ha sfondo: e' tutta `box-shadow: inset`.
  Un'ombra per lato, ognuna con la sua tonalita' di arancione, piu' due aloni
  concentrici che entrano verso il centro. Negli angoli si sovrappongono due
  ombre: e' per questo che la luce li' e' piu' spessa, senza disegnarla a mano.
- **Perche' non un mesh gradient.** Prima versione fatta con `radial-gradient`
  sfumati: sbagliata, dava una nebbia diffusa invece di una cornice. Il
  riferimento e' un neon perimetrale, non un'aurora.
- **Il respiro.** `.contact__mesh::after` ripete la stessa geometria con i
  colori spostati e fa dissolvenza incrociata in 19s. Anima solo `opacity`,
  quindi il lavoro resta sul compositor: 60 fps, identici a sezione spenta.
- **Le misure sono variabili** (`--lato`, `--capo`, `--anello`, `--alone`) in
  `clamp()` sulla larghezza. A valori fissi, su un telefono i due lati si
  incontrano al centro.
- **I colori sono l'arancione di marca**, `#ff9900` e poco altro (`#ff8400`,
  `#ffa524`). Le tinte schiarite col bianco fanno sembrare il neon sbiadito.
  Verificato sui pixel: il bordo misura `#f99b06`, saturazione .94-.98.
- **Lo scudo** (`.contact::after`) e' l'ellisse scura fra il neon e il testo.
  Senza, su mobile il paragrafo scendeva a **1,99:1** di contrasto: il nucleo
  misurato al centro sembrava nero, ma il testo su schermo stretto occupa quasi
  tutta la larghezza e finisce dentro l'alone.
  **Trappola:** in `radial-gradient(ellipse W H at …)` W e H sono il **raggio**,
  non il diametro. Con `64%` su una sezione da 1440px lo scudo arrivava a 921px
  dal centro, cioe' oltre i bordi, e spegneva il neon del 32% (il bordo misurava
  `#ad6d07` invece di `#f99b06`). I valori giusti sono circa la meta'.
  Caso peggiore misurato oggi: **9,33:1** (390px, respiro acceso, sul titolo).
- **La grana** (`.contact::before`, `feTurbulence`, opacita' .07, **senza**
  `mix-blend-mode`) toglie il banding e da' il grado "fotografico". In `overlay`
  sparirebbe sul nero.

## Modalità anteprima (attiva)

`<body data-preview="servizi">` ferma la pagina alla sezione Servizi:
Lavori, Fotografia, Processo, Contatti e footer restano nel markup ma
non vengono mostrati. **Per rimettere online tutto basta togliere
`data-preview` dal tag `<body>` in `index.html`.**

Finché è attiva, le voci di menu che puntano a sezioni nascoste
(Lavori, Fotografia, Studio) e i pulsanti verso i Contatti non fanno
nulla, invece di saltare a vuoto.

Per mostrare anche contatti e footer tenendo nascosto il portfolio,
togli `#contatti` e `.footer` dall'elenco in fondo a `style.css`.

## Da completare prima della messa online

- [ ] Link Instagram reale (nel footer è `href="#"`)
- [ ] P. IVA nel footer
- [ ] Verificare quali progetti del portfolio sono lavori su commessa e quali
      concept/esercizi di stile (Felce Azzurra ed Elodie sono etichettati come
      "concept", da confermare con il cliente)
- [ ] Immagini definitive ad alta risoluzione: quelle attuali sono estratte dal
      sito Google Sites, quindi già compresse e al massimo 1280–2048px
- [ ] Testi approvati dal cliente

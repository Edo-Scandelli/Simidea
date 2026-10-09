# Simidea — Homepage (bozza 01)

Sito statico, nessun build step. Apri `index.html` in un browser, oppure — meglio,
per evitare limitazioni sui file locali — servilo:

```bash
cd "$(dirname "$0")"
python3 -m http.server 4545 --bind ::
# poi apri http://localhost:4545  (pagine interne: /servizi, /progetti, /studio)
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
4. Servizi — 4 card che si impilano in sticky: Brand Identity, Graphic Design, Art Direction, Web Design
5. Progetti — scroll orizzontale "pinnato" (su mobile diventa swipe con snap)
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

**Solo la lampadina.** Dal 6 ottobre l'intro traccia e accende **soltanto il
marchio**: la scritta "SIMIDEA" e' stata tolta da qui, e resta dov'era —
header e footer, dove il marchio e' completo. Il wordmark `#s-word` e' ancora
nello sprite perche' serve a quelli.

Togliendola e' andato ridotto anche `T_TRACCIA` da **1250 a 1050 ms**: i 1250
erano la somma del tracciato del marchio (1,05s) e di quello della scritta
(0,8s con 0,45s di ritardo). Lasciandoli invariati ci sarebbero stati 200 ms di
pausa morta fra la fine del disegno e l'accensione. Il marchio e' anche un po'
piu' grande, visto che adesso sta da solo.

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

## Card dei progetti (formato 4:5)

Le sei foto del portfolio sono 1080x1350, cioe' 4:5. E' la card ad adattarsi al
formato delle foto, non il contrario:

- `.project` ha `aspect-ratio: 4 / 5` con `height: 100%; width: auto`, quindi la
  larghezza la detta l'altezza della pista. Su mobile si inverte (`width: 84vw`,
  `height: auto`), altrimenti a schermo stretto la card sarebbe piu' larga del
  telefono. Tutte e sette le card (CTA compresa) misurano esattamente 0.800.
- `.work__track` ha `align-items: center`, senza il quale lo stretch di flex
  ignorerebbe il `max-height` delle card.
- **Niente zoom a riposo** sull'immagine: lo `scale(1.08)` di prima tagliava il
  4% per lato, cioe' proprio il bordo dei marchi, che in queste foto arrivano
  quasi a filo. L'ingrandimento resta solo al passaggio del mouse.
- **Titoli su una riga sola.** `.project h3` ha `white-space: nowrap`; sotto gli
  860px torna a `normal` come rete di sicurezza. Verificato a 1440, 1180, 980,
  861 e 390px: nessun titolo va a capo e nessuno sfonda la card, quindi il
  blocco della didascalia ha sempre la stessa altezza.
- **La velatura e' agganciata alla didascalia**, non alla card. Un gradiente a
  tutta altezza non puo' insieme lasciare libero il marchio a meta' foto e
  proteggere il testo: col gradiente addolcito il titolo di "Chiara Moroni",
  la cui foto in basso e' quasi bianca, scendeva a **2,59:1**. Con la velatura
  su `.project__meta::before` il velo cresce insieme al testo che deve coprire.
  Misure del caso peggiore (sempre il titolo di "Chiara Moroni") al variare
  dell'altezza del velo: `-3rem/.55` 8,81:1 · **`-2rem/.42` 6,66:1 (in uso)** ·
  `-1.4rem/.34` 4,26:1 · `-1rem/.26` 2,81:1. Sotto `-1.4rem` si scende oltre il
  limite AA anche per il testo grande.
- Le foto sono ricompresse a qualita' 82 progressiva: 4,8 MB -> 589 KB, con
  PSNR 43-45 dB (sopra 40 la differenza non si vede).

## L'arancione come testo su fondo chiaro: 2,03:1

Misurato su tutte e tre le pagine: `#ff9900` come **testo piccolo su fondo
chiaro sta a 2,03:1**, molto sotto il minimo di 4,5:1. Riguarda **20 etichette**
su 34 — tutti gli occhielli delle sezioni (quelli ereditati dal disegno
originale) piu' i dodici settori delle schede progetto.

Sui fondi scuri lo stesso arancione sta fra **7,96 e 9,57:1**: li' non c'e'
nessun problema. E' un limite del colore, non del disegno: nessuna variante di
peso o dimensione lo porta sopra soglia su fondo chiaro.

**Non e' stato cambiato** perche' tocca l'identita' visiva su tutte le pagine:
e' una decisione del cliente, non tecnica. La soluzione minima, se la si vuole,
e' un ambra piu' scuro riservato **ai soli testi piccoli su fondo chiaro**,
lasciando `#ff9900` ovunque altro (fondi scuri, titoli, bottoni, accenti):

| colore | contrasto su crema |
|---|---|
| `#ff9900` (marca) | 2,03:1 |
| `#c26a00` (orange-deep) | 3,72:1 |
| **`#a65f00`** | **4,68:1** — passa |
| `#9c5600` | 5,33:1 |

## `--muted`: correzione di una misura sbagliata

Per un po' ho riportato che i testi secondari stavano a **4,75:1**, dentro lo
standard. Era falso: lo script di misura leggeva `color(srgb 0.97 0.97 0.97 /
.64)` — la notazione che Chrome restituisce per `color-mix()` — trattando i
valori 0-1 come se fossero 0-255, quindi calcolava un colore quasi nero.

Il valore vero di `--muted` a `ink 55%` era **3,64:1**: sotto il minimo AA di
4,5:1 per il testo di dimensione normale, su tutto il sito. Portato a **66%**
(`#696969` circa) sono **5,2:1** teorici e 5,36-5,48:1 misurati sui pixel, e
resta comunque un grigio, non nero.

Morale: quando una misura di contrasto restituisce un numero implausibile
(1,03:1 su testo chiaro su fondo nero), il sospettato e' il parser del colore,
non la pagina.

## Pagina servizi (`servizi.html`)

Prima pagina interna. `/servizi` funziona come URL pulita sia in locale
(`serve.py` risolve `/servizi` -> `servizi.html`) sia su Vercel
(`vercel.json` con `cleanUrls: true`).

**Struttura.** **Sei aree**, le prime quattro sono quelle della home. I
diciotto servizi del cliente ci stanno tutti: sei sono i titoli delle aree,
dodici sono le etichette dentro le aree. Non c'e' nessun blocco "e inoltre":
i tre servizi che prima restavano orfani sono diventati aree loro.

| area | contiene |
|---|---|
| 01 Brand Identity | Logo Design |
| 02 Graphic Design | Print Design, Packaging Design, Editorial Design |
| 03 Art Direction | Creative Direction, Photography, Content Creation |
| 04 Web Design | Social Media Design, Social Media Management |
| 05 Marketing & Communication | Advertising, Event Planning |
| 06 Creative Consulting | Job Profile |

> **Da validare col cliente:** il raggruppamento e' una proposta, non una sua
> indicazione. In particolare "Job Profile" sta sotto Creative Consulting
> interpretandolo come consulenza sul profilo professionale di una persona: se
> significa altro, va spostato.

**Sezione Domande a due colonne**: titolo a sinistra (piu' piccolo, su due
righe), elenco a destra, con le stesse proporzioni della griglia delle aree
cosi' le due sezioni si allineano. Il titolo passa a una colonna sotto i
**1060px**: fra 900 e 1060 la colonna di sinistra diventa troppo stretta e il
titolo andrebbe su tre righe. Verificato a 24 larghezze fra 320 e 1920px.

**Impaginazione** volutamente diversa dalle card impilate della home: qui serve
un indice leggibile, non un secondo effetto scenico. Blocchi editoriali separati
da filetti, numero arancione a sinistra, descrizione e etichette a destra; su
mobile si impila.

**Cornice condivisa.** Senza build step, head/sprite/nav/menu/footer/CTA sono
**duplicati** in ogni pagina. `servizi.html` e' stato generato estraendo quei
pezzi da `index.html`, ma da qui in avanti **una modifica alla cornice va fatta
su tutte le pagine**. E' il prezzo del "nessuna dipendenza": se le pagine
diventano molte, conviene un generatore minimo.

**Due dettagli che sono bug se si dimenticano:**
- `.srv-testa` e' andata aggiunta alla lista delle sezioni scure che ribaltano
  `--muted`, altrimenti il lead resta inchiostro su nero e non si vede.
- `scroll-margin-top` sui blocchi: la barra e' sempre visibile, e senza questo
  un'ancora come `/servizi#art-direction` finisce sotto di lei (misurato: -26px
  prima, +82px dopo).

**Due inciampi di quella sezione, per memoria:**
- Nella versione coi percorsi, la punta della freccia era disegnata coi bordi
  su un secondo pseudo-elemento: ma **un pseudo non puo' avere un suo pseudo**,
  e finiva sull'angolo della pillola. Si risolve mettendo linea e punta in
  un'unica immagine SVG inline nel `background`. (Sezione poi scartata, ma la
  trappola vale in generale.)
- `.stacco` e' andata aggiunta alla lista delle sezioni scure che ribaltano
  `--muted`, come era stato per `.srv-testa`. E' il terzo giro che questa cosa
  morde: **ogni volta che nasce una sezione scura, va in quella lista**.
- L'alone arancione e' alla sua terza posizione diversa: basso a sinistra in
  home, fianco destro nella testata servizi, alto a destra nello stacco. Sono
  lo stesso effetto ma non sembrano la stessa sezione.

### Indice vivo (il momento "wow")

Prima versione: un muro con i diciotto servizi che si accendevano sotto il
cursore. Concetto apprezzato, **scartato perche' la sezione era troppo grande**
(la pagina passava da 6002 a 7073px di altezza per un effetto decorativo).

Seconda versione, quella in uso: invece di **aggiungere** una sezione, rende
vivo lo spazio che c'era gia'. La colonna di sinistra era vuota per tre quarti;
adesso e' un indice appiccicato che porta:

- **La cifra dell'area corrente**, grande e arancione. Quando si passa da
  un'area all'altra quella che esce sale e svanisce, quella che entra arriva da
  sotto sfocata e **si accende** con un lampo di `text-shadow`: e' lo stesso
  gesto del marchio nell'intro, ridotto a un numero.
- **Un binario con il segmento acceso** che scorre sulla voce attiva, con alone
  arancione.
- **Voci cliccabili** che portano al blocco.

Costo in altezza: **+380px** contro i +1071 del muro, e la colonna del testo e'
piu' larga di prima, quindi la pagina respira meglio invece di allungarsi.

- Sotto i 900px l'indice si nasconde: su una colonna non serve, i titoli sono
  in linea nei blocchi.
- Con `prefers-reduced-motion` la cifra cambia senza animazione e lo scroll dei
  salti e' istantaneo. Verificato: la classe `cambia` non viene applicata.
- `void cifra.offsetWidth` fra `remove` e `add` della classe: senza il reflow
  forzato il browser non rianima, e la cifra cambierebbe di scatto.
- Misurati **60 fps** scorrendo.

**Alone arancione nella testata**: stessa famiglia di `.hero__glow` in home ma
**dalla parte opposta** — qui sale dal fianco destro, dove il titolo lascia
spazio vuoto, mentre in home sta in basso a sinistra. Cosi' la testata non e'
la copia della hero, e il calore riempie il vuoto invece di stare sotto al
testo (il lead guadagna anche in contrasto: 7,83:1 contro 5,23:1 della
versione a sinistra). Le percentuali sono riproporzionate perche' la testata e'
alta ~880px e non una schermata intera: coi valori originali meta' gradiente
cadeva fuori dall'inquadratura e l'effetto non si vedeva.

**Titolo**: "Dall'idea a **come ti vedono.**", con la seconda parte in
arancione. La versione precedente, "a tutto il resto", e' stata scartata dal
cliente perche' sminuiva i lavori. Sotto i 400px la base della `clamp` scende,
altrimenti la seconda riga andava a capo e il titolo diventava di tre righe:
verificato a 17 larghezze fra 320 e 1920px.

> **Hover delle domande a 2,03:1.** Il cliente ha chiesto l'arancione di marca
> (`#ff9900`) al posto di `--orange-deep`, che era a 3,72:1. Il testo e' 19px
> bold = 14,2pt, quindi "testo grande": la soglia AA e' 3:1 e **l'arancione di
> marca non la raggiunge**. Lo stato a riposo resta a 16,19:1, quindi la domanda
> e' sempre leggibile e il calo riguarda solo il passaggio del mouse. Se si
> volesse rientrare nella soglia tenendo l'arancione vero: lasciare il testo
> scuro e portare l'arancione sul segno +/- e su una sottolineatura.

**Sostanza della pagina.**
- **Le descrizioni delle aree sono lunghe e senza cap sulla misura**: usano
  tutta la colonna (misurato: 95-100% della larghezza disponibile). C'era un
  `max-width: 48ch` che le troncava a meta' colonna; e' stato tolto su richiesta
  del cliente. Dentro la prosa e' rientrata anche la parte concreta che stava
  nei blocchi "Cosa ricevi", poi eliminati: cosa arriva alla consegna, come si
  preparano gli esecutivi, cosa resta in mano.
- **I tre patti** (`.stacco`): tre card su fondo scuro fra le sei aree e le
  domande, sul **perche' scegliere loro**: parli con chi disegna, il preventivo
  e' un numero deciso prima, le date sono scritte. L'argomento e'
  **strutturale, non una vanteria**: uno studio piccolo non puo' promettere di
  essere il piu' bravo, ma puo' garantire che chi risponde e' chi lavora.

  **Le card sono in vetro**, e sul fondo scuro funziona perche' c'e' l'alone
  arancione da sfocare dietro: per questo `.stacco__glow` ha due macchie in
  basso, non solo l'angolo in alto. Senza niente dietro, una card translucida
  e' indistinguibile da un rettangolo grigio.

  **La luce segue il cursore dentro la card** (`.patto__luce`): e' il concetto
  del "muro acceso" — piaciuto ma scartato perche' voleva una sezione enorme —
  ridotto a un riquadro. Due variabili CSS aggiornate su `pointermove`, nessun
  rAF: il movimento del puntatore e' gia' il clock. Su touch non si attiva, con
  `prefers-reduced-motion` e' `display: none`.

  **Trappola, la seconda volta che morde:** un `filter` sulla card o su un suo
  antenato spegne il `backdrop-filter`. Il reveal standard applica
  `filter: blur(5px)` e poi `blur(0)` — che e' comunque un filter. Per questo le
  card usano `data-reveal="soft"`, la variante che non applica filtri in nessuno
  dei due stati. Verificato a runtime che nessun antenato abbia un `filter`.

  Contrasti misurati sul vetro: peggiore **5,81:1** a riposo e **4,47:1** con la
  luce accesa (sul numero, che e' testo grande: soglia 3:1).

  *Storia di questo spazio:* tre card bianche (scartate), tre righe coi percorsi
  01 -> 02 (scartate), una frase sola senza card (piaciuta la forma, non il
  testo), e infine queste. Il fondo scuro e' l'unica cosa rimasta da subito.

  > **Da far confermare a Simone:** "numero fisso deciso prima" e "date scritte"
  > sono impegni, non descrizioni. Coerenti col preventivo che abbiamo fatto,
  > ma vanno validati.

- **Domande**: `<details>`/`<summary>` nativi, quindi apertura, tastiera e
  lettori di schermo funzionano senza JS.

> **Da far confermare a Simone:** le risposte su tempi, preventivo a prezzo
> fisso e **proprieta' dei file sorgente** sono impegni verso il cliente finale,
> non descrizioni. Sono scritte come le abbiamo impostate nel preventivo, ma
> vanno validate prima della pubblicazione.

**Titolo della testata**: "Dall'idea a tutto il resto." in Archivo 800, lo
stesso della hero in home, con "resto." in arancione. I titoli delle quattro
aree restano in **Anton** per scelta del cliente.

**L'intro neon si gioca una volta per sessione** (`sessionStorage`), non a ogni
caricamento: tornando sulla home da un'altra pagina non si rivede. Chiudendo la
scheda la sessione si svuota, quindi una visita nuova la rivede. In finestra
privata `sessionStorage` puo' lanciare un'eccezione: e' dentro un try/catch e
nel dubbio l'intro parte.

## Pagina progetti (`progetti.html`)

Seconda pagina interna, a URL pulita `/progetti`.

> **"Lavori" e' stato rinominato "Progetti" in tutto il sito**: voce di menu,
> menu mobile, footer, bottone della hero ("Guarda i progetti"), l'id della
> sezione in home (`#lavori` -> `#progetti`), il selettore in `main.js` che
> guida lo scroll orizzontale e la regola della modalita' anteprima nel CSS.
> Verificato che nelle tre pagine non resti **nessun** riferimento a
> `/lavori`, `#lavori` o "Lavori".

**Dodici progetti** (erano sei): Arancy, Aria, Patty Burger, Chiara Moroni,
Jamile., Simoa, Pexo, Lillium, Saporito, aureo., Rusty, LM.

**Impaginazione a griglia.** La prima versione erano righe alternate con la foto
che cambiava lato: bella con sei progetti, insostenibile con dodici (avrebbe
superato i 13.000px). Ora e' una griglia a tre colonne con la **colonna
centrale sfalsata** verso il basso, cosi' non sembra una tabella. Dodici
progetti stanno in **5.226px**, meno dei 6.607 che prima servivano per sei.

- Due colonne sotto i 1000px (sfalsata la seconda), una sotto i 620px (niente
  sfalsamento: su una colonna non avrebbe senso).
- Foto a `aspect-ratio: 4 / 5`, il formato dei file: nessun ritaglio.
- `data-reveal="soft"`: le schede entrano senza sfocatura, che su dodici
  immagini sarebbe la parte piu' costosa da comporre.
- Sotto ogni scheda i **rimandi alle aree della pagina servizi**
  (`/servizi#brand-identity`), come testo sottolineato invece che come pillole:
  con dodici schede le pillole pesavano troppo. Verificato che il salto atterri
  inquadrato e aggiorni l'indice della pagina servizi.
- Foto ricompresse a qualita' 82: **10,7 MB -> 1,4 MB** per dodici immagini.

**I testi dei dodici progetti sono scritti da noi**, dedotti dalle immagini.
Vanno fatti validare a Simone. In particolare il dodicesimo: il marchio e' un
monogramma **LM** in un cerchio, senza un nome per esteso leggibile nella foto,
quindi la scheda lo chiama cosi' e lo descrive come "studio professionale".

## Pagina studio (`studio.html`)

Terza pagina interna, URL pulita `/studio`. Le informazioni vengono dalla pagina
"about" del vecchio sito Google Sites, **riscritte**, non copiate.

**Cosa c'e' di vero** (dalla fonte): Simidea e' uno studio creativo indipendente
fondato da **Simone Lorenti**, CEO, graphic designer, **18 anni**; ha pubblicato
**due libri**, *Per Sempre* e *Non Restare a Guardare*; sede in **Via Adamello 29,
Gorla Minore (VA)**; servizi di identita' visiva, progettazione grafica,
fotografia, comunicazione e direzione creativa.

**Struttura:** testata scura → "Chi c'e' dietro" (storia + tre dati) → "I libri"
(fascia scura con due card in vetro) → "Dove siamo" (indirizzo e contatti) → CTA.

- **I due libri sono il pezzo distintivo della pagina**: nessun altro studio li
  ha. Presentati come due oggetti tipografici in vetro sulla fascia scura, con
  l'alone dietro che da' loro qualcosa da sfocare.
- `.libri` e' andata aggiunta alla lista delle sezioni scure che ribaltano
  `--muted` (quarta volta che serve).
- Sesta... anzi quinta posizione dell'alone: in alto a sinistra nella testata,
  alto-destra nella fascia dei libri.

> **Attenzione al dato "18 anni": invecchia.** Fra un anno sara' falso e nessuno
> se ne accorgera'. Se si vuole un dato che non scade, meglio sostituirlo con
> l'anno di fondazione — che pero' **non e' scritto da nessuna parte nella
> fonte**, quindi va chiesto a Simone. Per ora il numero resta perche' e'
> verificabile oggi.

> **Da far confermare:** la frase "oggi affianca aziende, professionisti e
> attivita'" viene dalla fonte, ma il resto del testo e' riscritto da noi.

**Due misure che hanno dato numeri assurdi, e perche':**
- `1,05:1` sui titoli dei libri: la card in vetro ha uno sfondo semitrasparente
  biancastro, e lo script lo ha preso per il fondo reale invece del nero sotto.
  Misurato sui pixel: **12,4 e 13,45:1**.
- Prima ancora, sui patti della pagina servizi, il **cursore personalizzato**
  del sito finiva nel campione perche' sta sotto il puntatore. Da allora le
  misure di contrasto lo nascondono.

## Popup promo (SIMIDEALS)

Costruito dal JS (`main.js`, blocco "popup promo"), non dal markup: cosi' sta in
un posto solo e compare su tutte e quattro le pagine. Senza JS non appare, ed e'
giusto — e' promozione, non contenuto.

**Per cambiare la promo basta l'oggetto `PROMO`** in cima al blocco: date,
titolo, scaglioni e nota legale.

- **Le date sono una finestra vera.** Fuori da `dal`–`al` il popup non esce.
  Un popup che annuncia uno sconto scaduto fa piu' danni che bene, e nessuno si
  ricorda di toglierlo a mano. Verificato: il 6 ottobre e il 20 novembre non
  compare, il 20 ottobre si.
- **Una volta per sessione** (`sessionStorage`), come l'intro. Cambiando pagina
  non ricompare.
- Aspetta che l'intro abbia finito: 3,4s sulla home dove l'intro gioca, 1,3s
  sulle pagine interne dove non c'e'.
- Modale fatta come si deve: `role="dialog"`, `aria-modal`, fuoco che entra sul
  pulsante di chiusura e **resta dentro** (Tab cicla), Esc chiude, click sul
  fondo chiude, scroll bloccato, fuoco restituito a dove stava.
- Grafica ripresa dal materiale social del cliente: pillole in vetro, testo
  arancione acceso, e la pillola piu' conveniente che brilla di piu' (`--f`
  cresce con lo sconto e guida sfondo, bordo e bagliore).

> **Nota:** sulla locandina del cliente l'email e' scritta `info@imidea.it`,
> senza la "s". Nel popup e' corretta.

**Tre misure sbagliate di fila sulla stessa cosa**, vale la pena ricordarle:
il contrasto del testo nelle pillole sembrava 1,93:1, poi 1,26:1, poi 1,98:1.
Erano tutti artefatti: (1) il colore di riferimento era fisso mentre quello
reale cambiava per pillola, (2) la pillola e' a **bordi tondi** e il riquadro
che campionavo includeva gli angoli *fuori* da essa, dove si vede l'alone del
pannello. Campionando solo l'interno: **14,1-16,5:1**. Nessun problema, e la
"correzione" che avevo applicato nel frattempo e' stata annullata.

## Sezione "Dicono di noi"

**Quattro recensioni su sei sono VERE**, fornite dal cliente: Simidea User 01
(Social Media Management), 02 (Brand Identity), 03 (Shooting Fotografico & Art
Direction) e 05 (Graphic Design). Testo trascritto alla lettera, emoji comprese.

> **Due sono ancora SEGNAPOSTO** — Simidea User 06 e 07 — marcate con
> `data-segnaposto="recensione-inventata"` sulla singola card, quindi si
> ritrovano con un grep. Da sostituire appena arrivano quelle vere.

**L'attribuzione segue la convenzione del cliente**: "Simidea User NN" piu' il
servizio, non nomi di persona. Viene dai caroselli che pubblica su Instagram, e
risolve due problemi insieme — non espone i clienti e non costringe a inventare
nomi di persone per le card segnaposto. I numeri 06 e 07 sono stati scelti
apposta **fuori dalla sequenza reale** (01, 02, 03, 05) per non collidere con
una recensione vera che il cliente potrebbe avere.

- Sta fra `process` (bianco) e `contact` (nero): la prova sociale e' l'ultima
  spinta prima della CTA.
- Fondo `--sand`, l'unico token di palette finora inutilizzato. Serve il cambio
  di passo: tre sezioni chiare di fila si impastavano.
- **E' un carosello.** La pista e' un contenitore che scorre davvero
  (`overflow-x` + `scroll-snap`), non un `transform` da tenere sincronizzato:
  cosi' swipe sul telefono, rotella orizzontale sul trackpad e frecce della
  tastiera funzionano senza scrivere una riga. Frecce e pallini muovono lo
  stesso scroll.
- Mostra 3 card per volta, 2 sotto i 1000px, 1 sotto i 660px. I pallini sono
  le **pagine**, calcolate a runtime da quante card ci stanno intere: 2 su
  desktop, 3 su tablet, 6 su telefono.
- Avanza da solo ogni 6s, ma si ferma se il mouse ci passa sopra, se qualcosa
  dentro prende il fuoco, se la scheda non e' in primo piano o se la sezione
  e' fuori schermo. **Dopo un gesto esplicito** (freccia, pallino, swipe,
  rotella) non riparte piu': il comando resta all'utente.
- Con `prefers-reduced-motion` l'avanzamento automatico non parte affatto e la
  pista scorre senza animazione, ma frecce e pallini restano funzionanti.
  Verificato.
- `min-height: 100%` sulla card piu' `align-items: stretch` sulla pista: le
  card sono tutte della stessa altezza. `grid-template-rows: auto 1fr auto`
  tiene la firma in fondo anche quando la citazione e' corta.
- Il titolo sta su una riga sola fino a 390px. Sotto andrebbe a capo, quindi
  **solo sotto i 400px** la base della `clamp` scende: restringere la scala a
  tutte le larghezze avrebbe reso questo titolo 5px piu' piccolo degli altri
  ovunque, per un problema che esiste solo sui telefoni stretti.
- Markup semantico: `<figure>` + `<blockquote>` + `<figcaption>`. Le stelle
  hanno `role="img"` con `aria-label`, altrimenti uno screen reader leggerebbe
  cinque asterischi.
- Contrasti misurati: citazione e nome 17,04:1, riga dell'attivita' 5,48:1.

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

## Pagine legali

Tre pagine autoconsistenti (HTML + CSS inline, nessuna dipendenza da `style.css`):

| File | URL | Contenuto |
|---|---|---|
| `privacy.html` | `/privacy` | Informativa ex artt. 13-14 GDPR |
| `cookie-policy.html` | `/cookie-policy` | Nessun cookie; le due chiavi di `sessionStorage` |
| `termini.html` | `/termini` | Condizioni d'uso, preventivi, recesso del consumatore, Simideals |

Sono **autoconsistenti di proposito**: lo stesso file è copiato anche in
`Simidea-landing/`, così `simidea.it/privacy` funziona sia adesso (dominio sulla
landing) sia dopo lo switch del 20 ottobre (dominio sul sito), senza che il link
nel piè di pagina di un documento legale debba puntare a un indirizzo `.vercel.app`.

**Conseguenza: le tre pagine esistono in due copie.** Se ne modifichi una, copiala
nell'altro repo. Lo stile condiviso vive nel blocco `<style>` di `privacy.html`:
`cookie-policy.html` e `termini.html` sono generate riusando quella testa, quindi
una modifica allo stile va fatta lì e ripropagata.

Il contenuto non è generico: descrive quello che il sito fa davvero, verificato nel
codice prima di scriverlo (nessun cookie, nessun analytics, Google Fonts come unico
trasferimento verso gli USA insieme all'hosting). Se si aggiunge uno strumento di
statistica o di tracciamento, **prima** va aggiornata la cookie policy e va messo un
banner di consenso: oggi non c'è perché non c'è niente da consentire.

### Dati identificativi
`Simidea di Simone Lorenti` · Via Adamello 29, 21055 Gorla Minore (VA) · P. IVA
`04159240128` (codice di controllo verificato). Compaiono nel piè di pagina delle
quattro pagine del sito, nelle tre pagine legali e nelle due email in
`Simidea-newsletter/`.

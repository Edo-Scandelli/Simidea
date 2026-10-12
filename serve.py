#!/usr/bin/env python3
"""Server statico per la bozza: disattiva la cache, così ogni modifica
a CSS/JS si vede al primo reload senza Cmd+Shift+R."""
import functools, http.server, json, os, re, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4545

class NoCache(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # URL pulite come su Vercel: /servizi serve servizi.html
        self.path = self.pulisci(self.path)
        super().do_GET()

    def do_POST(self):
        """Finge /api/contatto: in locale non c'e' Vercel e non si spedisce
        niente, ma i controlli sono gli stessi della funzione vera, cosi' il
        modulo si prova davvero invece che a vuoto."""
        if self.path.split("?")[0] != "/api/contatto":
            return self.send_error(404)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            d = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            d = {}
        def rispondi(codice, corpo):
            testo = json.dumps(corpo).encode()
            self.send_response(codice)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(testo)))
            self.end_headers()
            self.wfile.write(testo)
        if str(d.get("azienda", "")).strip():
            return rispondi(200, {"ok": True})            # trappola: finto successo
        email = str(d.get("email", "")).strip()
        cifre = len(re.sub(r"\D", "", str(d.get("telefono", ""))))
        if not str(d.get("nome", "")).strip() or not str(d.get("cognome", "")).strip() \
           or not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email) or cifre < 8:
            return rispondi(400, {"ok": False, "errore": "Dati incompleti"})
        print("  [modulo] richiesta da", d.get("nome"), d.get("cognome"), "-", email)
        rispondi(200, {"ok": True})

    def pulisci(self, path):
        base = path.split("?", 1)[0].split("#", 1)[0]
        if base.endswith("/") or "." in base.rsplit("/", 1)[-1]:
            return path
        candidato = os.path.join(os.path.dirname(os.path.abspath(__file__)), base.lstrip("/") + ".html")
        return base + ".html" + path[len(base):] if os.path.isfile(candidato) else path

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    address_family = __import__("socket").AF_INET6   # accetta anche IPv4

handler = functools.partial(NoCache, directory=os.path.dirname(os.path.abspath(__file__)))
with Server(("::", PORT), handler) as httpd:
    print(f"http://localhost:{PORT}  (Ctrl+C per fermare)")
    httpd.serve_forever()

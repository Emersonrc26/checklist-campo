// Guarda o app no aparelho para funcionar sem internet.
// Gerado por build-pwa.ps1 a partir de sw-modelo.js (não edite o sw.js das pastas pwa diretamente).
const VERSION = "v10";
// O app oficial e o de teste ficam no mesmo endereço (emersonrc26.github.io) e dividem o armazenamento
// de cache do navegador: cada um só mexe nos caches com o próprio prefixo.
const PREFIX = "relatorios-gpbr-oficial-";
const LEGACY = ["checklist-campo-v"];   // nomes de cache de versões antigas que este app pode apagar
const CACHE = PREFIX + VERSION;
const APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts.css",
  "./logos.js",
  "./fonts/Barlow-400.woff2",
  "./fonts/Barlow-500.woff2",
  "./fonts/Barlow-600.woff2",
  "./fonts/Barlow-700.woff2",
  "./fonts/BarlowCondensed-600.woff2",
  "./fonts/BarlowCondensed-700.woff2",
  "./fonts/IBMPlexMono-500.woff2",
  "./vendor/jspdf.umd.min.js",
  "./vendor/jspdf.plugin.autotable.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// O GitHub Pages manda o navegador guardar os arquivos por 10 minutos. Na instalação de uma
// versão nova, "reload" ignora essa cópia, para não misturar arquivos novos com antigos.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(APP.map(u => new Request(u, {cache: "reload"}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k !== CACHE && (k.startsWith(PREFIX) || LEGACY.some(p => k.startsWith(p))))
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Página: tenta a rede por até 3 s, sem a cópia de 10 minutos do navegador; sem sinal, abre a guardada.
  if (req.mode === "navigate") {
    const net = fetch(req.url, {cache: "no-store", credentials: "same-origin"}).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
      return r;
    });
    const slow = new Promise(res => setTimeout(res, 3000)).then(() => caches.match("./index.html", {cacheName: CACHE}));
    e.respondWith(Promise.race([net, slow]).then(r => r || net).catch(() => caches.match("./index.html", {cacheName: CACHE})));
    return;
  }
  // Demais arquivos: cache primeiro (só o deste app).
  e.respondWith(caches.open(CACHE).then(c => c.match(req)).then(hit => hit || fetch(req)));
});

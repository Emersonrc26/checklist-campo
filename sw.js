// Guarda o app no aparelho para funcionar sem internet.
// Ao publicar uma versão nova, aumente VERSION para os celulares baixarem a atualização.
const VERSION = "v2";
const CACHE = "checklist-campo-" + VERSION;
const APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts.css",
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

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Página: tenta a rede por até 3 s (pega atualizações); sem sinal, abre a cópia guardada.
  if (req.mode === "navigate") {
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); } return r; });
    const slow = new Promise(res => setTimeout(res, 3000)).then(() => caches.match("./index.html"));
    e.respondWith(Promise.race([net, slow]).then(r => r || net).catch(() => caches.match("./index.html")));
    return;
  }
  // Demais arquivos: cache primeiro.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

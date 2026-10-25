// Guarda o app no aparelho para funcionar sem internet.
// Ao publicar uma versão nova, aumente VERSION para os celulares baixarem a atualização.
const VERSION = "v1";
const CACHE = "checklist-campo-" + VERSION;
const FONTS = "checklist-campo-fonts";
const APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
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
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: guarda na primeira vez que abrir com internet.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
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

// Service worker: de app start snel en werkt met een opgeslagen schil als er even geen verbinding is.
// Gegevens (restaurants, bestellingen) komen altijd live van Supabase en worden NIET opgeslagen.
const V = "maashaven-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if(r.method !== "GET") return;
  const u = new URL(r.url);
  if(u.hostname.endsWith("supabase.co") || u.hostname.endsWith("openstreetmap.org")) return;

  if(r.mode === "navigate"){
    if(!/\/(index\.html)?$/.test(u.pathname)) return;           // alleen de app zelf, niet qr.html
    e.respondWith(fetch(r).then(res => {
      const copy = res.clone(); caches.open(V).then(c => c.put("./", copy)); return res;
    }).catch(() => caches.match("./")));                          // eerst netwerk, zodat updates direct zichtbaar zijn
    return;
  }
  if(u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.hostname)){
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => { if(res.ok) caches.open(V).then(c => c.put(r, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

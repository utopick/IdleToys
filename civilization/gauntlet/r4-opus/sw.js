// Caches the page and every sheet listed in art/index.json; serves from cache, refreshes in the background.
const C = "civ-r4opus-v1";
self.addEventListener("install", (e) => e.waitUntil((async () => {
  const c = await caches.open(C), base = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
  await c.addAll(base);
  try { const idx = await (await fetch("art/index.json")).json(); for (const s of idx.sheets) { const j = await (await fetch("art/" + s.json)).json(); await c.addAll(["art/" + s.json, "art/" + j.image]); } } catch (e) {}
  self.skipWaiting();
})()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(C).then(async (c) => { const hit = await c.match(e.request, { ignoreSearch: true }); const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit); return hit || net; }));
});

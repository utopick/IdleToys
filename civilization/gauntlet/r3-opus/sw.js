// Caches the page and every art file listed in art/index.json; serves cache first, refreshes it in the background.
const C = "civ-r3opus-v1";
self.addEventListener("install", (e) => e.waitUntil((async () => {
  const c = await caches.open(C), files = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
  try { const idx = await (await fetch("art/index.json")).json(); for (const s of idx.sheets) { files.push("art/" + s); const j = await (await fetch("art/" + s)).json(); files.push("art/" + j.image); } } catch {}
  await Promise.all(files.map((f) => c.add(f).catch(() => {})));
  self.skipWaiting();
})()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(C).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

// Caches the page and every sheet in art/index.json, then serves cache first (network for the weather only).
const C = "drive-r3opus-v1";
self.addEventListener("install", (e) => e.waitUntil((async () => {
  const c = await caches.open(C);
  const idx = await (await fetch("art/index.json")).json();
  const files = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
  for (const s of idx.sheets) files.push(`art/${s}.png`, `art/${s}.json`);
  await c.addAll(files);
  self.skipWaiting();
})()));
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});

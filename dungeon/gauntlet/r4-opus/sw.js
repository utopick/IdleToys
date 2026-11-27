// Offline cache: index.html, the PWA files and every sheet listed in art/index.json.
const C = "dungeontown-r4-v1";
self.addEventListener("install", (e) => e.waitUntil((async () => {
  const c = await caches.open(C), files = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
  try { const idx = await (await fetch("art/index.json")).json(); for (const j of idx.sheets || []) { files.push("art/" + j); const d = await (await fetch("art/" + j)).json(); if (d.image) files.push("art/" + d.image); } } catch {}
  await c.addAll(files); self.skipWaiting();
})()));
self.addEventListener("activate", (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// Offline cache: index.html plus every sheet in art/index.json (network first, cache as fallback).
const C = "drive-r4-opus-v1";
self.addEventListener("install", (e) => e.waitUntil((async () => {
  const c = await caches.open(C), base = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
  try { const l = await (await fetch("art/index.json")).json(); for (const s of l.sheets) base.push("art/" + s + ".json", "art/" + s + ".png"); } catch {}
  await c.addAll(base); self.skipWaiting();
})()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(C).then((c) => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});

"use strict";
// Muss bei jeder Auslieferung mit APP_VERSION in index.html übereinstimmen (Test T5).
var VERSION = "0.4.0";
var CACHE = "hd-v" + VERSION;
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "fonts/AtkinsonHyperlegible-Regular.woff2",
  "fonts/AtkinsonHyperlegible-Bold.woff2",
  "fonts/SpectralSC-Medium.woff2",
  "fonts/SpectralSC-Bold.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // Seite: erst Netz (damit iOS neue Versionen bekommt), offline aus dem Cache.
    ev.respondWith(
      fetch(req, { cache: "no-cache" }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put("index.html", copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }
  // Schriften, Icons, Manifest: erst Cache.
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); })
  );
});

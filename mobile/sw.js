// Service Worker - Offline buffering
const CACHE_NAME = 'campusguard-v1';
const OFFLINE_QUEUE_KEY = 'cg_offline_queue';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Let all requests pass through normally
  e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })));
});

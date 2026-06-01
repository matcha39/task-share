/* =====================================================
   sw.js — タスクシェア Service Worker
   - キャッシュ戦略: Cache First（静的）/ Network First（GAS API）
   - Push通知: 朝7時タスクリマインダー
   ===================================================== */

const CACHE_NAME = 'taskshare-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// ── インストール: 静的アセットをキャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── アクティベート: 古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── フェッチ戦略 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // GAS APIはNetwork Firstで直接取得（キャッシュしない）
  if (url.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // 静的リソースはCache First
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Push通知の受信（将来のサーバープッシュ対応）──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'タスクシェア';
  const options = {
    body: data.body || '本日の予定を確認してください',
    icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
    tag: data.tag || 'taskshare-reminder',
    renotify: true,
    data: data,
    actions: [
      { action: 'open', title: 'アプリを開く' },
      { action: 'dismiss', title: '閉じる' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 通知クリック処理 ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});

// ── メインスレッドからのメッセージ受信 ──
// showNotification: アプリ側から直接通知を発火させる
self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || 'タスクシェア', {
      body: body || '',
      icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
      tag: tag || 'taskshare',
      renotify: true,
      actions: [
        { action: 'open', title: 'アプリを開く' },
        { action: 'dismiss', title: '閉じる' }
      ]
    });
  }
});

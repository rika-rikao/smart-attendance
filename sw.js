// キャッシュの名前（アプリをアップデートした時はここの v1 を v2, v3 と変更すると確実です）
const CACHE_NAME = 'attendance-pwa-v1';

// 最初からキャッシュしておきたいファイルのリスト
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // 新しいバージョンが見つかったらすぐに待機状態を解除して適用する
  self.skipWaiting();
});

// 2. アクティベート時の処理（古いキャッシュのお掃除）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在の CACHE_NAME と違う古いキャッシュがあれば削除する
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // クライアントをすぐに新しいService Workerの管理下に置く
  self.clients.claim();
});

// 3. 通信時の処理（ネットワーク優先 / Network First）
self.addEventListener('fetch', (event) => {
  // ブラウザの拡張機能などのリクエストは無視する（エラー回避）
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    // まずはネットワーク（サーバー）にリクエストを送る
    fetch(event.request)
      .then((networkResponse) => {
        // サーバーから正常に最新版が取得できた場合
        return caches.open(CACHE_NAME).then((cache) => {
          // 取得した最新データをキャッシュに上書き保存する
          cache.put(event.request, networkResponse.clone());
          return networkResponse; // 最新版を画面に返す
        });
      })
      .catch(() => {
        // ネットワークに繋がらない（オフライン等）の場合は、保存済みのキャッシュを返す
        return caches.match(event.request);
      })
  );
});

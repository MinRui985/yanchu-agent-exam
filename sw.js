// Service Worker — 离线缓存 + 自动更新
const CACHE = 'mrb-v2';
const TO_CACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// 安装：预缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(TO_CACHE).catch(err => {
      // 某个文件可能不存在，不阻塞安装
      console.warn('SW cache addAll:', err);
    }))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// 请求：缓存优先，网络回退
self.addEventListener('fetch', e => {
  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;

  // 跳过 chrome-extension:// 等非 http(s) 请求
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 缓存命中直接返回
      if (cached) return cached;

      // 否则走网络，成功后缓存
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(() => {
        // 网络失败且无缓存 — 返回空（HTML 本身已缓存）
        return new Response('', { status: 408 });
      });
    })
  );
});

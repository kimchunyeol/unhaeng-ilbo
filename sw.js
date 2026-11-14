// 운행일보: 신호가 없을 때도 앱이 열리도록 화면과 도구를 기기에 보관해 둠.
// 기록(파이어베이스)은 여기서 건드리지 않음. 파이어베이스가 자체로 기기에 보관하고 연결되면 올려 줌.
const CACHE = 'unhaeng-v1';
const SAME = ['./', 'index.html', 'jspdf.umd.min.js', 'icon.png'];
const LIBS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js'
];
// 버전이 박힌 도구·글꼴은 한 번 받으면 그대로 씀
const LIB_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SAME).catch(() => {});
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 화면: 인터넷이 되면 늘 새 버전, 안 되면 보관해 둔 것
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req, { ignoreSearch: true })) ||
               (req.mode === 'navigate' ? await c.match('index.html') : undefined) ||
               Response.error();
      }
    })());
    return;
  }

  // 도구·글꼴: 보관해 둔 것이 있으면 바로, 없으면 받아서 보관
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      } catch (err) {
        return Response.error();
      }
    })());
  }
  // 그 밖의 요청(파이어베이스 로그인·저장 등)은 손대지 않음
});

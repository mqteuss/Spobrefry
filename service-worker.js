const CACHE_NAME = 'music-player-v4'; // Versão incrementada para forçar a atualização
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/js/app.js',
    '/js/song-list.js',
    '/images/default-cover.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto e assets principais armazenados');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Cache antigo removido:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Garante que o novo service worker assuma o controle imediatamente
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Estratégia para mídias (músicas e imagens): Cache First, then Network.
    // Salva a música/imagem no cache na primeira vez que é solicitada.
    if (requestUrl.pathname.startsWith('/musics/') || requestUrl.pathname.startsWith('/images/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        // Clona a resposta para poder colocar no cache e retornar
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Retorna a resposta do cache se existir, senão, busca na rede
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return; // Importante para não continuar para a próxima estratégia
    }

    // Estratégia padrão para o resto (App Shell): Cache First.
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
const CACHE_NAME = 'music-player-v4'; // Versão incrementada para forçar a atualização
const SONGS_CACHE_NAME = 'downloaded-songs-cache-v1'; // Mesmo nome usado no app.js
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
                console.log('Cache principal aberto e assets armazenados');
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
                    // Deleta os caches antigos, exceto o de músicas baixadas
                    if (cache !== CACHE_NAME && cache !== SONGS_CACHE_NAME) {
                        console.log('Cache antigo removido:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Se for uma requisição de música (termina com .mp3), use a estratégia "Cache first"
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Se a música estiver no cache, retorna ela
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Se não, busca na rede
                    return fetch(event.request);
                })
        );
    } else {
        // Para todos os outros assets, usa a estratégia "Cache falling back to network"
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});

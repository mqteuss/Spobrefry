const CACHE_NAME = 'music-player-v5'; // Versão incrementada para forçar o recarregamento de TODAS as músicas.
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/js/app.js',
    '/js/song-list.js',
    '/images/default-cover.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    
    // --- MÚSICAS PARA CACHE OFFLINE (Total de 17) ---
    '/musics/Chris Grey - ALWAYS BEEN YOU.mp3',
    '/musics/DJ Snake - U Are My High (Feat. Future).mp3',
    '/musics/LEOWOLF - Romantic Gangster.mp3',
    '/musics/No. 1 Party Anthem.mp3',
    '/musics/RealestK - Senfie.mp3',
    '/musics/The Weeknd.mp3',
    '/musics/Zayn - Lied To.mp3',
    '/musics/505-ArticMonkeys.mp3',
    '/musics/If u think i_m pretty.mp3',
    '/musics/Sweater Weather(MP3_128K).mp3',
    '/musics/Imogen Heap - Headlock (Official Video)(MP3_128K).mp3',
    '/musics/Art Deco(MP3_128K).mp3',
    '/musics/Lady Gaga_ Bruno Mars - Die With A Smile (Official Music Video)(MP3_128K).mp3',
    '/musics/Matt Maeson - Put It on Me(MP3_128K).mp3',
    '/musics/GIVĒON - Heartbreak Anniversary (Audio)(MP3_128K).mp3',
    '/musics/GIVĒON - Make You Mine (Official Lyric Video)(MP3_128K).mp3',
    '/musics/Your Rarest of Flowers(MP3_128K).mp3'
    // ------------------------------------------------
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto e assets principais armazenados');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    // Força o Service Worker a assumir o controle imediatamente
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    event.waitUntil(
        // Remove caches antigos para liberar espaço
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
    // Garante que o Service Worker atualize os clientes imediatamente
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Estratégia Cache-First: Tenta buscar no cache primeiro, se não encontrar, busca na rede.
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se a requisição (música) for encontrada no cache, retorna a versão em cache.
                // Caso contrário, tenta buscar na rede.
                return response || fetch(event.request);
            })
    );
});

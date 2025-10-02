document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const albumCover = document.getElementById('album-cover');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const trackAlbum = document.getElementById('track-album'); // Adicionado para metadados
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const prevBtn = document.getElementById('prev-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const playlistEl = document.getElementById('playlist');
    const shuffleBtn = document.getElementById('shuffle-btn');

    // --- VARIÁVEIS DE ESTADO ---
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    const audio = new Audio();
    const preloadAudio = new Audio(); // Para pré-carregamento

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Carrega uma música específica pelo seu índice na playlist.
     * Atualiza a interface e os metadados da Media Session.
     * @param {number} index - O índice da música a ser carregada.
     */
    function loadSong(index) {
        const song = songs[index];
        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        
        // Usa uma imagem padrão caso a música não tenha uma capa definida
        albumCover.src = song.cover ? `images/${song.cover}` : 'images/default-cover.jpg';
        
        audio.src = `musics/${song.file}`;
        
        updateActivePlaylistItem();
        updateMediaSessionMetadata(); // <-- NOVO: Atualiza a notificação do sistema
    }

    /**
     * Toca a música atual.
     */
    function playSong() {
        audio.play().catch(error => console.error("Erro ao tocar a música:", error));
        preloadNextSong();
    }

    /**
     * Pausa a música atual.
     */
    function pauseSong() {
        audio.pause();
    }

    /**
     * Alterna entre tocar e pausar a música.
     * Esta função é chamada pelo botão principal da interface.
     */
    function togglePlayPause() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    /**
     * Pula para a música anterior.
     */
    function prevSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }

    /**
     * Pula para a próxima música.
     */
    function nextSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }
    
    /**
     * Toca uma música aleatória, garantindo que não seja a mesma que está tocando.
     */
    function playRandomSong() {
        let randomIndex;
        if (songs.length > 1) {
            do {
                randomIndex = Math.floor(Math.random() * songs.length);
            } while (randomIndex === currentSongIndex);
        } else {
            randomIndex = 0;
        }
        currentSongIndex = randomIndex;
        loadSong(currentSongIndex);
        playSong();
    }
    
    /**
     * Ativa ou desativa o modo de reprodução aleatória.
     */
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }
    
    /**
     * Pré-carrega a próxima faixa para uma transição mais suave.
     */
    function preloadNextSong() {
        if (songs.length > 1) {
            let nextIndex;
            if (isShuffle) {
                do {
                    nextIndex = Math.floor(Math.random() * songs.length);
                } while (nextIndex === currentSongIndex);
            } else {
                nextIndex = (currentSongIndex + 1) % songs.length;
            }
            preloadAudio.src = `musics/${songs[nextIndex].file}`;
        }
    }

    // --- ATUALIZAÇÕES DE INTERFACE ---

    /**
     * Atualiza a barra de progresso e os contadores de tempo.
     */
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        if(duration) {
            durationEl.textContent = formatTime(duration);
        }
    }

    /**
     * Formata segundos para o formato M:SS.
     * @param {number} seconds - O tempo em segundos.
     * @returns {string} O tempo formatado.
     */
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /**
     * Define a posição da música com base na interação com a barra de progresso.
     */
    function setProgressFromScrub(e) {
        // Usa e.target.value que é o valor atual do range input
        const newTime = (e.target.value / 100) * audio.duration;
        if (!isNaN(newTime)) {
            audio.currentTime = newTime;
        }
    }

    /**
     * Renderiza a lista de músicas na interface.
     */
    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            // Estrutura para título e artista separados
            li.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-artist">${song.artist}</span>
            `;
            playlistEl.appendChild(li);
        });
    }
    
    /**
     * Destaca a música que está tocando na playlist.
     */
    function updateActivePlaylistItem() {
        const items = document.querySelectorAll('.playlist li');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentSongIndex);
        });
    }
    
    /**
     * Inicia a reprodução de uma música clicada na playlist.
     */
    function playFromPlaylist(e) {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            currentSongIndex = parseInt(targetLi.dataset.index);
            loadSong(currentSongIndex);
            playSong();
        }
    }

    // --- SINCRONIZAÇÃO DE ESTADO E MEDIA SESSION API ---

    /**
     * CORREÇÃO #1: Sincroniza o estado da nossa variável `isPlaying` e da UI
     * com o estado real do elemento <audio>. Isso garante que, se o navegador
     * pausar a música (ex: pela notificação), nossa interface reflita essa mudança.
     */
    function syncPlayState() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    function syncPauseState() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    /**
     * CORREÇÃO #2: Configura a Media Session API.
     * Isso integra o player com a interface do sistema operacional (notificações,
     * controles de mídia, etc.), resolvendo todos os bugs reportados e
     * ajudando a manter a música tocando em segundo plano.
     */
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }

    /**
     * Atualiza as informações da música na notificação do sistema.
     */
    function updateMediaSessionMetadata() {
        if ('mediaSession' in navigator) {
            const song = songs[currentSongIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: song.album || '', // Adicione 'album' ao seu song-list.js se quiser
                artwork: [
                    { src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }
    }

    // --- EVENT LISTENERS ---
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', toggleShuffle);
    
    // Sincroniza a UI com o estado real do áudio
    audio.addEventListener('play', syncPlayState);
    audio.addEventListener('pause', syncPauseState);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', updateProgress); // Atualiza duração assim que carregar

    // 'input' é melhor que 'change' para uma resposta em tempo real
    progressBar.addEventListener('input', setProgressFromScrub);
    
    playlistEl.addEventListener('click', playFromPlaylist);

    // --- INICIALIZAÇÃO ---
    renderPlaylist();
    loadSong(currentSongIndex);
    setupMediaSession();
});

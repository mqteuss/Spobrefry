document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const albumCover = document.getElementById('album-cover');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const trackAlbum = document.getElementById('track-album');
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
    let currentCoverUrl = null; // NOVO: Para gerenciar a URL da capa e evitar memory leaks
    const audio = new Audio();
    const preloadAudio = new Audio();

    // --- FUNÇÕES DE CONTROLE DE MÚSICA ---

    /**
     * Carrega uma música, tentando ler seus metadados (capa, álbum) primeiro.
     * @param {number} index - O índice da música na playlist.
     */
    function loadSong(index) {
        // NOVO: Limpa a URL do objeto da capa anterior para liberar memória
        if (currentCoverUrl) {
            URL.revokeObjectURL(currentCoverUrl);
            currentCoverUrl = null;
        }

        const song = songs[index];
        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        trackAlbum.textContent = ''; // Limpa o álbum antes de tentar carregar
        albumCover.src = 'images/default-cover.jpg'; // Reseta para a padrão
        
        audio.src = `musics/${song.file}`;
        
        // NOVO: Usa jsmediatags para ler metadados do arquivo MP3
        const jsmediatags = window.jsmediatags;
        jsmediatags.read(audio.src, {
            onSuccess: function(tag) {
                console.log("Metadados lidos:", tag);
                const tags = tag.tags;

                // Define o título do álbum se existir
                if (tags.album) {
                    trackAlbum.textContent = tags.album;
                }
                
                // Define a capa do álbum se existir
                if (tags.picture) {
                    const { data, format } = tags.picture;
                    const base64String = data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                    const imageUrl = `data:${format};base64,${window.btoa(base64String)}`;
                    albumCover.src = imageUrl;
                }
                updateMediaSessionMetadata(); // Atualiza metadados com as novas infos
            },
            onError: function(error) {
                console.log('Erro ao ler metadados:', error.type, error.info);
                // Se falhar, usa a capa definida no song-list.js ou a padrão
                albumCover.src = song.cover ? `images/${song.cover}` : 'images/default-cover.jpg';
                updateMediaSessionMetadata();
            }
        });
        
        updateActivePlaylistItem();
    }

    /**
     * Toca a música atual e pré-carrega a próxima.
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
     * NOVO: Função central para trocar de faixa com efeito de fade.
     * @param {number} newIndex - O índice da nova música a ser tocada.
     */
    function fadeAndChangeTrack(newIndex) {
        if (audio.duration && isPlaying) {
            let currentVolume = audio.volume;
            const fadeOutInterval = setInterval(() => {
                currentVolume = Math.max(0, currentVolume - 0.1);
                audio.volume = currentVolume;
                if (currentVolume <= 0) {
                    clearInterval(fadeOutInterval);
                    currentSongIndex = newIndex;
                    loadSong(currentSongIndex);
                    // O 'playSong' será chamado pelo evento 'loadeddata' para garantir que a música esteja pronta
                }
            }, 40); // Diminui o volume a cada 40ms
        } else {
            // Se não estiver tocando, troca a música instantaneamente
            currentSongIndex = newIndex;
            loadSong(currentSongIndex);
            playSong();
        }
    }
    
    // NOVO: Listener para o evento 'loadeddata', que dispara quando a música está pronta para tocar
    audio.addEventListener('loadeddata', () => {
        // Garante que o fade-in só aconteça se a música foi iniciada
        if (isPlaying) {
            fadeInAudio();
        }
    });

    /**
     * NOVO: Aumenta gradualmente o volume da música (fade-in).
     */
    function fadeInAudio() {
        audio.volume = 0; // Começa com volume 0
        playSong();
        let currentVolume = 0;
        const fadeInInterval = setInterval(() => {
            currentVolume = Math.min(1, currentVolume + 0.1);
            audio.volume = currentVolume;
            if (currentVolume >= 1) {
                clearInterval(fadeInInterval);
            }
        }, 40);
    }
    
    function togglePlayPause() {
        isPlaying ? pauseSong() : playSong();
    }
    
    function prevSong() {
        const newIndex = isShuffle ? getRandomIndex() : (currentSongIndex - 1 + songs.length) % songs.length;
        fadeAndChangeTrack(newIndex);
    }

    function nextSong() {
        const newIndex = isShuffle ? getRandomIndex() : (currentSongIndex + 1) % songs.length;
        fadeAndChangeTrack(newIndex);
    }

    function getRandomIndex() {
        let randomIndex;
        if (songs.length <= 1) return 0;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentSongIndex);
        return randomIndex;
    }
    
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }

    function preloadNextSong() {
        if (songs.length > 1) {
            const nextIndex = isShuffle ? getRandomIndex() : (currentSongIndex + 1) % songs.length;
            preloadAudio.src = `musics/${songs[nextIndex].file}`;
        }
    }

    // --- ATUALIZAÇÕES DE INTERFACE ---
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        if (duration) durationEl.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function setProgressFromScrub(e) {
        const newTime = (e.target.value / 100) * audio.duration;
        if (!isNaN(newTime)) audio.currentTime = newTime;
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.innerHTML = `<span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span>`;
            playlistEl.appendChild(li);
        });
    }

    function updateActivePlaylistItem() {
        document.querySelectorAll('.playlist li').forEach((item, index) => {
            item.classList.toggle('active', index === currentSongIndex);
        });
    }

    function playFromPlaylist(e) {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newIndex = parseInt(targetLi.dataset.index);
            if (newIndex !== currentSongIndex) {
                 fadeAndChangeTrack(newIndex);
            }
        }
    }

    // --- SINCRONIZAÇÃO DE ESTADO E MEDIA SESSION API ---
    function syncPlayState() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    function syncPauseState() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }

    function updateMediaSessionMetadata() {
        if ('mediaSession' in navigator) {
            const song = songs[currentSongIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle.textContent,
                artist: trackArtist.textContent,
                album: trackAlbum.textContent,
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }

    // --- EVENT LISTENERS ---
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', toggleShuffle);
    audio.addEventListener('play', syncPlayState);
    audio.addEventListener('pause', syncPauseState);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', updateProgress);
    progressBar.addEventListener('input', setProgressFromScrub);
    playlistEl.addEventListener('click', playFromPlaylist);

    // --- INICIALIZAÇÃO ---
    renderPlaylist();
    loadSong(currentSongIndex);
    setupMediaSession();
});

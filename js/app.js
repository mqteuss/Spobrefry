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
    const audio = new Audio();
    const preloadAudio = new Audio();

    // --- WEB AUDIO API ---
    let audioContext;
    let sourceNode;
    let bassFilter, midFilter, trebleFilter;
    let compressor; // <-- NOVO: Compressor para evitar clipping
    let audioApiInitialized = false;

    /**
     * Inicializa a Web Audio API com um Compressor/Limiter para evitar distorção.
     */
    function setupAudioAPI() {
        if (audioApiInitialized) return;
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);

        // Cria os Filtros do Equalizador
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 300;

        midFilter = audioContext.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1200;
        midFilter.Q.value = 1;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000;

        // --- CORREÇÃO DO XIADO ---
        // 1. Cria o Compressor
        compressor = audioContext.createDynamicsCompressor();
        
        // 2. Configura o compressor para atuar como um "limiter"
        compressor.threshold.setValueAtTime(-1, audioContext.currentTime); // Atua em sons muito altos, perto do limite
        compressor.knee.setValueAtTime(0, audioContext.currentTime);      // Curva "dura", limitando precisamente
        compressor.ratio.setValueAtTime(20, audioContext.currentTime);    // Ratio máximo para compressão forte
        compressor.attack.setValueAtTime(0.001, audioContext.currentTime);// Reage quase instantaneamente
        compressor.release.setValueAtTime(0.1, audioContext.currentTime); // Libera a compressão suavemente

        // 3. Conecta os nós na nova ordem: Fonte -> Filtros -> Compressor -> Alto-falantes
        sourceNode.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(compressor); // O último filtro agora se conecta ao compressor
        compressor.connect(audioContext.destination); // O compressor se conecta à saída de áudio

        audioApiInitialized = true;
        console.log("Web Audio API inicializada com Limiter.");
    }

    // --- FUNÇÕES DE CONTROLE DE MÚSICA (sem alterações daqui para baixo) ---

    function loadSong(index) {
        const song = songs[index];
        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        albumCover.src = song.cover ? `images/${song.cover}` : 'images/default-cover.jpg';
        audio.src = `musics/${song.file}`;
        updateActivePlaylistItem();
        updateMediaSessionMetadata();
    }

    function playSong() {
        if (!audioApiInitialized) {
            setupAudioAPI();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audio.play().catch(error => console.error("Erro ao tocar a música:", error));
        preloadNextSong();
    }

    function pauseSong() {
        audio.pause();
    }

    function togglePlayPause() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    function prevSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }

    function nextSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }
    
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
    
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }
    
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

    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        if(duration) {
            durationEl.textContent = formatTime(duration);
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function setProgressFromScrub(e) {
        const newTime = (e.target.value / 100) * audio.duration;
        if (!isNaN(newTime)) {
            audio.currentTime = newTime;
        }
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-artist">${song.artist}</span>
            `;
            playlistEl.appendChild(li);
        });
    }
    
    function updateActivePlaylistItem() {
        const items = document.querySelectorAll('.playlist li');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentSongIndex);
        });
    }
    
    function playFromPlaylist(e) {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            currentSongIndex = parseInt(targetLi.dataset.index);
            loadSong(currentSongIndex);
            playSong();
        }
    }

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
                title: song.title,
                artist: song.artist,
                album: song.album || '',
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
    
    audio.addEventListener('play', syncPlayState);
    audio.addEventListener('pause', syncPauseState);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', updateProgress);

    progressBar.addEventListener('input', setProgressFromScrub);
    
    playlistEl.addEventListener('click', playFromPlaylist);

    document.getElementById('eq-bass').addEventListener('input', (e) => {
        if (bassFilter) bassFilter.gain.value = e.target.value;
    });
    document.getElementById('eq-mids').addEventListener('input', (e) => {
        if (midFilter) midFilter.gain.value = e.target.value;
    });
    document.getElementById('eq-treble').addEventListener('input', (e) => {
        if (trebleFilter) trebleFilter.gain.value = e.target.value;
    });

    // --- INICIALIZAÇÃO ---
    renderPlaylist();
    loadSong(currentSongIndex);
    setupMediaSession();
});

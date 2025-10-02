document.addEventListener('DOMContentLoaded', () => {
    const jsmediatags = window.jsmediatags;

    // Elementos do DOM
    const albumCover = document.getElementById('album-cover');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const prevBtn = document.getElementById('prev-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const playlistEl = document.getElementById('playlist');

    // Variáveis de estado
    let currentSongIndex = 0;
    let isPlaying = false;
    const audio = new Audio();
    audio.preload = 'metadata';
    const defaultCover = 'images/default-cover.jpg';

    // ===== LÓGICA DE CARREGAMENTO E PLAYBACK (CORRIGIDA) =====

    function loadSong(index, shouldPlay = false) {
        albumCover.style.opacity = '0.5'; // Feedback visual de carregamento
        currentSongIndex = index;
        const song = songs[index];
        const songPath = `musics/${song.file}`;
        audio.src = songPath;
        
        // Limpa a barra de progresso imediatamente
        progressBar.value = 0;
        currentTimeEl.textContent = "0:00";
        durationEl.textContent = "0:00";

        // Define informações padrão enquanto os metadados carregam
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        albumCover.src = song.cover ? `images/${song.cover}` : defaultCover;
        updateActivePlaylistItem();

        // O evento 'canplay' é a chave. Ele só dispara quando o áudio está PRONTO para tocar.
        audio.addEventListener('canplay', () => {
            durationEl.textContent = formatTime(audio.duration);
            albumCover.style.opacity = '1'; // Restaura a opacidade
            if (shouldPlay) {
                playSong();
            }
        }, { once: true }); // O listener é executado apenas uma vez por carregamento

        // Tenta ler os metadados em paralelo
        jsmediatags.read(songPath, {
            onSuccess: (tag) => {
                const tags = tag.tags;
                trackTitle.textContent = tags.title || song.title;
                trackArtist.textContent = tags.artist || song.artist;

                if (tags.picture) {
                    const { data, format } = tags.picture;
                    let base64String = "";
                    for (let i = 0; i < data.length; i++) {
                        base64String += String.fromCharCode(data[i]);
                    }
                    albumCover.src = `data:${format};base64,${window.btoa(base64String)}`;
                }
                updateMediaSession();
            },
            onError: (error) => {
                console.log('Erro ao ler metadados:', error.type, error.info);
                updateMediaSession(); // Garante que a media session seja atualizada mesmo em caso de erro
            }
        });
    }

    function playSong() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audio.play().catch(error => console.error("Erro no Playback:", error));
        navigator.mediaSession.playbackState = "playing";
    }

    function pauseSong() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audio.pause();
        navigator.mediaSession.playbackState = "paused";
    }

    function togglePlayPause() {
        isPlaying ? pauseSong() : playSong();
    }

    function prevSong() {
        const newIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(newIndex, true); // Carrega a nova música e instrui para tocar
    }

    function nextSong() {
        const newIndex = (currentSongIndex + 1) % songs.length;
        loadSong(newIndex, true); // Carrega a nova música e instrui para tocar
    }
    
    function playFromPlaylist(e) {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newIndex = parseInt(targetLi.dataset.index);
            loadSong(newIndex, true); // Carrega a nova música e instrui para tocar
        }
    }


    // ===== FUNÇÕES AUXILIARES (sem grandes alterações) =====

    function updateProgress() {
        if (audio.duration) {
            progressBar.value = (audio.currentTime / audio.duration) * 100;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    function setProgress(e) {
        if (audio.duration) {
            audio.currentTime = (e.target.value / 100) * audio.duration;
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
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
        document.querySelectorAll('.playlist li').forEach((item) => {
            item.classList.toggle('active', parseInt(item.dataset.index) === currentSongIndex);
        });
    }

    // ===== MEDIA SESSION API =====
    
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }
    
    function updateMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle.textContent,
                artist: trackArtist.textContent,
                album: 'Music Player',
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }

    // ===== EVENT LISTENERS =====

    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    progressBar.addEventListener('input', setProgress);
    playlistEl.addEventListener('click', playFromPlaylist);

    // ===== INICIALIZAÇÃO =====

    function initialize() {
        renderPlaylist();
        loadSong(0, false); // Carrega a primeira música sem tocar
        setupMediaSession();
    }

    initialize();
});
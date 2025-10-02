document.addEventListener('DOMContentLoaded', () => {
    const jsmediatags = window.jsmediatags;

    // Elementos do DOM
    const albumCover = document.getElementById('album-cover');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const trackAlbum = document.getElementById('track-album'); // NOVO: Elemento do álbum
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const prevBtn = document.getElementById('prev-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const playlistEl = document.getElementById('playlist');

    // Variáveis de estado
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffleActive = false;
    const audio = new Audio();
    audio.preload = 'metadata';
    const defaultCover = 'images/default-cover.jpg';

    // ===== LÓGICA DE CARREGAMENTO E PLAYBACK =====

    function loadSong(index, shouldPlay = false) {
        albumCover.style.opacity = '0.5';
        currentSongIndex = index;
        const song = songs[index];
        const songPath = `musics/${song.file}`;
        audio.src = songPath;
        
        progressBar.value = 0;
        currentTimeEl.textContent = "0:00";
        durationEl.textContent = "0:00";

        // Limpa e define informações padrão enquanto os metadados carregam
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        trackAlbum.textContent = ''; // NOVO: Limpa o campo do álbum
        albumCover.src = song.cover ? `images/${song.cover}` : defaultCover;
        updateActivePlaylistItem();

        audio.addEventListener('canplay', () => {
            durationEl.textContent = formatTime(audio.duration);
            albumCover.style.opacity = '1';
            if (shouldPlay) {
                playSong();
            }
        }, { once: true });

        // MODIFICADO: Leitura de metadados agora inclui o álbum
        jsmediatags.read(songPath, {
            onSuccess: (tag) => {
                const tags = tag.tags;
                trackTitle.textContent = tags.title || song.title;
                trackArtist.textContent = tags.artist || song.artist;
                trackAlbum.textContent = tags.album || ''; // NOVO: Define o álbum ou deixa em branco

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
                updateMediaSession();
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
    
    function toggleShuffle() {
        isShuffleActive = !isShuffleActive;
        shuffleBtn.classList.toggle('active', isShuffleActive);
    }

    function prevSong() {
        const newIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(newIndex, true);
    }

    function nextSong() {
        let newIndex;
        if (isShuffleActive) {
            do {
                newIndex = Math.floor(Math.random() * songs.length);
            } while (newIndex === currentSongIndex);
        } else {
            newIndex = (currentSongIndex + 1) % songs.length;
        }
        loadSong(newIndex, true);
    }
    
    function playFromPlaylist(e) {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newIndex = parseInt(targetLi.dataset.index);
            loadSong(newIndex, true);
        }
    }

    // ===== FUNÇÕES AUXILIARES (sem alterações) =====
    function updateProgress() { if (audio.duration) { progressBar.value = (audio.currentTime / audio.duration) * 100; currentTimeEl.textContent = formatTime(audio.currentTime); } }
    function setProgress(e) { if (audio.duration) { audio.currentTime = (e.target.value / 100) * audio.duration; } }
    function formatTime(seconds) { if (isNaN(seconds)) return "0:00"; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    function renderPlaylist() { playlistEl.innerHTML = ''; songs.forEach((song, index) => { const li = document.createElement('li'); li.dataset.index = index; li.innerHTML = `<span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span>`; playlistEl.appendChild(li); }); }
    function updateActivePlaylistItem() { document.querySelectorAll('.playlist li').forEach((item) => { item.classList.toggle('active', parseInt(item.dataset.index) === currentSongIndex); }); }
    
    // ===== MEDIA SESSION API =====
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }
    
    // MODIFICADO: A Media Session agora inclui o álbum
    function updateMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle.textContent,
                artist: trackArtist.textContent,
                album: trackAlbum.textContent || 'Music Player', // NOVO: usa o texto do álbum ou um fallback
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }

    // ===== EVENT LISTENERS =====
    playPauseBtn.addEventListener('click', togglePlayPause);
    shuffleBtn.addEventListener('click', toggleShuffle);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    progressBar.addEventListener('input', setProgress);
    playlistEl.addEventListener('click', playFromPlaylist);

    // ===== INICIALIZAÇÃO =====
    function initialize() {
        renderPlaylist();
        loadSong(0, false);
        setupMediaSession();
    }
    initialize();
});
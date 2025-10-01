document.addEventListener('DOMContentLoaded', () => {
    // Referência para a biblioteca de metadados
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
    const defaultCover = 'images/default-cover.jpg';

    // ===== CARREGAMENTO E METADADOS =====

    function loadSong(index) {
        const song = songs[index];
        const songPath = `musics/${song.file}`;
        audio.src = songPath;
        
        // Define informações padrão imediatamente
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        albumCover.src = song.cover ? `images/${song.cover}` : defaultCover;
        updateActivePlaylistItem();

        // Tenta ler os metadados do arquivo de áudio
        jsmediatags.read(songPath, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                trackTitle.textContent = tags.title || song.title;
                trackArtist.textContent = tags.artist || song.artist;

                // Converte a imagem de capa dos metadados para um URL
                if (tags.picture) {
                    const { data, format } = tags.picture;
                    let base64String = "";
                    for (let i = 0; i < data.length; i++) {
                        base64String += String.fromCharCode(data[i]);
                    }
                    albumCover.src = `data:${format};base64,${window.btoa(base64String)}`;
                }
                
                // Atualiza a Media Session API
                updateMediaSession();
            },
            onError: function(error) {
                console.log('Erro ao ler metadados:', error.type, error.info);
                // Se falhar, garante que a media session seja atualizada com os dados do song-list
                updateMediaSession();
            }
        });
    }

    // ===== CONTROLES DE PLAYBACK =====

    function playSong() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audio.play();
    }

    function pauseSong() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audio.pause();
    }

    function togglePlayPause() {
        isPlaying ? pauseSong() : playSong();
    }

    function prevSong() {
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }

    function nextSong() {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }

    // ===== ATUALIZAÇÃO DA INTERFACE =====

    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }

    function setProgress() {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // ===== PLAYLIST =====

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
    
    // ===== CONTROLE POR FONES (MEDIA SESSION API) =====
    
    function updateMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle.textContent,
                artist: trackArtist.textContent,
                album: 'Offline Player',
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });

            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
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

    renderPlaylist();
    loadSong(currentSongIndex);
});
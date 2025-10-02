document.addEventListener('DOMContentLoaded', () => {
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
    const shuffleBtn = document.getElementById('shuffle-btn');

    // Variáveis de estado
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    const audio = new Audio();
    const preloadAudio = new Audio();

    // Função para pré-carregar a próxima música
    function preloadNextSong() {
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

    // Função para carregar uma música
    function loadSong(index) {
        const song = songs[index];
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        albumCover.src = `images/${song.cover}`;
        audio.src = `musics/${song.file}`;
        updateActivePlaylistItem();
    }
    
    // Função para dar Play
    function playSong() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audio.play();
        preloadNextSong();
    }

    // Função para Pausar
    function pauseSong() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audio.pause();
    }
    
    // Alternar entre Play e Pause
    function togglePlayPause() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    // Ir para a música anterior
    function prevSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }

    // Ir para a próxima música
    function nextSong() {
        if (isShuffle) {
            playRandomSong();
        } else {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(currentSongIndex);
            playSong();
        }
    }
    
    // Tocar uma música aleatória
    function playRandomSong() {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentSongIndex);
        
        currentSongIndex = randomIndex;
        loadSong(currentSongIndex);
        playSong();
    }

    // Ativar/desativar o modo aleatório
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }
    
    // Atualizar a barra de progresso
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }

    // Formatar o tempo (de segundos para M:SS)
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Mudar posição da música pela barra de progresso
    function setProgressFromScrub() {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }

    // Renderizar a playlist na tela
    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.textContent = `${song.title} - ${song.artist}`;
            li.dataset.index = index;
            playlistEl.appendChild(li);
        });
    }
    
    // Marcar a música ativa na playlist
    function updateActivePlaylistItem() {
        const items = document.querySelectorAll('.playlist li');
        items.forEach((item, index) => {
            if (index === currentSongIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Tocar música a partir de um clique na playlist
    function playFromPlaylist(e) {
        if (e.target.tagName === 'LI') {
            currentSongIndex = parseInt(e.target.dataset.index);
            loadSong(currentSongIndex);
            playSong();
        }
    }

    // --- LISTA DE EVENTOS ---
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', toggleShuffle);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    progressBar.addEventListener('input', setProgressFromScrub);
    playlistEl.addEventListener('click', playFromPlaylist);

    // --- INICIALIZAÇÃO ---
    renderPlaylist();
    loadSong(currentSongIndex);
});

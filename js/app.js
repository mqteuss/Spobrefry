document.addEventListener('DOMContentLoaded', () => {
    // ... (toda a parte de seleção de elementos DOM continua a mesma)
    const shuffleBtn = document.getElementById('shuffle-btn');

    // ... (todas as variáveis de estado continuam as mesmas)
    let isShuffle = false;
    const audio = new Audio();
    const preloadAudio = new Audio();

    // --- NOVO: FUNÇÃO PARA INTEGRAR COM A MEDIA SESSION API ---
    function updateMediaSession() {
        // Verifica se o navegador suporta a Media Session API
        if ('mediaSession' in navigator) {
            const song = songs[currentSongIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                // O campo 'album' pode ser usado se você tiver essa informação
                // album: 'Nome do Álbum', 
                artwork: [
                    // É recomendado fornecer vários tamanhos, mas um já funciona
                    { src: `images/${song.cover}`, sizes: '512x512', type: 'image/jpeg' },
                ]
            });

            // Diz ao navegador quais ações executar quando os botões do sistema são pressionados
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }


    function preloadNextSong() {
        // ... (esta função continua a mesma)
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

    // ALTERADO: A função loadSong agora chama a atualização da Media Session
    function loadSong(index) {
        const song = songs[index];
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        albumCover.src = `images/${song.cover}`;
        audio.src = `musics/${song.file}`;
        updateActivePlaylistItem();
        updateMediaSession(); // <-- ADICIONADO AQUI!
    }
    
    function playSong() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        // Envolve o play() em uma Promise para garantir que a música comece antes de atualizar o estado da sessão
        audio.play().then(_ => {
            navigator.mediaSession.playbackState = "playing";
        });
        preloadNextSong();
    }

    function pauseSong() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audio.pause();
        navigator.mediaSession.playbackState = "paused";
    }
    
    // ... (O restante do código: togglePlayPause, prevSong, nextSong, etc., continua EXATAMENTE O MESMO)
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
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentSongIndex);
        
        currentSongIndex = randomIndex;
        loadSong(currentSongIndex);
        playSong();
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }
    
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function setProgressFromScrub() {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.textContent = `${song.title} - ${song.artist}`;
            li.dataset.index = index;
            playlistEl.appendChild(li);
        });
    }
    
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

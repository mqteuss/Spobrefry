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

    // Variáveis de estado
    let currentSongIndex = 0;
    let isPlaying = false;
    const audio = new Audio();
    const preloadAudio = new Audio(); // Elemento de áudio para pré-carregamento

    // --- NOVA FUNÇÃO ---
    // Função para pré-carregar a próxima música da lista
    function preloadNextSong() {
        // Calcula o índice da próxima música, voltando ao início se for a última
        const nextIndex = (currentSongIndex + 1) % songs.length;
        // Define o 'src' do nosso player de pré-carregamento, o que inicia o download
        preloadAudio.src = `musics/${songs[nextIndex].file}`;
    }

    // Função para carregar uma música (visualmente e no player principal)
    function loadSong(index) {
        const song = songs[index];
        trackTitle.textContent = song.title;
        trackArtist.textContent = song.artist;
        albumCover.src = `images/${song.cover}`;
        audio.src = `musics/${song.file}`;
        updateActivePlaylistItem();
    }
    
    // Função para dar Play na música
    function playSong() {
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audio.play();
        // --- ALTERAÇÃO AQUI ---
        // Assim que uma música começa, já pré-carregamos a seguinte
        preloadNextSong(); 
    }

    // Função para Pausar a música
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
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }

    // Ir para a próxima música
    function nextSong() {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }
    
    // Atualizar a barra de progresso conforme a música toca
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.value = isNaN(progressPercent) ? 0 : progressPercent;

        // Atualizar o tempo (ex: "1:32")
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

    // Mudar a posição da música quando o usuário arrasta a barra de progresso
    function setProgressFromScrub() {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }

    // Renderizar a lista de músicas na tela
    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.textContent = `${song.title} - ${song.artist}`;
            li.dataset.index = index;
            playlistEl.appendChild(li);
        });
    }
    
    // Marcar visualmente qual música está tocando na playlist
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
    
    // Tocar uma música a partir do clique na playlist
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
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong); // Toca a próxima quando a atual acabar
    progressBar.addEventListener('input', setProgressFromScrub);
    playlistEl.addEventListener('click', playFromPlaylist);


    // --- INICIALIZAÇÃO ---
    // Renderiza a lista de músicas e carrega a primeira faixa para ficar pronta.
    renderPlaylist();
    loadSong(currentSongIndex);
});
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


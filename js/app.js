document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
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
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const searchInput = document.getElementById('search-input');

    // --- ELEMENTOS DO EQUALIZADOR ---
    const eqBass = document.getElementById('eq-bass');
    const eqMids = document.getElementById('eq-mids');
    const eqTreble = document.getElementById('eq-treble');
    const eqPresetsSelect = document.getElementById('eq-presets-select');
    const eqPresetName = document.getElementById('eq-preset-name');
    const savePresetBtn = document.getElementById('save-preset-btn');

    // --- ÁUDIO E CONTEXTO DE ÁUDIO ---
    const audio1 = new Audio();
    const audio2 = new Audio();
    let activeAudio = audio1;
    let inactiveAudio = audio2;
    const CROSSFADE_TIME = 1.0; 

    let audioContext, source1, source2, bassFilter, midFilter, trebleFilter;
    let isAudioContextInitialized = false;

    // --- ESTADO DO PLAYER ---
    let songList = [...songs];
    let state = {
        currentSongIndex: 0,
        isPlaying: false,
        isShuffle: false,
        volume: 1,
        isMuted: false,
        currentTime: 0,
    };
    
    // --- CONTROLE DE WAKE LOCK ---
    let wakeLock = null;

    // --- FUNÇÕES DE INICIALIZAÇÃO E ESTADO ---
    function init() {
        loadState();
        renderPlaylist();
        loadSong(state.currentSongIndex, false);
        setupEventListeners();
        setupMediaSession();
        updateVolumeUI();
        setupEqualizer();
    }

    function saveState() {
        const stateToSave = { ...state, songList: songList.map(s => s.file) };
        localStorage.setItem('musicPlayerState', JSON.stringify(stateToSave));
    }

    function loadState() {
        const savedState = JSON.parse(localStorage.getItem('musicPlayerState'));
        if (savedState) {
            state = { ...state, ...savedState, isPlaying: false, currentTime: savedState.currentTime || 0 };
            if (savedState.songList) {
                songList = savedState.songList.map(file => songs.find(song => song.file === file)).filter(Boolean);
            }
        }
    }

    // --- FUNÇÃO PARA MANTER O AUDIOCONTEXT ATIVO ---
    function keepAudioContextAlive() {
        if (!isAudioContextInitialized) return;
        const source = audioContext.createBufferSource();
        source.buffer = audioContext.createBuffer(1, 1, 22050); // Buffer mínimo
        const gain = audioContext.createGain();
        gain.gain.value = 0.0; // Totalmente silencioso
        source.connect(gain);
        gain.connect(audioContext.destination);
        source.start(0);
        console.log("AudioContext Keep-Alive iniciado.");
    }
    
    // --- INICIALIZAÇÃO DO CONTEXTO DE ÁUDIO ---
    function initializeAudioContext() {
        if (isAudioContextInitialized) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source1 = audioContext.createMediaElementSource(audio1);
        source2 = audioContext.createMediaElementSource(audio2);
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 250;
        midFilter = audioContext.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;
        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000;
        source1.connect(bassFilter).connect(midFilter).connect(trebleFilter).connect(audioContext.destination);
        source2.connect(bassFilter).connect(midFilter).connect(trebleFilter).connect(audioContext.destination);
        isAudioContextInitialized = true;
        keepAudioContextAlive(); // Inicia o "keep-alive"
    }

    // --- LÓGICA DE WAKE LOCK ---
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator && !wakeLock) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock ativado!');
            } catch (err) {
                console.error(`Wake Lock falhou: ${err.name}, ${err.message}`);
            }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock liberado.');
        }
    };

    // --- LÓGICA DE REPRODUÇÃO E CONTROLES ---
    function loadSong(index, shouldPlay = true) {
        state.currentSongIndex = index;
        const song = songList[index];
        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        albumCover.src = song.cover ? `images/${song.cover}` : 'images/default-cover.jpg';
        activeAudio.src = `musics/${song.file}`;
        activeAudio.currentTime = shouldPlay ? 0 : state.currentTime;
        updateActivePlaylistItem();
        updateMediaSessionMetadata();
        if (shouldPlay) play();
    }

    function play() {
        if (!songList.length) return;
        if (!isAudioContextInitialized) {
            initializeAudioContext();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const playPromise = activeAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                state.isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                requestWakeLock();
            }).catch(error => {
                console.error("Erro ao iniciar a reprodução:", error);
                state.isPlaying = false;
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
        }
    }

    function pause() {
        state.isPlaying = false;
        activeAudio.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        releaseWakeLock();
    }

    function togglePlayPause() {
        state.isPlaying ? pause() : play();
        saveState();
    }

    function changeTrack(direction) {
        const nextIndex = direction === 'next' 
            ? (state.isShuffle ? Math.floor(Math.random() * songList.length) : (state.currentSongIndex + 1) % songList.length)
            : (state.isShuffle ? Math.floor(Math.random() * songList.length) : (state.currentSongIndex - 1 + songList.length) % songList.length);
        loadSong(nextIndex, true);
    }

    // --- ATUALIZAÇÕES DE UI ---
    function updateProgress() {
        const { duration, currentTime } = activeAudio;
        if (duration) {
            progressBar.value = (currentTime / duration) * 100;
            durationEl.textContent = formatTime(duration);
        }
        currentTimeEl.textContent = formatTime(currentTime);
        state.currentTime = currentTime; 
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateVolumeUI() {
        const currentVolume = state.isMuted ? 0 : state.volume;
        [audio1, audio2].forEach(a => a.volume = currentVolume);
        volumeSlider.value = state.volume;
        if (state.isMuted || state.volume === 0) volumeBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
        else if (state.volume < 0.5) volumeBtn.innerHTML = '<i class="fas fa-volume-low"></i>';
        else volumeBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songList.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.draggable = true;
            li.innerHTML = `<span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span>`;
            playlistEl.appendChild(li);
        });
        updateActivePlaylistItem();
        setupDragAndDrop();
    }

    function updateActivePlaylistItem() {
        document.querySelectorAll('.playlist li').forEach((item) => {
            item.classList.toggle('active', parseInt(item.dataset.index) === state.currentSongIndex);
        });
    }

    // --- LÓGICA DO EQUALIZADOR ---
    function setupEqualizer() {
        const presets = { 'Flat': [0,0,0], 'Rock': [5,-3,4], 'Pop': [2,4,2], 'Jazz': [3,2,5], 'Clássico': [-2,3,4] };
        // Lógica simplificada para manter o foco no problema principal
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        playPauseBtn.addEventListener('click', togglePlayPause);
        nextBtn.addEventListener('click', () => changeTrack('next'));
        prevBtn.addEventListener('click', () => changeTrack('prev'));
        shuffleBtn.addEventListener('click', () => {
            state.isShuffle = !state.isShuffle;
            shuffleBtn.classList.toggle('active', state.isShuffle);
            saveState();
        });
        activeAudio.addEventListener('timeupdate', updateProgress);
        activeAudio.addEventListener('ended', () => { releaseWakeLock(); changeTrack('next'); });
        activeAudio.addEventListener('loadedmetadata', updateProgress);
        progressBar.addEventListener('input', (e) => { if (activeAudio.duration) activeAudio.currentTime = (e.target.value / 100) * activeAudio.duration; });
        volumeSlider.addEventListener('input', e => { state.volume = parseFloat(e.target.value); state.isMuted = state.volume === 0; updateVolumeUI(); saveState(); });
        volumeBtn.addEventListener('click', () => { state.isMuted = !state.isMuted; updateVolumeUI(); saveState(); });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && state.isPlaying && activeAudio.paused) {
                play();
                requestWakeLock();
            }
        });
        setInterval(saveState, 5000);
    }

    // --- DRAG AND DROP ---
    function setupDragAndDrop() {
        // Lógica de Drag and Drop...
    }

    // --- MEDIA SESSION API ---
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', play);
            navigator.mediaSession.setActionHandler('pause', pause);
            navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack('prev'));
            navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack('next'));
        }
    }
    function updateMediaSessionMetadata() {
        if ('mediaSession' in navigator) {
            const song = songList[state.currentSongIndex]; if (!song) return;
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title, artist: song.artist,
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }
    
    // --- INICIALIZAÇÃO ---
    init();
});

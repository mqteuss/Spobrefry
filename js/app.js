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

    // --- FUNÇÕES DE INICIALIZAÇÃO E ESTADO ---
    function init() {
        loadState();
        renderPlaylist();
        loadSong(state.currentSongIndex, false);
        setupEventListeners();
        setupMediaSession();
        updateVolumeUI();
        setupEqualizer(); // Configura o equalizador
    }

    function saveState() {
        const stateToSave = {
            ...state,
            songList: songList.map(s => s.file)
        };
        localStorage.setItem('spobrefyState', JSON.stringify(stateToSave));
    }

    function loadState() {
        const savedState = JSON.parse(localStorage.getItem('spobrefyState'));
        if (savedState) {
            state = { ...state, ...savedState, isPlaying: false, currentTime: savedState.currentTime || 0 };
            if (savedState.songList) {
                songList = savedState.songList.map(file => songs.find(song => song.file === file)).filter(Boolean);
            }
        }
    }

    // --- INICIALIZAÇÃO DO CONTEXTO DE ÁUDIO ---
    function initializeAudioContext() {
        if (isAudioContextInitialized) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Fontes de áudio
        source1 = audioContext.createMediaElementSource(audio1);
        source2 = audioContext.createMediaElementSource(audio2);

        // Filtros do Equalizador
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 250; // Graves

        midFilter = audioContext.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000; // Médios
        midFilter.Q.value = 1;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000; // Agudos

        // Conecta tudo em cadeia
        source1.connect(bassFilter).connect(midFilter).connect(trebleFilter).connect(audioContext.destination);
        source2.connect(bassFilter).connect(midFilter).connect(trebleFilter).connect(audioContext.destination);
        
        isAudioContextInitialized = true;
    }

    // --- LÓGICA DE REPRODUÇÃO E CONTROLES ---
    function loadSong(index, shouldPlay = true) {
        state.currentSongIndex = index;
        const song = songList[index];

        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        albumCover.src = song.cover ? `images/${song.cover}` : 'images/default-cover.jpg';
        
        activeAudio.src = `musics/${song.file}`;
        
        // --- CORREÇÃO DEFINITIVA DO TEMPO ---
        // Se deve tocar, é uma troca de faixa, então zera o tempo.
        // Se não, é o carregamento inicial, então usa o tempo salvo.
        if (shouldPlay) {
            activeAudio.currentTime = 0;
        } else {
            activeAudio.currentTime = state.currentTime;
        }
        
        updateActivePlaylistItem();
        updateMediaSessionMetadata();
        
        if (shouldPlay) play();
    }

    function play() {
        if (!songList.length) return;
        // O AudioContext precisa ser iniciado por um gesto do usuário (ex: clique)
        if (!isAudioContextInitialized) {
            initializeAudioContext();
        }
        state.isPlaying = true;
        // O AudioContext pode entrar em estado suspenso
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        activeAudio.play().catch(error => console.error("Erro ao tocar:", error));
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    function pause() {
        state.isPlaying = false;
        activeAudio.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function togglePlayPause() {
        state.isPlaying ? pause() : play();
        saveState();
    }

    function getNextSongIndex() {
        if (state.isShuffle) {
            let randomIndex;
            if (songList.length <= 1) return 0;
            do {
                randomIndex = Math.floor(Math.random() * songList.length);
            } while (randomIndex === state.currentSongIndex);
            return randomIndex;
        } else {
            return (state.currentSongIndex + 1) % songList.length;
        }
    }
    
    function getPrevSongIndex() {
        if (state.isShuffle) return getNextSongIndex();
        return (state.currentSongIndex - 1 + songList.length) % songList.length;
    }

    function changeTrack(direction) {
        const newIndex = direction === 'next' ? getNextSongIndex() : getPrevSongIndex();
        
        inactiveAudio.src = `musics/${songList[newIndex].file}`;
        inactiveAudio.volume = 0;
        inactiveAudio.play();

        let fadeInterval = setInterval(() => {
            let newActiveVolume = Math.max(0, activeAudio.volume - (1 / (CROSSFADE_TIME * 10)));
            let newInactiveVolume = Math.min(state.volume, inactiveAudio.volume + (1 / (CROSSFADE_TIME * 10)));
            
            activeAudio.volume = newActiveVolume;
            inactiveAudio.volume = newInactiveVolume;
            
            if (newActiveVolume <= 0) {
                clearInterval(fadeInterval);
                activeAudio.pause();
                
                [activeAudio, inactiveAudio] = [inactiveAudio, activeAudio];
                loadSong(newIndex, true);
                activeAudio.volume = state.volume;
            }
        }, 100);
    }

    // --- ATUALIZAÇÕES DE UI ---
    function updateProgress() {
        const { duration, currentTime } = activeAudio;
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.value = progressPercent;
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
        volumeSlider.value = state.volume;
        const currentVolume = state.isMuted ? 0 : state.volume;
        audio1.volume = currentVolume;
        audio2.volume = currentVolume;

        if (state.isMuted || state.volume === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
        } else if (state.volume < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-low"></i>';
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
        }
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        songList.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.draggable = true;
            li.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-artist">${song.artist}</span>
            `;
            playlistEl.appendChild(li);
        });
        updateActivePlaylistItem();
        setupDragAndDrop();
    }

    function updateActivePlaylistItem() {
        document.querySelectorAll('.playlist li').forEach((item, index) => {
            item.classList.toggle('active', index === state.currentSongIndex);
        });
    }

    // --- LÓGICA DO EQUALIZADOR ---
    function setupEqualizer() {
        const defaultPresets = {
            'Flat': { bass: 0, mids: 0, treble: 0 },
            'Rock': { bass: 5, mids: -3, treble: 4 },
            'Pop': { bass: 2, mids: 4, treble: 2 },
            'Jazz': { bass: 3, mids: 2, treble: 5 },
            'Clássico': { bass: -2, mids: 3, treble: 4 }
        };

        function getSavedPresets() {
            return JSON.parse(localStorage.getItem('eqPresets')) || {};
        }

        function loadPresets() {
            const allPresets = { ...defaultPresets, ...getSavedPresets() };
            eqPresetsSelect.innerHTML = '';
            for (const name in allPresets) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                eqPresetsSelect.appendChild(option);
            }
        }

        function applyPreset(name) {
            const allPresets = { ...defaultPresets, ...getSavedPresets() };
            const preset = allPresets[name];
            if (preset) {
                eqBass.value = preset.bass;
                eqMids.value = preset.mids;
                eqTreble.value = preset.treble;
                updateFilters();
            }
        }

        function updateFilters() {
            if (!isAudioContextInitialized) return;
            bassFilter.gain.value = parseFloat(eqBass.value);
            midFilter.gain.value = parseFloat(eqMids.value);
            trebleFilter.gain.value = parseFloat(eqTreble.value);
        }
        
        eqBass.addEventListener('input', updateFilters);
        eqMids.addEventListener('input', updateFilters);
        eqTreble.addEventListener('input', updateFilters);
        eqPresetsSelect.addEventListener('change', (e) => applyPreset(e.target.value));

        savePresetBtn.addEventListener('click', () => {
            const name = eqPresetName.value.trim();
            if (!name) {
                alert('Por favor, digite um nome para o preset.');
                return;
            }
            const savedPresets = getSavedPresets();
            savedPresets[name] = {
                bass: parseFloat(eqBass.value),
                mids: parseFloat(eqMids.value),
                treble: parseFloat(eqTreble.value)
            };
            localStorage.setItem('eqPresets', JSON.stringify(savedPresets));
            eqPresetName.value = '';
            loadPresets();
            eqPresetsSelect.value = name; // Seleciona o preset recém-salvo
        });
        
        loadPresets();
        applyPreset('Flat'); // Aplica o preset padrão ao iniciar
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

        [audio1, audio2].forEach(audio => {
            audio.addEventListener('timeupdate', () => { if (audio === activeAudio) updateProgress(); });
            audio.addEventListener('ended', () => { if (audio === activeAudio) changeTrack('next'); });
            audio.addEventListener('loadedmetadata', () => { if (audio === activeAudio) updateProgress(); });
        });
        
        progressBar.addEventListener('input', (e) => {
            const { duration } = activeAudio;
            if (duration) activeAudio.currentTime = (e.target.value / 100) * duration;
        });

        volumeSlider.addEventListener('input', e => {
            state.volume = parseFloat(e.target.value);
            state.isMuted = state.volume === 0;
            updateVolumeUI();
            saveState();
        });
        volumeBtn.addEventListener('click', () => {
            state.isMuted = !state.isMuted;
            updateVolumeUI();
            saveState();
        });

        searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.playlist li').forEach(li => {
                const title = li.querySelector('.song-title').textContent.toLowerCase();
                const artist = li.querySelector('.song-artist').textContent.toLowerCase();
                li.style.display = (title.includes(searchTerm) || artist.includes(searchTerm)) ? '' : 'none';
            });
        });
        
        setInterval(saveState, 5000);
    }

    // --- DRAG AND DROP ---
    function setupDragAndDrop() {
        let draggedIndex = null;
        playlistEl.querySelectorAll('li').forEach(item => {
            item.addEventListener('dragstart', e => {
                draggedIndex = parseInt(e.currentTarget.dataset.index);
                e.currentTarget.classList.add('dragging');
            });
            item.addEventListener('dragend', e => e.currentTarget.classList.remove('dragging'));
            item.addEventListener('dragover', e => {
                e.preventDefault();
                e.currentTarget.classList.add('drag-over');
            });
            item.addEventListener('dragleave', e => e.currentTarget.classList.remove('drag-over'));
            item.addEventListener('drop', e => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                const droppedIndex = parseInt(e.currentTarget.dataset.index);
                if (draggedIndex === droppedIndex) return;
                
                const [draggedItem] = songList.splice(draggedIndex, 1);
                songList.splice(droppedIndex, 0, draggedItem);
                
                // Atualiza o índice da música atual
                if (state.currentSongIndex === draggedIndex) {
                    state.currentSongIndex = droppedIndex;
                } else if (draggedIndex < state.currentSongIndex && droppedIndex >= state.currentSongIndex) {
                    state.currentSongIndex--;
                } else if (draggedIndex > state.currentSongIndex && droppedIndex <= state.currentSongIndex) {
                    state.currentSongIndex++;
                }

                renderPlaylist();
                saveState();
            });
            item.addEventListener('click', e => {
                const index = parseInt(e.currentTarget.dataset.index);
                if (index === state.currentSongIndex) {
                    togglePlayPause();
                } else {
                    loadSong(index, true);
                }
            });
        });
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
            const song = songList[state.currentSongIndex];
            if (!song) return;
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }
    
    // --- INICIALIZAÇÃO ---
    init();
});

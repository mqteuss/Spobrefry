document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const albumCover = document.getElementById('album-cover'), trackTitle = document.getElementById('track-title'), trackArtist = document.getElementById('track-artist');
    const progressBar = document.getElementById('progress-bar'), currentTimeEl = document.getElementById('current-time'), durationEl = document.getElementById('duration');
    const repeatBtn = document.getElementById('repeat-btn'), prevBtn = document.getElementById('prev-btn'), playPauseBtn = document.getElementById('play-pause-btn'), nextBtn = document.getElementById('next-btn'), shuffleBtn = document.getElementById('shuffle-btn');
    const volumeBtn = document.getElementById('volume-btn'), volumeSlider = document.getElementById('volume-slider');
    const searchInput = document.getElementById('search-input'), searchResultsEl = document.getElementById('search-results');
    const effectsToggleBtn = document.getElementById('effects-toggle-btn');
    const eqToggleBtn = document.getElementById('eq-toggle-btn'), equalizerContainer = document.querySelector('.equalizer-container');
    const eqSliders = document.querySelectorAll('.eq-slider'), eqPresetsSelect = document.getElementById('eq-presets-select'), eqPresetName = document.getElementById('eq-preset-name'), savePresetBtn = document.getElementById('save-preset-btn');
    const navButtons = document.querySelectorAll('.nav-btn'), views = document.querySelectorAll('.view'), backBtns = document.querySelectorAll('.back-btn');
    const createBtn = document.getElementById('create-btn');
    const createPlaylistModal = document.getElementById('create-playlist-modal'), newPlaylistNameInput = document.getElementById('new-playlist-name');
    const confirmCreatePlaylistBtn = document.getElementById('confirm-create-playlist'), cancelCreatePlaylistBtn = document.getElementById('cancel-create-playlist');
    const addToPlaylistModal = document.getElementById('add-to-playlist-modal'), modalPlaylistList = document.getElementById('modal-playlist-list'), cancelAddToPlaylistBtn = document.getElementById('cancel-add-to-playlist');
    const playlistsListContainer = document.getElementById('playlists-list-container');
    const playlistDetailName = document.getElementById('playlist-detail-name'), playlistDetailCover = document.getElementById('playlist-detail-cover'), playlistDetailSongs = document.getElementById('playlist-detail-songs');
    const changeCoverBtn = document.getElementById('change-cover-btn'), coverFileInput = document.getElementById('cover-file-input');
    const renamePlaylistBtn = document.getElementById('rename-playlist-btn'), deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    const toastNotification = document.getElementById('toast-notification');
    const playlistEmptyState = document.getElementById('playlist-empty-state');
    const addSongsFromEmptyStateBtn = document.getElementById('add-songs-from-empty-state-btn');

    // --- ÁUDIO E CONTEXTO ---
    const audio = new Audio();
    let audioContext, source, compressorNode, isAudioContextInitialized = false;
    let eqBands = [];

    // --- ESTADO GLOBAL DO PLAYER ---
    let allSongs = [...songs];
    let playlistsData = {};
    let state = {
        activePlaylistId: null,
        currentSongIndexInPlaylist: -1,
        songFileToAddToPlaylist: null,
        playlistIdToEdit: null,
        isPlaying: false, isShuffle: false, volume: 1, isMuted: false, currentTime: 0,
        repeatMode: 'none',
        isEffectsEnabled: true,
    };
    let wakeLock = null, toastTimeout;

    // --- FUNÇÕES DE INICIALIZAÇÃO E ESTADO ---
    function init() {
        loadState();
        if (Object.keys(playlistsData).length === 0) createDefaultPlaylist();
        state.activePlaylistId = state.activePlaylistId || Object.keys(playlistsData)[0];
        renderAll();
        renderFullSearchList();
        updateRepeatButtonUI();
        loadSong(state.currentSongIndexInPlaylist, false);
        setupEventListeners();
        setupMediaSession();
        updateVolumeUI();
        setupEqualizer();
        setupNavigation();
    }
    function saveState() { localStorage.setItem('musicPlayerState', JSON.stringify({ ...state, playlistsData })); }
    function loadState() { const savedState = JSON.parse(localStorage.getItem('musicPlayerState')); if (savedState) { state = { ...state, ...savedState, isPlaying: false }; playlistsData = savedState.playlistsData || {}; } }
    function renderAll() { renderPlaylistsList(); if(state.playlistIdToEdit) renderPlaylistDetail(state.playlistIdToEdit); }
    function createDefaultPlaylist() { const id = `playlist_${Date.now()}`; playlistsData[id] = { id, name: "Todas as Músicas", songs: allSongs.map(s => s.file), cover: 'images/default-cover.jpg' }; state.activePlaylistId = id; saveState(); }

    // --- NAVEGAÇÃO E UI ---
    function switchToView(viewId) { views.forEach(v => v.classList.remove('active')); document.getElementById(viewId).classList.add('active'); navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId)); }
    function setupNavigation() { navButtons.forEach(btn => { if (btn.id !== 'create-btn') btn.addEventListener('click', () => switchToView(btn.dataset.view)); }); backBtns.forEach(btn => btn.addEventListener('click', () => switchToView(btn.dataset.target))); createBtn.addEventListener('click', () => createPlaylistModal.classList.add('show')); }
    function showToast(message) { clearTimeout(toastTimeout); toastNotification.textContent = message; toastNotification.classList.add('show'); toastTimeout = setTimeout(() => toastNotification.classList.remove('show'), 3000); }

    // --- GERENCIAMENTO DE PLAYLISTS E BUSCA ---
    function renderFullSearchList() { searchResultsEl.innerHTML = ''; allSongs.forEach(song => { const li = document.createElement('li'); li.innerHTML = `<div class="song-info"><span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span></div> <button class="song-action-btn add-song-btn" data-song-file="${song.file}"><i class="fas fa-plus"></i></button>`; searchResultsEl.appendChild(li); }); searchResultsEl.querySelectorAll('.add-song-btn').forEach(btn => btn.addEventListener('click', (e) => { state.songFileToAddToPlaylist = e.currentTarget.dataset.songFile; modalPlaylistList.innerHTML = ''; Object.values(playlistsData).forEach(p => { const p_li = document.createElement('li'); p_li.innerHTML = `<img src="${p.cover}" alt="${p.name}" class="modal-playlist-cover"><span>${p.name}</span>`; p_li.dataset.playlistId = p.id; p_li.addEventListener('click', () => addSongToPlaylist(p.id, state.songFileToAddToPlaylist)); modalPlaylistList.appendChild(p_li); }); addToPlaylistModal.classList.add('show'); })); }
    function renderPlaylistsList() { playlistsListContainer.innerHTML = ''; Object.values(playlistsData).forEach(p => { const li = document.createElement('li'); li.dataset.playlistId = p.id; li.innerHTML = `<img src="${p.cover}" alt="Capa da ${p.name}"><div class="playlist-info"><h4>${p.name}</h4><p>${p.songs.length} músicas</p></div>`; li.addEventListener('click', () => { state.playlistIdToEdit = p.id; renderPlaylistDetail(p.id); switchToView('playlist-detail-view'); }); playlistsListContainer.appendChild(li); }); }
    function renderPlaylistDetail(playlistId) {
        const playlist = playlistsData[playlistId];
        if(!playlist) { switchToView('playlist-view'); return; }
        playlistDetailName.textContent = playlist.name;
        playlistDetailCover.src = playlist.cover;
        if (playlist.songs.length === 0) {
            playlistDetailSongs.innerHTML = ''; playlistDetailSongs.style.display = 'none'; playlistEmptyState.style.display = 'block';
        } else {
            playlistDetailSongs.style.display = 'block'; playlistEmptyState.style.display = 'none'; playlistDetailSongs.innerHTML = '';
            playlist.songs.forEach((songFile, index) => {
                const songData = allSongs.find(s => s.file === songFile); if(!songData) return;
                const li = document.createElement('li'); li.dataset.songIndex = index; li.draggable = true;
                li.innerHTML = `<div class="song-info"><span class="song-title">${songData.title}</span><span class="song-artist">${songData.artist}</span></div><button class="song-action-btn danger remove-song-btn" data-song-file="${songFile}"><i class="fas fa-times"></i></button>`;
                playlistDetailSongs.appendChild(li);
            });
            playlistDetailSongs.querySelectorAll('.song-info').forEach(el => { el.addEventListener('click', () => { const songIndex = parseInt(el.parentElement.dataset.songIndex); state.activePlaylistId = playlistId; loadSong(songIndex, true); switchToView('library-view'); }); });
            playlistDetailSongs.querySelectorAll('.remove-song-btn').forEach(btn => { btn.addEventListener('click', (e) => { const songFileToRemove = e.currentTarget.dataset.songFile; removeSongFromPlaylist(playlistId, songFileToRemove); }); });
            setupDragAndDrop(playlistId);
        }
    }
    function createNewPlaylist() { const name = newPlaylistNameInput.value.trim(); if (name) { const id = `playlist_${Date.now()}`; playlistsData[id] = { id, name, songs: [], cover: 'images/default-cover.jpg' }; saveState(); renderPlaylistsList(); newPlaylistNameInput.value = ''; createPlaylistModal.classList.remove('show'); } }
    function renamePlaylist(playlistId) { const playlist = playlistsData[playlistId]; const newName = prompt("Digite o novo nome para a playlist:", playlist.name); if (newName && newName.trim() !== "") { playlist.name = newName.trim(); saveState(); renderAll(); } }
    function deletePlaylist(playlistId) { if (confirm(`Tem certeza de que deseja excluir a playlist "${playlistsData[playlistId].name}"?`)) { delete playlistsData[playlistId]; if(state.activePlaylistId === playlistId) state.activePlaylistId = Object.keys(playlistsData)[0] || null; state.playlistIdToEdit = null; saveState(); renderPlaylistsList(); switchToView('playlist-view'); } }
    function addSongToPlaylist(playlistId, songFile) { const playlist = playlistsData[playlistId]; if (!playlist.songs.includes(songFile)) { playlist.songs.push(songFile); saveState(); renderPlaylistsList(); if(state.playlistIdToEdit === playlistId) renderPlaylistDetail(playlistId); showToast(`Adicionado a "${playlist.name}"`); } else { showToast("A música já está nessa playlist"); } addToPlaylistModal.classList.remove('show'); }
    function removeSongFromPlaylist(playlistId, songFile) { const playlist = playlistsData[playlistId]; playlist.songs = playlist.songs.filter(sf => sf !== songFile); saveState(); renderPlaylistsList(); renderPlaylistDetail(playlistId); const song = allSongs.find(s => s.file === songFile); showToast(`"${song.title}" removido da playlist`); }

    function changePlaylistCover(playlistId, file) {
        const reader = new FileReader();
        const image = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 300;

        reader.onload = (e) => {
            image.onload = () => {
                let width = image.width;
                let height = image.height;
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(image, 0, 0, width, height);
                const newImageData = canvas.toDataURL('image/jpeg', 0.8);
                playlistsData[playlistId].cover = newImageData;
                saveState();
                renderAll();
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- REORDENAÇÃO (DRAG AND DROP) ---
    function setupDragAndDrop(playlistId) {
        const listItems = playlistDetailSongs.querySelectorAll('li[draggable="true"]');
        let draggedIndex = null;
        listItems.forEach(item => {
            item.addEventListener('dragstart', () => { draggedIndex = parseInt(item.dataset.songIndex); setTimeout(() => item.classList.add('dragging'), 0); });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
            item.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
            item.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
            item.addEventListener('drop', (e) => {
                e.preventDefault(); e.currentTarget.classList.remove('drag-over');
                const droppedIndex = parseInt(e.currentTarget.dataset.songIndex);
                if (draggedIndex === droppedIndex) return;
                const playlist = playlistsData[playlistId];
                const [draggedItem] = playlist.songs.splice(draggedIndex, 1);
                playlist.songs.splice(droppedIndex, 0, draggedItem);
                saveState(); renderPlaylistDetail(playlistId);
            });
        });
    }

    // --- LÓGICA DE REPRODUÇÃO ---
    function getActivePlaylistSongs() { const playlist = playlistsData[state.activePlaylistId]; return playlist ? playlist.songs.map(file => allSongs.find(s => s.file === file)).filter(Boolean) : []; }
    function loadSong(playlistIndex, shouldPlay = true) { const songs = getActivePlaylistSongs(); if (playlistIndex < 0 || playlistIndex >= songs.length) { if (songs.length > 0) playlistIndex = 0; else return; } state.currentSongIndexInPlaylist = playlistIndex; const song = songs[playlistIndex]; if (!song) return; trackTitle.textContent = song.title || "Título Desconhecido"; trackArtist.textContent = song.artist || "Artista Desconhecido"; const activePlaylist = playlistsData[state.activePlaylistId]; albumCover.src = activePlaylist ? activePlaylist.cover : 'images/default-cover.jpg'; audio.src = `musics/${song.file}`; if (shouldPlay) play(); else audio.currentTime = state.currentTime; updateMediaSessionMetadata(); }
    function play() { 
        if (getActivePlaylistSongs().length === 0) return; 
        if (!isAudioContextInitialized) initializeAudioContext(); 
        state.isPlaying = true; 
        if (audioContext.state === 'suspended') audioContext.resume(); 
        audio.play().then(() => {
            if ('wakeLock' in navigator) {
                requestWakeLock();
            }
        }).catch(e => console.error("Erro ao tocar:", e)); 
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
    }
    function pause() { state.isPlaying = false; audio.pause(); playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; releaseWakeLock(); }
    function togglePlayPause() { (state.isPlaying ? pause : play)(); saveState(); }
    function updateRepeatButtonUI() {
        repeatBtn.classList.remove('active', 'repeat-mode-one');
        if (state.repeatMode === 'all') {
            repeatBtn.classList.add('active');
        } else if (state.repeatMode === 'one') {
            repeatBtn.classList.add('active', 'repeat-mode-one');
        }
    }
    function changeTrack(direction) { let songs = getActivePlaylistSongs(); if (songs.length === 0) return; let newIndex; if (state.isShuffle) { do { newIndex = Math.floor(Math.random() * songs.length); } while (songs.length > 1 && newIndex === state.currentSongIndexInPlaylist); } else { newIndex = direction === 'next' ? (state.currentSongIndexInPlaylist + 1) % songs.length : (state.currentSongIndexInPlaylist - 1 + songs.length) % songs.length; } loadSong(newIndex, true); }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        playPauseBtn.addEventListener('click', togglePlayPause);
        nextBtn.addEventListener('click', () => changeTrack('next'));
        prevBtn.addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else changeTrack('prev'); });
        shuffleBtn.addEventListener('click', () => { state.isShuffle = !state.isShuffle; shuffleBtn.classList.toggle('active', state.isShuffle); saveState(); });
        repeatBtn.addEventListener('click', () => { if(state.repeatMode === 'none') state.repeatMode = 'all'; else if (state.repeatMode === 'all') state.repeatMode = 'one'; else state.repeatMode = 'none'; updateRepeatButtonUI(); saveState(); });
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => {
            const isLastSong = state.currentSongIndexInPlaylist === getActivePlaylistSongs().length - 1;
            if (state.repeatMode === 'one') {
                audio.currentTime = 0;
                play();
            } else if (state.repeatMode === 'none' && !state.isShuffle && isLastSong) {
                pause();
            } else {
                changeTrack('next');
            }
        });
        audio.addEventListener('loadedmetadata', updateProgress);
        progressBar.addEventListener('input', (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; });
        volumeSlider.addEventListener('input', e => { state.volume = parseFloat(e.target.value); state.isMuted = state.volume === 0; updateVolumeUI(); saveState(); });
        volumeBtn.addEventListener('click', () => { state.isMuted = !state.isMuted; updateVolumeUI(); saveState(); });
        eqToggleBtn.addEventListener('click', () => { eqToggleBtn.classList.toggle('active'); equalizerContainer.classList.toggle('show'); });

        effectsToggleBtn.addEventListener('click', () => {
            state.isEffectsEnabled = !state.isEffectsEnabled;
            connectAudioEffects();
            saveState();
        });

        searchInput.addEventListener('input', e => { const term = e.target.value.toLowerCase(); searchResultsEl.querySelectorAll('li').forEach(li => { const text = li.textContent.toLowerCase(); li.style.display = text.includes(term) ? 'flex' : 'none'; }); });
        addSongsFromEmptyStateBtn.addEventListener('click', () => { switchToView('search-view'); });
        confirmCreatePlaylistBtn.addEventListener('click', createNewPlaylist);
        cancelCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.remove('show'));
        cancelAddToPlaylistBtn.addEventListener('click', () => addToPlaylistModal.classList.remove('show'));
        renamePlaylistBtn.addEventListener('click', () => renamePlaylist(state.playlistIdToEdit));
        deletePlaylistBtn.addEventListener('click', () => deletePlaylist(state.playlistIdToEdit));
        changeCoverBtn.addEventListener('click', () => coverFileInput.click());
        coverFileInput.addEventListener('change', (e) => { if (e.target.files[0]) changePlaylistCover(state.playlistIdToEdit, e.target.files[0]); });
        setInterval(saveState, 5000);
    }

    // --- FUNÇÕES AUXILIARES ---
    function initializeAudioContext() {
        if (isAudioContextInitialized) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(audio);
        compressorNode = audioContext.createDynamicsCompressor();
        // Valores ajustados para serem mais suaves e evitar estalos
        compressorNode.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressorNode.knee.setValueAtTime(30, audioContext.currentTime);
        compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);
        compressorNode.attack.setValueAtTime(0.05, audioContext.currentTime);
        compressorNode.release.setValueAtTime(0.3, audioContext.currentTime);

        const frequencies = [60, 250, 1000, 4000, 10000];
        eqBands = frequencies.map(freq => {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.5;
            filter.gain.value = 0;
            return filter;
        });
        isAudioContextInitialized = true;
        connectAudioEffects();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && audioContext.state === 'running' && state.isPlaying) {
                // Mantém o contexto ativo em segundo plano
            } else if (!document.hidden && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });
    }

    function connectAudioEffects() {
        if (!isAudioContextInitialized) return;

        try { source.disconnect(); } catch(e) {}
        try { compressorNode.disconnect(); } catch(e) {}
        eqBands.forEach(band => { try { band.disconnect(); } catch(e) {} });

        if (state.isEffectsEnabled) {
            source.connect(compressorNode);
            let currentNode = compressorNode;
            eqBands.forEach(band => {
                currentNode.connect(band);
                currentNode = band;
            });
            currentNode.connect(audioContext.destination);
            effectsToggleBtn.classList.add('active');
        } else {
            source.connect(audioContext.destination);
            effectsToggleBtn.classList.remove('active');
        }
    }

    function updateProgress() { const { duration, currentTime } = audio; if (duration) { progressBar.value = (currentTime / duration) * 100; durationEl.textContent = formatTime(duration); } currentTimeEl.textContent = formatTime(currentTime); state.currentTime = currentTime; }
    function formatTime(seconds) { if (isNaN(seconds)) return "0:00"; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    
    function updateVolumeUI() {
        volumeSlider.value = state.volume;
        
        // Aplica uma curva exponencial (ao quadrado) para um controle mais suave
        const actualVolume = Math.pow(state.volume, 2);
        
        audio.volume = state.isMuted ? 0 : actualVolume;
        
        if (state.isMuted || state.volume === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
        } else if (state.volume < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-low"></i>';
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
        }
    }

    function setupEqualizer() {
        const defaultPresets = { 'Flat': [0, 0, 0, 0, 0], 'Rock': [5, -2, -4, 3, 5], 'Pop': [-2, 4, 5, 2, -1], 'Jazz': [4, 2, -2, 3, 4] };
        function getSavedPresets() { return JSON.parse(localStorage.getItem('eqPresets')) || {}; }
        function loadPresets() { const allPresets = { ...defaultPresets, ...getSavedPresets() }; eqPresetsSelect.innerHTML = ''; for (const name in allPresets) { const option = document.createElement('option'); option.value = name; option.textContent = name; eqPresetsSelect.appendChild(option); } }
        function applyPreset(name) { const allPresets = { ...defaultPresets, ...getSavedPresets() }; const preset = allPresets[name]; if (preset && preset.length === eqBands.length) { eqSliders.forEach((slider, i) => { slider.value = preset[i]; if (eqBands[i]) eqBands[i].gain.value = preset[i]; }); } }
        function updateFilters(bandIndex, gain) { if (eqBands[bandIndex]) { eqBands[bandIndex].gain.value = gain; } }
        eqSliders.forEach(slider => { slider.addEventListener('input', (e) => { const bandIndex = parseInt(e.target.dataset.band); const gain = parseFloat(e.target.value); updateFilters(bandIndex, gain); }); });
        eqPresetsSelect.addEventListener('change', (e) => applyPreset(e.target.value));
        savePresetBtn.addEventListener('click', () => { const name = eqPresetName.value.trim(); if (!name) { alert('Por favor, digite um nome para o preset.'); return; } const savedPresets = getSavedPresets(); const values = Array.from(eqSliders).map(s => parseFloat(s.value)); savedPresets[name] = values; localStorage.setItem('eqPresets', JSON.stringify(savedPresets)); eqPresetName.value = ''; loadPresets(); eqPresetsSelect.value = name; });
        loadPresets();
        applyPreset('Flat');
    }

    const requestWakeLock = async () => { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.error(`${err.name}, ${err.message}`); } };
    const releaseWakeLock = async () => { if (wakeLock !== null) { await wakeLock.release(); wakeLock = null; } };
    function setupMediaSession() { if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', play); navigator.mediaSession.setActionHandler('pause', pause); navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack('next')); } }
    function updateMediaSessionMetadata() { if ('mediaSession' in navigator) { const song = getActivePlaylistSongs()[state.currentSongIndexInPlaylist]; if (!song) return; navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }] }); } }

    init();
});
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const albumCover = document.getElementById('album-cover'), trackTitle = document.getElementById('track-title'), trackArtist = document.getElementById('track-artist');
    const progressBar = document.getElementById('progress-bar'), currentTimeEl = document.getElementById('current-time'), durationEl = document.getElementById('duration');
    const prevBtn = document.getElementById('prev-btn'), playPauseBtn = document.getElementById('play-pause-btn'), nextBtn = document.getElementById('next-btn'), shuffleBtn = document.getElementById('shuffle-btn');
    const volumeBtn = document.getElementById('volume-btn'), volumeSlider = document.getElementById('volume-slider');
    const searchInput = document.getElementById('search-input'), searchResultsEl = document.getElementById('search-results');
    // --- ELEMENTOS DO EQUALIZADOR ---
    const eqToggleBtn = document.getElementById('eq-toggle-btn');
    const equalizerContainer = document.querySelector('.equalizer-container');
    const eqBass = document.getElementById('eq-bass'), eqMids = document.getElementById('eq-mids'), eqTreble = document.getElementById('eq-treble'), eqPresetsSelect = document.getElementById('eq-presets-select'), eqPresetName = document.getElementById('eq-preset-name'), savePresetBtn = document.getElementById('save-preset-btn');
    // --- ELEMENTOS DA NAVEGAÇÃO E MODAIS ---
    const navButtons = document.querySelectorAll('.nav-btn'), views = document.querySelectorAll('.view'), backBtns = document.querySelectorAll('.back-btn');
    const createBtn = document.getElementById('create-btn');
    // --- MODAIS ---
    const createPlaylistModal = document.getElementById('create-playlist-modal'), newPlaylistNameInput = document.getElementById('new-playlist-name');
    const confirmCreatePlaylistBtn = document.getElementById('confirm-create-playlist'), cancelCreatePlaylistBtn = document.getElementById('cancel-create-playlist');
    const addToPlaylistModal = document.getElementById('add-to-playlist-modal'), modalPlaylistList = document.getElementById('modal-playlist-list'), cancelAddToPlaylistBtn = document.getElementById('cancel-add-to-playlist');
    // --- ELEMENTOS DA PLAYLIST ---
    const playlistsListContainer = document.getElementById('playlists-list-container');
    const playlistDetailName = document.getElementById('playlist-detail-name'), playlistDetailCover = document.getElementById('playlist-detail-cover'), playlistDetailSongs = document.getElementById('playlist-detail-songs');
    const changeCoverBtn = document.getElementById('change-cover-btn'), coverFileInput = document.getElementById('cover-file-input');
    const renamePlaylistBtn = document.getElementById('rename-playlist-btn'), deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    const toastNotification = document.getElementById('toast-notification');
    const playlistEmptyState = document.getElementById('playlist-empty-state');
    const addSongsFromEmptyStateBtn = document.getElementById('add-songs-from-empty-state-btn');

    // --- ÁUDIO E CONTEXTO ---
    const audio = new Audio();
    let audioContext, source, bassFilter, midFilter, trebleFilter, isAudioContextInitialized = false;
    
    // --- ESTADO GLOBAL DO PLAYER ---
    let allSongs = [...songs];
    let playlistsData = {};
    let state = {
        activePlaylistId: null,
        currentSongIndexInPlaylist: -1,
        songFileToAddToPlaylist: null,
        playlistIdToEdit: null,
        isPlaying: false, isShuffle: false, volume: 1, isMuted: false, currentTime: 0,
    };
    let wakeLock = null;
    let toastTimeout;

    // --- FUNÇÕES DE INICIALIZAÇÃO E ESTADO ---
    function init() {
        loadState();
        if (Object.keys(playlistsData).length === 0) createDefaultPlaylist();
        state.activePlaylistId = state.activePlaylistId || Object.keys(playlistsData)[0];
        renderAll();
        renderFullSearchList();
        loadSong(state.currentSongIndexInPlaylist, false);
        setupEventListeners();
        setupMediaSession();
        updateVolumeUI();
        setupEqualizer();
        setupNavigation();
    }
    function createDefaultPlaylist() { const defaultPlaylistId = `playlist_${Date.now()}`; playlistsData[defaultPlaylistId] = { id: defaultPlaylistId, name: "Todas as Músicas", songs: allSongs.map(s => s.file), cover: 'images/default-cover.jpg' }; state.activePlaylistId = defaultPlaylistId; saveState(); }
    function saveState() { const stateToSave = { ...state, playlistsData }; localStorage.setItem('musicPlayerState', JSON.stringify(stateToSave)); }
    function loadState() { const savedState = JSON.parse(localStorage.getItem('musicPlayerState')); if (savedState) { state = { ...state, ...savedState, isPlaying: false }; playlistsData = savedState.playlistsData || {}; } }
    function renderAll() { renderPlaylistsList(); if(state.playlistIdToEdit) renderPlaylistDetail(state.playlistIdToEdit); }

    // --- NAVEGAÇÃO E UI ---
    function switchToView(viewId) { views.forEach(v => v.classList.remove('active')); document.getElementById(viewId).classList.add('active'); navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId)); }
    function setupNavigation() { navButtons.forEach(btn => { if (btn.id === 'create-btn') return; btn.addEventListener('click', () => switchToView(btn.dataset.view)); }); backBtns.forEach(btn => btn.addEventListener('click', () => switchToView(btn.dataset.target))); createBtn.addEventListener('click', () => createPlaylistModal.classList.add('show')); }

    function showToast(message) {
        clearTimeout(toastTimeout);
        toastNotification.textContent = message;
        toastNotification.classList.add('show');
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
        }, 3000);
    }

    // --- GERENCIAMENTO DE PLAYLISTS E BUSCA ---
    function renderFullSearchList() {
        searchResultsEl.innerHTML = '';
        allSongs.forEach(song => {
            const li = document.createElement('li');
            li.innerHTML = `<div class="song-info"><span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span></div> <button class="song-action-btn add-song-btn" data-song-file="${song.file}"><i class="fas fa-plus"></i></button>`;
            searchResultsEl.appendChild(li);
        });
        searchResultsEl.querySelectorAll('.add-song-btn').forEach(btn => btn.addEventListener('click', (e) => {
            state.songFileToAddToPlaylist = e.currentTarget.dataset.songFile;
            modalPlaylistList.innerHTML = '';
            Object.values(playlistsData).forEach(p => {
                const p_li = document.createElement('li');
                p_li.innerHTML = `<img src="${p.cover}" alt="${p.name}" class="modal-playlist-cover"><span>${p.name}</span>`;
                p_li.dataset.playlistId = p.id;
                p_li.addEventListener('click', () => addSongToPlaylist(p.id, state.songFileToAddToPlaylist));
                modalPlaylistList.appendChild(p_li);
            });
            addToPlaylistModal.classList.add('show');
        }));
    }
    function renderPlaylistsList() {
        playlistsListContainer.innerHTML = '';
        Object.values(playlistsData).forEach(p => {
            const li = document.createElement('li');
            li.dataset.playlistId = p.id;
            li.innerHTML = `<img src="${p.cover}" alt="Capa da ${p.name}"><div class="playlist-info"><h4>${p.name}</h4><p>${p.songs.length} músicas</p></div>`;
            li.addEventListener('click', () => { state.playlistIdToEdit = p.id; renderPlaylistDetail(p.id); switchToView('playlist-detail-view'); });
            playlistsListContainer.appendChild(li);
        });
    }
    function renderPlaylistDetail(playlistId) {
        const playlist = playlistsData[playlistId];
        if(!playlist) { switchToView('playlist-view'); return; }
        
        playlistDetailName.textContent = playlist.name;
        playlistDetailCover.src = playlist.cover;
        
        if (playlist.songs.length === 0) {
            playlistDetailSongs.innerHTML = '';
            playlistDetailSongs.style.display = 'none';
            playlistEmptyState.style.display = 'block';
        } else {
            playlistDetailSongs.style.display = 'block';
            playlistEmptyState.style.display = 'none';
            playlistDetailSongs.innerHTML = '';
            playlist.songs.forEach((songFile, index) => {
                const songData = allSongs.find(s => s.file === songFile);
                if(!songData) return;
                const li = document.createElement('li');
                li.innerHTML = `<div class="song-info" data-song-index="${index}"><span class="song-title">${songData.title}</span><span class="song-artist">${songData.artist}</span></div><button class="song-action-btn danger remove-song-btn" data-song-file="${songFile}"><i class="fas fa-times"></i></button>`;
                playlistDetailSongs.appendChild(li);
            });
            playlistDetailSongs.querySelectorAll('.song-info').forEach(el => { el.addEventListener('click', (e) => { const songIndex = parseInt(e.currentTarget.dataset.songIndex); state.activePlaylistId = playlistId; loadSong(songIndex, true); switchToView('library-view'); }); });
            playlistDetailSongs.querySelectorAll('.remove-song-btn').forEach(btn => { btn.addEventListener('click', (e) => { const songFileToRemove = e.currentTarget.dataset.songFile; removeSongFromPlaylist(playlistId, songFileToRemove); }); });
        }
    }
    function createNewPlaylist() {
        const name = newPlaylistNameInput.value.trim();
        if (name) { const newId = `playlist_${Date.now()}`; playlistsData[newId] = { id: newId, name, songs: [], cover: 'images/default-cover.jpg' }; saveState(); renderPlaylistsList(); newPlaylistNameInput.value = ''; createPlaylistModal.classList.remove('show'); }
    }
    function renamePlaylist(playlistId) {
        const playlist = playlistsData[playlistId];
        const newName = prompt("Digite o novo nome para a playlist:", playlist.name);
        if (newName && newName.trim() !== "") { playlist.name = newName.trim(); saveState(); renderAll(); }
    }
    function deletePlaylist(playlistId) {
        if (confirm(`Tem certeza que deseja excluir a playlist "${playlistsData[playlistId].name}"?`)) { delete playlistsData[playlistId]; if(state.activePlaylistId === playlistId) state.activePlaylistId = Object.keys(playlistsData)[0] || null; state.playlistIdToEdit = null; saveState(); renderPlaylistsList(); switchToView('playlist-view'); }
    }
    function addSongToPlaylist(playlistId, songFile) {
        const playlist = playlistsData[playlistId];
        if (!playlist.songs.includes(songFile)) {
            playlist.songs.push(songFile);
            saveState();
            renderPlaylistsList();
            if(state.playlistIdToEdit === playlistId) renderPlaylistDetail(playlistId);
            const song = allSongs.find(s => s.file === songFile);
            showToast(`Adicionado a "${playlist.name}"`);
        } else {
            showToast("A música já está nessa playlist");
        }
        addToPlaylistModal.classList.remove('show');
    }
    function removeSongFromPlaylist(playlistId, songFile) {
        const playlist = playlistsData[playlistId];
        playlist.songs = playlist.songs.filter(sf => sf !== songFile);
        saveState();
        renderPlaylistsList();
        renderPlaylistDetail(playlistId);
        const song = allSongs.find(s => s.file === songFile);
        showToast(`"${song.title}" removido da playlist`);
    }
    function changePlaylistCover(playlistId, file) {
        const reader = new FileReader();
        reader.onload = (e) => { playlistsData[playlistId].cover = e.target.result; saveState(); renderAll(); };
        reader.readAsDataURL(file);
    }
    
    // --- LÓGICA DE REPRODUÇÃO E CONTROLES ---
    function getActivePlaylistSongs() {
        const activePlaylist = playlistsData[state.activePlaylistId];
        if (!activePlaylist) return [];
        return activePlaylist.songs.map(file => allSongs.find(s => s.file === file)).filter(Boolean);
    }
    function loadSong(playlistIndex, shouldPlay = true) {
        const currentPlaylistSongs = getActivePlaylistSongs();
        if (playlistIndex < 0 || playlistIndex >= currentPlaylistSongs.length) { if (currentPlaylistSongs.length > 0) playlistIndex = 0; else return; }
        state.currentSongIndexInPlaylist = playlistIndex;
        const song = currentPlaylistSongs[playlistIndex];
        if (!song) return;
        trackTitle.textContent = song.title || "Título Desconhecido";
        trackArtist.textContent = song.artist || "Artista Desconhecido";
        const activePlaylist = playlistsData[state.activePlaylistId];
        albumCover.src = activePlaylist ? activePlaylist.cover : 'images/default-cover.jpg';
        audio.src = `musics/${song.file}`;
        if (shouldPlay) play(); else audio.currentTime = state.currentTime;
        updateMediaSessionMetadata();
    }
    function play() { if (getActivePlaylistSongs().length === 0) return; if (!isAudioContextInitialized) initializeAudioContext(); state.isPlaying = true; if (audioContext.state === 'suspended') audioContext.resume(); audio.play().catch(error => console.error("Erro ao tocar:", error)); playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; requestWakeLock(); }
    function pause() { state.isPlaying = false; audio.pause(); playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; releaseWakeLock(); }
    function togglePlayPause() { (state.isPlaying ? pause : play)(); saveState(); }
    function changeTrack(direction) {
        let currentPlaylistSongs = getActivePlaylistSongs(); if (currentPlaylistSongs.length === 0) return; let newIndex;
        if (state.isShuffle) { do { newIndex = Math.floor(Math.random() * currentPlaylistSongs.length); } while (currentPlaylistSongs.length > 1 && newIndex === state.currentSongIndexInPlaylist); }
        else { if (direction === 'next') newIndex = (state.currentSongIndexInPlaylist + 1) % currentPlaylistSongs.length; else newIndex = (state.currentSongIndexInPlaylist - 1 + currentPlaylistSongs.length) % currentPlaylistSongs.length; }
        loadSong(newIndex, true);
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        playPauseBtn.addEventListener('click', togglePlayPause);
        nextBtn.addEventListener('click', () => changeTrack('next'));
        prevBtn.addEventListener('click', () => changeTrack('prev'));
        shuffleBtn.addEventListener('click', () => { state.isShuffle = !state.isShuffle; shuffleBtn.classList.toggle('active', state.isShuffle); saveState(); });
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => { releaseWakeLock(); changeTrack('next'); });
        audio.addEventListener('loadedmetadata', updateProgress);
        progressBar.addEventListener('input', (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; });
        volumeSlider.addEventListener('input', e => { state.volume = parseFloat(e.target.value); state.isMuted = state.volume === 0; updateVolumeUI(); saveState(); });
        volumeBtn.addEventListener('click', () => { state.isMuted = !state.isMuted; updateVolumeUI(); saveState(); });
        
        eqToggleBtn.addEventListener('click', () => {
            eqToggleBtn.classList.toggle('active');
            equalizerContainer.classList.toggle('show');
        });

        searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            const allListItems = searchResultsEl.querySelectorAll('li');
            allListItems.forEach(li => {
                const title = li.querySelector('.song-title').textContent.toLowerCase();
                const artist = li.querySelector('.song-artist').textContent.toLowerCase();
                if (title.includes(searchTerm) || artist.includes(searchTerm)) li.style.display = 'flex';
                else li.style.display = 'none';
            });
        });
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
    function initializeAudioContext() { if (isAudioContextInitialized) return; audioContext = new (window.AudioContext || window.webkitAudioContext)(); source = audioContext.createMediaElementSource(audio); bassFilter = audioContext.createBiquadFilter(); bassFilter.type = 'lowshelf'; bassFilter.frequency.value = 250; midFilter = audioContext.createBiquadFilter(); midFilter.type = 'peaking'; midFilter.frequency.value = 1000; midFilter.Q.value = 1; trebleFilter = audioContext.createBiquadFilter(); trebleFilter.type = 'highshelf'; trebleFilter.frequency.value = 4000; source.connect(bassFilter).connect(midFilter).connect(trebleFilter).connect(audioContext.destination); isAudioContextInitialized = true; }
    function updateProgress() { const { duration, currentTime } = audio; if (duration) { progressBar.value = (currentTime / duration) * 100; durationEl.textContent = formatTime(duration); } currentTimeEl.textContent = formatTime(currentTime); state.currentTime = currentTime; }
    function formatTime(seconds) { if (isNaN(seconds)) return "0:00"; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    function updateVolumeUI() { volumeSlider.value = state.volume; audio.volume = state.isMuted ? 0 : state.volume; if (state.isMuted || state.volume === 0) volumeBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>'; else if (state.volume < 0.5) volumeBtn.innerHTML = '<i class="fas fa-volume-low"></i>'; else volumeBtn.innerHTML = '<i class="fas fa-volume-high"></i>'; }
    function setupEqualizer() { const defaultPresets = { 'Flat': { bass: 0, mids: 0, treble: 0 }, 'Rock': { bass: 5, mids: -3, treble: 4 }, 'Pop': { bass: 2, mids: 4, treble: 2 }, 'Jazz': { bass: 3, mids: 2, treble: 5 }, 'Clássico': { bass: -2, mids: 3, treble: 4 } }; function getSavedPresets() { return JSON.parse(localStorage.getItem('eqPresets')) || {}; } function loadPresets() { const allPresets = { ...defaultPresets, ...getSavedPresets() }; eqPresetsSelect.innerHTML = ''; for (const name in allPresets) { const option = document.createElement('option'); option.value = name; option.textContent = name; eqPresetsSelect.appendChild(option); } } function applyPreset(name) { const allPresets = { ...defaultPresets, ...getSavedPresets() }; const preset = allPresets[name]; if (preset) { eqBass.value = preset.bass; eqMids.value = preset.mids; eqTreble.value = preset.treble; updateFilters(); } } function updateFilters() { if (!isAudioContextInitialized) return; bassFilter.gain.value = parseFloat(eqBass.value); midFilter.gain.value = parseFloat(eqMids.value); trebleFilter.gain.value = parseFloat(eqTreble.value); } eqBass.addEventListener('input', updateFilters); eqMids.addEventListener('input', updateFilters); eqTreble.addEventListener('input', updateFilters); eqPresetsSelect.addEventListener('change', (e) => applyPreset(e.target.value)); savePresetBtn.addEventListener('click', () => { const name = eqPresetName.value.trim(); if (!name) { alert('Por favor, digite um nome para o preset.'); return; } const savedPresets = getSavedPresets(); savedPresets[name] = { bass: parseFloat(eqBass.value), mids: parseFloat(eqMids.value), treble: parseFloat(eqTreble.value) }; localStorage.setItem('eqPresets', JSON.stringify(savedPresets)); eqPresetName.value = ''; loadPresets(); eqPresetsSelect.value = name; }); loadPresets(); applyPreset('Flat'); }
    const requestWakeLock = async () => { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.error(`${err.name}, ${err.message}`); } };
    const releaseWakeLock = async () => { if (wakeLock !== null) { await wakeLock.release(); wakeLock = null; } };
    function setupMediaSession() { if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', play); navigator.mediaSession.setActionHandler('pause', pause); navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack('next')); } }
    function updateMediaSessionMetadata() { if ('mediaSession' in navigator) { const song = getActivePlaylistSongs()[state.currentSongIndexInPlaylist]; if (!song) return; navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, artwork: [{ src: albumCover.src, sizes: '512x512', type: 'image/jpeg' }] }); } }

    // --- INICIALIZAÇÃO ---
    init();
});
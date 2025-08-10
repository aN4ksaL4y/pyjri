feather.replace(); // Initialize Feather icons on page load

// Global variables for song management
let currentSongIndex = 0;
let mainPlayableSongs = []; // Stores the initial 5 playable songs for the main player slideshow
let currentPlaylist = []; // Stores the currently active playlist (either mainPlayableSongs or a folder's songs)
let currentAudio = null; // To hold the current playing audio object
const MAX_PLAYABLE_SONGS = 5; // Define the limit for initial playable songs
let allGroupedTracks = {}; // To store all songs grouped by folder for the "Explore Playlists" section
let currentView = 'folders'; // Tracks the currently active view: 'nowPlaying' or 'folders'

// Specific list of playable song URLs provided by the user (string-only)
const laguFavorit = [
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FFrom%20Paris%20With%20Love%20%5BMre9BZnYe4w%5D.mp3?alt=media&token=69adb3b0-fae6-473c-b7a6-c76bb294fb9a",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/blues%20man%20radio%2FBlues%20Man%20%5BeDuKJhnF2oU%5D.mp3?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FYou%20Don't%20Know%20Me%20%5BRKuCICP6oDE%5D.mp3?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FDream%20a%20Little%20Dream%20of%20Me%20%5BTyFMfLWNZ2I%5D.mp3?alt=media&token=49776bb8-41a5-468b-8aba-c2928360e1c2",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FCome%20Away%20With%20Me%20%5BmvLDrx3YQ4Q%5D.mp3?alt=media&token=0fdac2dc-a75d-4398-a272-5f8ba7d5665f"
];

// Base URL for Firebase Storage to construct full audio URLs
const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/';

/**
 * Fetches the full song listing from the Firebase Storage bucket.
 * @returns {Array} An array of raw song item objects from Firebase Storage.
 */
async function fetchAllSongsData() {
    try {
        const response = await fetch('https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/?alt=json&prettyPrint=true');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching all songs data:', error);
        return [];
    }
}

/**
 * Parses a song name from the Firebase Storage path to extract title and artist.
 * Assumes format: "folder/Song Name [YouTubeID].mp3"
 * @param {string} name - The full path name from Firebase Storage.
 * @returns {{song_name: string, artist_name: string}}
 */
function parseSongName(name) {
    const parts = name.split('/');
    const artist_name = parts[0] || 'Unknown Artist'; // Folder name as artist

    let songFileName = parts[parts.length - 1];
    // Remove .mp3 extension
    songFileName = songFileName.replace(/\.mp3$/, '');
    // Remove [YouTubeID] part (e.g., "[UubRkeu64Hw]")
    const match = songFileName.match(/(.*)\s\[[^\]]+\]$/);
    const song_name = match ? match[1].trim() : songFileName.trim();

    return { song_name, artist_name };
}

/**
 * Toggles the play/pause state of the current song.
 * Updates the play/pause icon accordingly.
 */
function togglePlay() {
    const playPauseIcon = document.getElementById('playPauseIcon');
    const isPlaying = playPauseIcon.getAttribute('data-feather') === 'pause-circle';
    const goToNowPlayingBtn = document.getElementById('goToNowPlayingBtn');

    // Check if there is a current audio object and if it has a valid source
    if (currentAudio && currentAudio.src) {
        if (isPlaying) {
            currentAudio.pause();
            playPauseIcon.setAttribute('data-feather', 'play-circle');
            if (goToNowPlayingBtn) {
                goToNowPlayingBtn.classList.remove('blink-animation');
            }
        } else {
            currentAudio.play();
            playPauseIcon.setAttribute('data-feather', 'pause-circle');
            if (goToNowPlayingBtn && currentView !== 'nowPlaying') {
                goToNowPlayingBtn.classList.add('blink-animation');
            }
        }
    } else if (currentPlaylist.length > 0) {
        // If no audio is loaded but a playlist exists, load and play the current song
        loadSong(currentSongIndex); // currentSongIndex will be relative to currentPlaylist
        if (currentAudio) {
            currentAudio.play();
            playPauseIcon.setAttribute('data-feather', 'pause-circle');
            if (goToNowPlayingBtn && currentView !== 'nowPlaying') {
                goToNowPlayingBtn.classList.add('blink-animation');
            }
        }
    } else {
        // No playable songs available
        playPauseIcon.setAttribute('data-feather', 'play-circle');
        if (goToNowPlayingBtn) {
            goToNowPlayingBtn.classList.remove('blink-animation');
        }
        showMessage('No song available to play.', 2000);
    }
    feather.replace();
}

/**
 * Moves the progress bar based on the click position.
 * This function updates the actual audio seeking.
 * @param {Event} event - The click event.
 */
function moveProgress(event) {
    if (!currentAudio) {
        console.warn('No audio loaded to seek.');
        return;
    }

    const progressBarContainer = event.currentTarget; // The div with class 'progress'
    const clickPosition = event.offsetX / progressBarContainer.offsetWidth;
    currentAudio.currentTime = currentAudio.duration * clickPosition;
}

/**
 * Toggles fullscreen mode for a given element.
 * @param {HTMLElement} element - The HTML element to toggle fullscreen for.
 */
function toggleFullscreen(element) {
    element.classList.toggle('fullscreen');
}

/**
 * Copies text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {boolean} True if successful, false otherwise.
 */
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        document.body.removeChild(textarea);
        return false;
    }
}

/**
 * Displays a temporary message (like a toast notification).
 * @param {string} message - The message to display.
 * @param {number} duration - Duration in milliseconds for the message to be visible.
 */
function showMessage(message, duration = 3000) {
    let messageArea = document.getElementById('message-area');
    if (!messageArea) {
        messageArea = document.createElement('div');
        messageArea.id = 'message-area';
        messageArea.className = 'fixed bottom-4 right-4 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg opacity-0 transition-opacity duration-300 z-50';
        document.body.appendChild(messageArea);
    }
    messageArea.textContent = message;
    messageArea.classList.remove('hidden');
    messageArea.classList.add('opacity-100');

    setTimeout(() => {
        messageArea.classList.remove('opacity-100');
        messageArea.classList.add('opacity-0');
        setTimeout(() => {
            messageArea.classList.add('hidden');
        }, 300); // Allow fade out transition to complete
    }, duration);
}

/**
 * Shows the specified UI view and hides others.
 * @param {string} viewName - The name of the view to show ('nowPlaying' or 'folders').
 */
function showView(viewName) {
    const nowPlayingSection = document.getElementById('now-playing-section');
    const foldersSection = document.getElementById('folders-section');
    const goToNowPlayingBtn = document.getElementById('goToNowPlayingBtn');

    if (viewName === 'nowPlaying') {
        nowPlayingSection.classList.remove('hidden-section');
        foldersSection.classList.add('hidden-section');
        currentView = 'nowPlaying';
        // Stop blinking when in now playing view
        if (goToNowPlayingBtn) {
            goToNowPlayingBtn.classList.remove('blink-animation');
        }
    } else if (viewName === 'folders') {
        nowPlayingSection.classList.add('hidden-section');
        foldersSection.classList.remove('hidden-section');
        currentView = 'folders';
        // Reset currentPlaylist to mainPlayableSongs when returning to folders view
        currentPlaylist = [...mainPlayableSongs];
        currentSongIndex = 0; // Reset index for the main playlist
        loadSong(currentSongIndex); // Reload the first song of main playlist
        renderFolderList(); // Ensure folders are rendered when switching to this view

        // If a song is playing, make the 'Go to Now Playing' button blink
        if (currentAudio && !currentAudio.paused && goToNowPlayingBtn) {
            goToNowPlayingBtn.classList.add('blink-animation');
        } else if (goToNowPlayingBtn) {
            goToNowPlayingBtn.classList.remove('blink-animation');
        }
    }
}


/**
 * Renders the list of folders in the "Explore Playlists" section.
 */
function renderFolderList() {
    const playlistBrowserContent = document.getElementById('playlist-browser-content');
    playlistBrowserContent.innerHTML = ''; // Clear existing content

    const sortedFolderNames = Object.keys(allGroupedTracks).sort();

    const folderGrid = document.createElement('div');
    folderGrid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 mt-4';

    sortedFolderNames.forEach(folderName => {
        const folderButton = document.createElement('button');
        folderButton.className = 'btn border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-all duration-200 ease-in-out rounded-xl py-3 px-4 text-lg font-semibold shadow-md flex flex-col items-center justify-center w-32 h-32 overflow-hidden';
        
        // Format folder name for display and handle overflow
        const displayFolderName = folderName.replace(/radio$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const folderNameSpan = document.createElement('span');
        folderNameSpan.className = 'block w-full overflow-hidden text-ellipsis whitespace-nowrap text-center';
        folderNameSpan.textContent = displayFolderName;

        const folderIcon = document.createElement('i');
        folderIcon.setAttribute('data-feather', 'folder');
        folderIcon.className = 'w-8 h-8 mb-2';

        folderButton.appendChild(folderIcon);
        folderButton.appendChild(folderNameSpan);

        folderButton.addEventListener('click', () => renderSongsInFolder(folderName));
        folderGrid.appendChild(folderButton);
    });
    playlistBrowserContent.appendChild(folderGrid);
    feather.replace(); // Re-render icons after adding new elements
}

/**
 * Renders the songs within a specific folder in the "Explore Playlists" section.
 * Also sets the currentPlaylist to the songs of this folder.
 * @param {string} folderName - The name of the folder to display songs from.
 */
function renderSongsInFolder(folderName) {
    const playlistBrowserContent = document.getElementById('playlist-browser-content');
    playlistBrowserContent.innerHTML = ''; // Clear existing content

    // Set currentPlaylist to the songs of this folder
    currentPlaylist = allGroupedTracks[folderName] || [];

    // Back button
    const backButton = document.createElement('button');
    backButton.className = 'btn border-2 border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 ease-in-out rounded-xl py-2 px-4 text-sm font-semibold shadow-md mb-4 flex items-center';
    backButton.innerHTML = `<i data-feather="arrow-left" class="w-4 h-4 mr-2"></i> Back to Folders`;
    backButton.addEventListener('click', renderFolderList);
    playlistBrowserContent.appendChild(backButton);

    // Folder title
    const folderTitle = document.createElement('h2');
    folderTitle.className = 'text-2xl font-bold text-white mb-4 text-center';
    folderTitle.textContent = folderName.replace(/radio$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    playlistBrowserContent.appendChild(folderTitle);

    const songsContainer = document.createElement('div');
    songsContainer.className = 'bg-gray-700 rounded-md p-2 mb-4 shadow-inner';
    playlistBrowserContent.appendChild(songsContainer);

    // Ensure we have songs to display
    if (currentPlaylist.length === 0) {
        const noSongsMessage = document.createElement('p');
        noSongsMessage.className = 'text-center text-gray-400 p-4';
        noSongsMessage.textContent = 'No songs found in this folder.';
        songsContainer.appendChild(noSongsMessage);
    } else {
        currentPlaylist.forEach((song, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item flex items-center justify-between p-2 rounded-md hover:bg-gray-600 transition-colors cursor-pointer';

            const playIcon = 'play-circle'; // All songs from Firebase are now considered playable
            const iconColorClass = 'text-green-400';

            trackItem.innerHTML = `
                <div class="track-details flex items-center">
                    <img src="${song.cover_image}" alt="Album Cover of ${song.song_name}" class="w-10 h-10 mr-3 rounded-md object-cover">
                    <div class="track-info">
                        <h3 class="text-sm font-medium text-gray-100">${song.song_name}</h3>
                        <p class="text-xs text-gray-400">${song.artist_name}</p>
                    </div>
                </div>
                <div class="track-icons">
                    <i data-feather="${playIcon}" class="${iconColorClass}"></i>
                </div>`;
            songsContainer.appendChild(trackItem);

            trackItem.addEventListener('click', () => {
                currentSongIndex = index; // Set the current song index to the clicked song within the currentPlaylist
                loadSong(currentSongIndex);
                if (currentAudio) {
                    currentAudio.play();
                    document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
                    feather.replace();
                }
                showView('nowPlaying'); // Switch to now playing when a playable song is clicked
            });
        });
    }
    feather.replace(); // Re-render icons after adding new elements
}


/**
 * Creates dynamic song elements for the slideshow and initializes the "Explore Playlists" section.
 * Fetches all song data and populates the HTML.
 */
async function createSongElements() {
    const rawSongsFromFirebase = await fetchAllSongsData(); // Fetch ALL songs from Firebase

    // 1. Prepare songs for the main slideshow (top 5 playable)
    mainPlayableSongs = [];
    for (const playableUrl of laguFavorit) {
        // Extract the path part from the playable URL
        const urlParts = playableUrl.split('/o/');
        let decodedPath = '';
        if (urlParts.length > 1) {
            let encodedPath = urlParts[1].split('?')[0]; // Get the encoded path
            decodedPath = decodeURIComponent(encodedPath); // Decode it
        }
        
        const { song_name, artist_name } = parseSongName(decodedPath); // Parse from the decoded path

        mainPlayableSongs.push({
            song_name: song_name,
            artist_name: artist_name,
            cover_image: `https://placehold.co/150x150/1DB954/white?text=${song_name.substring(0,2)}`,
            audio_url: playableUrl,
            is_playable: true // These are explicitly playable
        });
    }

    // Ensure mainPlayableSongs has exactly MAX_PLAYABLE_SONGS, fill with placeholders if needed
    while (mainPlayableSongs.length < MAX_PLAYABLE_SONGS) {
        mainPlayableSongs.push({
            song_name: `Placeholder Song ${mainPlayableSongs.length + 1}`,
            artist_name: 'Placeholder Artist',
            cover_image: `https://placehold.co/150x150/1DB954/white?text=NA`,
            audio_url: '',
            is_playable: false
        });
    }
    // Trim if by some chance there are more than MAX_PLAYABLE_SONGS
    mainPlayableSongs = mainPlayableSongs.slice(0, MAX_PLAYABLE_SONGS);

    // Set initial currentPlaylist to mainPlayableSongs
    currentPlaylist = [...mainPlayableSongs];


    // 2. Populate the slideshow (main player) based on currentPlaylist (which is mainPlayableSongs initially)
    const slideshow = document.getElementById('slideshow');
    slideshow.innerHTML = ''; // Clear existing content
    currentPlaylist.forEach((song, index) => { // Use currentPlaylist here for initial render
        const songDiv = document.createElement('div');
        songDiv.className = 'song';
        songDiv.style.display = index === currentSongIndex ? 'flex' : 'none';

        const isPlayableInSlideshow = song.is_playable;
        // Display progress bar only for playable songs in the slideshow
        const progressBarHtml = isPlayableInSlideshow && song.audio_url ? `
            <div class="progress-container">
                <span class="time current-time">0:00</span>
                <div class="progress" onclick="moveProgress(event)">
                    <div class="progress-bar" id="progress-bar-current"></div>
                </div>
                <span class="time duration-time">--:--</span>
            </div>` : '';

        songDiv.innerHTML = `
            <img class="album-cover" src="${song.cover_image}" alt="Album Cover of ${song.song_name}" onclick="toggleFullscreen(this)">
            <div class="info">
                <h2 class="song-title">${song.song_name}</h2>
                <p class="song-artist">${song.artist_name}</p>
            </div>
            ${progressBarHtml}`; // Include progress bar only if playable
        slideshow.appendChild(songDiv);
    });

    // 3. Prepare all songs grouped by folder for the "Explore Playlists" section
    const tempGroupedTracks = {};
    rawSongsFromFirebase.forEach(item => {
        const parts = item.name.split('/');
        const folderName = parts[0];
        const { song_name, artist_name } = parseSongName(item.name);

        // Corrected URL construction: FIREBASE_STORAGE_BASE_URL already includes bucket and /o/
        const directFirebaseUrl = `${FIREBASE_STORAGE_BASE_URL}${encodeURIComponent(item.name)}?alt=media`;

        const songObj = {
            song_name: song_name,
            artist_name: artist_name,
            folder_name: folderName,
            cover_image: `https://placehold.co/50x50/333/white?text=${song_name.substring(0,2)}`,
            audio_url: directFirebaseUrl, // All songs fetched from Firebase are now treated as potentially playable
            is_playable: true, // All songs from Firebase storage are now considered playable
            direct_url: directFirebaseUrl // Store direct URL for playback
        };

        if (!tempGroupedTracks[folderName]) {
            tempGroupedTracks[folderName] = [];
        }
        tempGroupedTracks[folderName].push(songObj);
    });

    // Store all grouped tracks globally
    allGroupedTracks = tempGroupedTracks;

    // Initial load, so set the view to folders
    showView('folders');

    feather.replace(); // Re-render feather icons after dynamic content is added
}

/**
 * Loads a song by index, updates the slideshow, and prepares the audio.
 * It now uses the currentPlaylist.
 * @param {number} index - The index of the song to load within the currentPlaylist.
 */
function loadSong(index) {
    if (index < 0 || index >= currentPlaylist.length) {
        console.warn('Invalid song index for current playlist:', index);
        return;
    }

    const songData = currentPlaylist[index];

    // Stop current audio if playing
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ''; // Clear source
        currentAudio.removeEventListener('timeupdate', updateProgressBar);
        currentAudio.removeEventListener('ended', playNextSong);
    }

    // Update slideshow UI for the selected song
    const slideshow = document.getElementById('slideshow');
    slideshow.innerHTML = ''; // Clear previous song display

    const songDiv = document.createElement('div');
    songDiv.className = 'song active'; // Mark as active
    songDiv.style.display = 'flex'; // Always show this single song

    // Progress bar for the currently loaded song
    const progressBarHtml = songData.is_playable && songData.audio_url ? `
        <div class="progress-container">
            <span class="time current-time">0:00</span>
            <div class="progress" onclick="moveProgress(event)">
                <div class="progress-bar" id="progress-bar-current"></div>
            </div>
            <span class="time duration-time">--:--</span>
        </div>` : '';

    songDiv.innerHTML = `
        <img class="album-cover" src="${songData.cover_image}" alt="Album Cover of ${songData.song_name}" onclick="toggleFullscreen(this)">
        <div class="info">
            <h2 class="song-title">${songData.song_name}</h2>
            <p class="song-artist">${songData.artist_name}</p>
        </div>
        ${progressBarHtml}`;
    slideshow.appendChild(songDiv);


    // Only create Audio object if the song is playable and has an audio_url
    if (songData && songData.is_playable && songData.audio_url) {
        currentAudio = new Audio(songData.audio_url);

        currentAudio.addEventListener('loadedmetadata', () => {
            // Update duration once metadata is loaded
            updateProgressBar();
        });

        currentAudio.addEventListener('timeupdate', updateProgressBar);
        currentAudio.addEventListener('ended', playNextSong);

        // Reset play/pause icon to play state when a new song is loaded
        const playPauseIcon = document.getElementById('playPauseIcon');
        playPauseIcon.setAttribute('data-feather', 'play-circle');
        feather.replace();
    } else {
        console.warn('No audio URL found or song is not playable:', songData);
        currentAudio = null; // Ensure currentAudio is null for non-playable songs
        // Reset progress bar and time for non-playable songs if elements exist
        const progressBar = document.getElementById('progress-bar-current');
        if (progressBar) progressBar.style.width = '0%';
        const timeSpans = songDiv.querySelectorAll('.time');
        if (timeSpans.length === 2) {
            timeSpans[0].textContent = '0:00';
            timeSpans[1].textContent = '--:--';
        }
        // Ensure main play/pause icon is 'play-circle' for non-playable songs
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
}

/**
 * Updates the progress bar and time display for the current song.
 */
function updateProgressBar() {
    if (!currentAudio || currentAudio.duration === Infinity || isNaN(currentAudio.duration)) {
        // Handle cases where duration is not available (e.g., live streams, or not loaded yet)
        return;
    }

    // The progress bar ID is now dynamic based on the currently displayed song in the slideshow
    const progressBar = document.getElementById('progress-bar-current');
    const timeSpans = document.querySelector('.song.active')?.querySelectorAll('.time');

    if (progressBar) {
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        progressBar.style.width = progress + '%';
    }

    if (timeSpans && timeSpans.length === 2) {
        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        };
        timeSpans[0].textContent = formatTime(currentAudio.currentTime);
        timeSpans[1].textContent = currentAudio.duration ? formatTime(currentAudio.duration) : '--:--';
    }
}

/**
 * Plays the next song in the current playlist when the current one ends.
 */
function playNextSong() {
    if (currentPlaylist.length === 0) {
        console.warn('No songs in current playlist to play next.');
        return;
    }
    currentSongIndex = (currentSongIndex + 1) % currentPlaylist.length;
    loadSong(currentSongIndex);
    if (currentAudio) {
        currentAudio.play();
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
        feather.replace();
    } else {
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
}


// Event listeners for navigation
document.getElementById('prev').addEventListener('click', () => {
    if (currentPlaylist.length === 0) {
        showMessage('No songs to navigate.');
        return;
    }
    currentSongIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    loadSong(currentSongIndex);
    if (currentAudio) {
        currentAudio.play();
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
        feather.replace();
    } else {
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
});

document.getElementById('next').addEventListener('click', () => {
    if (currentPlaylist.length === 0) {
        showMessage('No songs to navigate.');
        return;
    }
    currentSongIndex = (currentSongIndex + 1) % currentPlaylist.length;
    loadSong(currentSongIndex);
    if (currentAudio) {
        currentAudio.play();
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
        feather.replace();
    } else {
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
});

// Event listener for the main play/pause button
document.getElementById('playPauseButton').addEventListener('click', togglePlay);


// Event listeners for view switching buttons
document.getElementById('goToFoldersBtn').addEventListener('click', () => showView('folders'));
document.getElementById('goToNowPlayingBtn').addEventListener('click', () => showView('nowPlaying'));


// Initial setup on page load
createSongElements().then(() => {
    // Hide loading overlay and show content after everything is loaded
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('__next').classList.remove('hidden');

    loadSong(currentSongIndex); // Load the initial song (from mainPlayableSongs)
    // Set initial view to folders
    showView('folders');
}).catch(error => {
    console.error("Failed to load initial song elements:", error);
    // Even if there's an error, hide the loading overlay to not block the user
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('__next').classList.remove('hidden');
    showMessage('Failed to load music. Please try again later.', 5000);
});

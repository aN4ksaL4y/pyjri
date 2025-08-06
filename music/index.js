feather.replace(); // Initialize Feather icons on page load

// Global variables for song management
let currentSongIndex = 0;
let songsArray = []; // Stores songs for the main player slideshow (first 5 playable)
let currentAudio = null; // To hold the current playing audio object
const MAX_PLAYABLE_SONGS = 5; // Define the limit for playable songs
let allGroupedTracks = {}; // To store all songs grouped by folder for the "Explore Playlists" section
let currentView = 'folders'; // Tracks the currently active view: 'nowPlaying' or 'folders'

// Specific list of playable song URLs provided by the user (string-only)
const playableSongUrls = [
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FFrom%20Paris%20With%20Love%20%5BMre9BZnYe4w%5D.mp3?alt=media&token=69adb3b0-fae6-473c-b7a6-c76bb294fb9a",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/blues%20man%20radio%2FBlues%20Man%20%5BeDuKJhnF2oU%5D.mp3?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FYou%20Don't%20Know%20Me%20%5BRKuCICP6oDE%5D.mp3?alt=media",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FDream%20a%20Little%20Dream%20of%20Me%20%5BTyFMfLWNZ2I%5D.mp3?alt=media&token=49776bb8-41a5-468b-8aba-c2928360e1c2",
    "https://firebasestorage.googleapis.com/v0/b/playlistden-103db.appspot.com/o/come%20away%20with%20me%2FCome%20Away%20With%20Me%20%5BmvLDrx3YQ4Q%5D.mp3?alt=media&token=0fdac2dc-a75d-4398-a272-5f8ba7d5665f"
];

// Base URL for Firebase Storage to construct full audio URLs
const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0/b/';

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
    const goToNowPlayingBtn = document.getElementById('goToNowPlayingBtn'); // Get the button

    // Check if the current song is within the playable limit and has a valid audio URL
    if (currentSongIndex < MAX_PLAYABLE_SONGS && songsArray[currentSongIndex] && songsArray[currentSongIndex].audio_url) {
        if (isPlaying) {
            // Pause the song
            if (currentAudio) {
                currentAudio.pause();
            }
            playPauseIcon.setAttribute('data-feather', 'play-circle');
            // Stop blinking when paused
            if (goToNowPlayingBtn) {
                goToNowPlayingBtn.classList.remove('blink-animation');
            }
        } else {
            // Play the song
            if (currentAudio) {
                currentAudio.play();
            } else {
                // If no song is loaded or playing, load and play the current song
                loadSong(currentSongIndex);
                if (currentAudio) { // Check again after loading
                    currentAudio.play();
                }
            }
            playPauseIcon.setAttribute('data-feather', 'pause-circle');
            // Start blinking when playing, if not already in "Now Playing" view
            if (goToNowPlayingBtn && currentView !== 'nowPlaying') {
                goToNowPlayingBtn.classList.add('blink-animation');
            }
        }
    } else {
        // If song is not playable, ensure icon is 'play-circle' and do not attempt playback
        playPauseIcon.setAttribute('data-feather', 'play-circle');
        // Ensure no blinking for non-playable songs
        if (goToNowPlayingBtn) {
            goToNowPlayingBtn.classList.remove('blink-animation');
        }
        console.warn(`Song at index ${currentSongIndex} is not playable (beyond limit or no audio URL).`);
    }
    feather.replace(); // Re-render feather icons after changing attributes
}

/**
 * Moves the progress bar based on the click position.
 * This function currently only updates the visual width of the progress bar.
 * For actual audio seeking, an Audio object would be needed.
 * @param {Event} event - The click event.
 * @param {number} songIndex - The index of the song.
 */
function moveProgress(event, songIndex) {
    // Only allow progress bar interaction for playable songs
    if (songIndex >= MAX_PLAYABLE_SONGS || !songsArray[songIndex] || !songsArray[songIndex].audio_url) {
        console.warn(`Progress bar interaction disabled for non-playable song at index ${songIndex}.`);
        return;
    }

    const progressBar = document.querySelector(`#progress-bar-${songIndex}`);
    if (!progressBar) return; // Ensure the progress bar exists

    const progressContainer = progressBar.parentElement;
    const clickPosition = event.offsetX / progressContainer.offsetWidth;
    progressBar.style.width = (clickPosition * 100) + '%';

    // In a real player, you would also seek the audio here:
    if (currentAudio && currentSongIndex === songIndex) {
        currentAudio.currentTime = currentAudio.duration * clickPosition;
    }
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
        // Added w-32 h-32 for square appearance, and flex-col for stacking icon/text
        // Added overflow-hidden to clip text if too long
        folderButton.className = 'btn border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-all duration-200 ease-in-out rounded-xl py-3 px-4 text-lg font-semibold shadow-md flex flex-col items-center justify-center w-32 h-32 overflow-hidden';
        
        // Format folder name for display and handle overflow
        const displayFolderName = folderName.replace(/radio$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const folderNameSpan = document.createElement('span');
        // Added block, w-full, overflow-hidden, text-ellipsis, whitespace-nowrap for text clipping
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
 * @param {string} folderName - The name of the folder to display songs from.
 */
function renderSongsInFolder(folderName) {
    const playlistBrowserContent = document.getElementById('playlist-browser-content');
    playlistBrowserContent.innerHTML = ''; // Clear existing content

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

    const songsInFolder = allGroupedTracks[folderName] || [];
    songsInFolder.forEach(song => {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item flex items-center justify-between p-2 rounded-md hover:bg-gray-600 transition-colors cursor-pointer';

        const playIcon = song.is_playable ? 'play-circle' : 'info';
        const iconColorClass = song.is_playable ? 'text-green-400' : 'text-gray-500';

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
            if (song.is_playable) {
                // Find the index of this playable song in the main songsArray
                const mainSongsArrayIndex = songsArray.findIndex(s => s.audio_url === song.audio_url);
                if (mainSongsArrayIndex !== -1) {
                    currentSongIndex = mainSongsArrayIndex;
                    loadSong(currentSongIndex);
                    if (currentAudio) {
                        currentAudio.play();
                        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
                        feather.replace();
                    }
                }
                showView('nowPlaying'); // Switch to now playing when a playable song is clicked
            } else {
                // Redirect directly to the song's URL
                window.open(song.direct_url, '_blank');
                console.warn(`Redirecting to direct URL for "${song.song_name}": ${song.direct_url}`);
            }
        });
    });
    feather.replace(); // Re-render icons after adding new elements
}


/**
 * Creates dynamic song elements for the slideshow and initializes the "Explore Playlists" section.
 * Fetches all song data and populates the HTML.
 */
async function createSongElements() {
    const rawSongsFromFirebase = await fetchAllSongsData(); // Fetch ALL songs from Firebase

    // 1. Prepare songs for the main slideshow (top 5 playable)
    songsArray = [];
    for (const playableUrl of playableSongUrls) {
        // Extract the path part from the playable URL
        const urlParts = playableUrl.split('/o/');
        let decodedPath = '';
        if (urlParts.length > 1) {
            let encodedPath = urlParts[1].split('?')[0]; // Get the encoded path
            decodedPath = decodeURIComponent(encodedPath); // Decode it
        }
        
        const { song_name, artist_name } = parseSongName(decodedPath); // Parse from the decoded path

        songsArray.push({
            song_name: song_name,
            artist_name: artist_name,
            cover_image: `https://placehold.co/150x150/1DB954/white?text=${song_name.substring(0,2)}`,
            audio_url: playableUrl,
            is_playable: true // These are explicitly playable
        });
    }

    // Ensure songsArray has exactly MAX_PLAYABLE_SONGS, fill with placeholders if needed
    while (songsArray.length < MAX_PLAYABLE_SONGS) {
        songsArray.push({
            song_name: `Placeholder Song ${songsArray.length + 1}`,
            artist_name: 'Placeholder Artist',
            cover_image: `https://placehold.co/150x150/1DB954/white?text=NA`,
            audio_url: '',
            is_playable: false
        });
    }
    // Trim if by some chance there are more than MAX_PLAYABLE_SONGS
    songsArray = songsArray.slice(0, MAX_PLAYABLE_SONGS);


    // 2. Populate the slideshow (main player)
    const slideshow = document.getElementById('slideshow');
    slideshow.innerHTML = ''; // Clear existing content
    songsArray.forEach((song, index) => {
        const songDiv = document.createElement('div');
        songDiv.className = 'song';
        songDiv.style.display = index === currentSongIndex ? 'flex' : 'none';

        const isPlayableInSlideshow = song.is_playable; // Use the is_playable flag from the song object
        // Display progress bar only for playable songs in the slideshow
        const progressBarHtml = isPlayableInSlideshow ? `
            <div class="progress-container">
                <span class="time current-time">0:00</span>
                <div class="progress" onclick="moveProgress(event, ${index})">
                    <div class="progress-bar" id="progress-bar-${index}"></div>
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
        const { song_name, artist_name } = parseSongName(item.name); // Use parseSongName for general songs

        const directFirebaseUrl = `${FIREBASE_STORAGE_BASE_URL}${item.bucket}/o/${encodeURIComponent(item.name)}?alt=media`;

        // Determine if this song is one of the top 5 playable songs for the track list
        let isTopPlayable = playableSongUrls.includes(directFirebaseUrl); // Check if its URL is in the playable list

        const songObj = {
            song_name: song_name,
            artist_name: artist_name,
            folder_name: folderName,
            cover_image: `https://placehold.co/50x50/333/white?text=${song_name.substring(0,2)}`,
            audio_url: isTopPlayable ? directFirebaseUrl : '', // Only set audio_url if playable
            is_playable: isTopPlayable,
            direct_url: directFirebaseUrl
        };

        if (!tempGroupedTracks[folderName]) {
            tempGroupedTracks[folderName] = [];
        }
        tempGroupedTracks[folderName].push(songObj);
    });

    // Store all grouped tracks globally
    allGroupedTracks = tempGroupedTracks;

    // Initialize the view to folders
    showView('folders');

    feather.replace(); // Re-render feather icons after dynamic content is added
}

/**
 * Loads a song by index, updates the slideshow, and prepares the audio.
 * @param {number} index - The index of the song to load.
 */
function loadSong(index) {
    const songElements = document.querySelectorAll('.song');
    songElements.forEach((song, i) => {
        // Remove 'active' class from all songs
        song.classList.remove('active');
        song.style.display = i === index ? 'flex' : 'none'; // Show current, hide others
    });

    // Add 'active' class to the currently loaded song
    const currentSongElement = songElements[index];
    if (currentSongElement) {
        currentSongElement.classList.add('active');
        // Update the song title and artist in the "Now Playing" section
        currentSongElement.querySelector('.song-title').textContent = songsArray[index].song_name;
        currentSongElement.querySelector('.song-artist').textContent = songsArray[index].artist_name;
        currentSongElement.querySelector('.album-cover').src = songsArray[index].cover_image;
        currentSongElement.querySelector('.album-cover').alt = `Album Cover of ${songsArray[index].song_name}`;
    }

    // Stop current audio if playing
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ''; // Clear source
        currentAudio.removeEventListener('timeupdate', updateProgressBar);
        currentAudio.removeEventListener('ended', playNextSong);
    }

    const songData = songsArray[index];
    // Only create Audio object if the song is playable (within limit and has audio_url)
    if (songData && songData.is_playable && songData.audio_url) { // Use songData.is_playable directly
        currentAudio = new Audio(songData.audio_url);

        // Update progress bar
        currentAudio.addEventListener('timeupdate', updateProgressBar);

        // Play next song when current one ends
        currentAudio.addEventListener('ended', playNextSong);

        // Reset play/pause icon to play state when a new song is loaded
        const playPauseIcon = document.getElementById('playPauseIcon');
        playPauseIcon.setAttribute('data-feather', 'play-circle');
        feather.replace();
    } else {
        console.warn('No audio URL found or song is not playable:', songData);
        currentAudio = null; // Ensure currentAudio is null for non-playable songs
        // Reset progress bar and time for non-playable songs
        const progressBar = document.querySelector(`#progress-bar-${index}`);
        if (progressBar) progressBar.style.width = '0%';
        const timeSpans = currentSongElement ? currentSongElement.querySelectorAll('.time') : [];
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

    const progressBar = document.querySelector(`#progress-bar-${currentSongIndex}`);
    // Select time spans within the currently active song element
    const currentSongElement = document.querySelector('.song.active');
    const timeSpans = currentSongElement ? currentSongElement.querySelectorAll('.time') : [];

    if (progressBar) {
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        progressBar.style.width = progress + '%';
    }

    if (timeSpans.length === 2) {
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
 * Plays the next song in the playlist when the current one ends.
 */
function playNextSong() {
    // Increment index and loop back if at the end
    let nextIndex = (currentSongIndex + 1) % songsArray.length;

    // Find the next playable song in the sequence
    // If the current song is the last playable one, loop back to the first playable.
    if (currentSongIndex === MAX_PLAYABLE_SONGS - 1) {
        currentSongIndex = 0; // Loop back to the first song
    } else {
        currentSongIndex = nextIndex;
    }

    loadSong(currentSongIndex);
    if (currentAudio) { // Only attempt to play if currentAudio was successfully created (i.e., song is playable)
        currentAudio.play();
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
        feather.replace();
    } else {
        // If the next song is not playable, ensure the main play/pause icon is 'play-circle'
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
}


// Event listeners for navigation
document.getElementById('prev').addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + songsArray.length) % songsArray.length;
    loadSong(currentSongIndex);
    if (currentAudio) { // Only attempt to play if currentAudio was successfully created
        currentAudio.play(); // Auto-play when navigating
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'pause-circle');
        feather.replace();
    } else {
        document.getElementById('playPauseIcon').setAttribute('data-feather', 'play-circle');
        feather.replace();
    }
});

document.getElementById('next').addEventListener('click', () => {
    currentSongIndex = (currentSongIndex + 1) % songsArray.length;
    loadSong(currentSongIndex);
    if (currentAudio) { // Only attempt to play if currentAudio was successfully created
        currentAudio.play(); // Auto-play when navigating
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
    loadSong(currentSongIndex);
    // Set initial view to folders
    showView('folders');
});

feather.replace();
function togglePlay(songId) {
    const playPauseIcon = document.getElementById('playPauseIcon-' + songId);
    const isPlaying = playPauseIcon.getAttribute('data-feather') === 'pause-circle';
    playPauseIcon.setAttribute('data-feather', isPlaying ? 'play-circle' : 'pause-circle');
    feather.replace();
}

function moveProgress(event, songId) {
    const progressContainer = document.querySelector(`#progress-bar-${songId}`).parentElement;
    const progressBar = document.querySelector(`#progress-bar-${songId}`);
    const clickPosition = event.offsetX / progressContainer.offsetWidth;
    progressBar.style.width = (clickPosition * 100) + '%';
}

function toggleFullscreen(element) {
    element.classList.toggle('fullscreen');
}
const apiUrl = 'https://gist.githubusercontent.com/github3112/457b453bb2e74d8bd23d74176f842ada/raw/recently_played.json'


async function fetchSongData(apiUrl) {
    try {
        const response = await fetch(apiUrl);

        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching song data:', error);
        return []; // Return an empty array in case of an error
    }
}

let currentSongIndex = 0;
let songsArray = []; // Declare songsArray globally

// Function to create the song elements dynamically
async function createSongElements() {
    songsArray = await fetchSongData(apiUrl); // Fetch and assign songsArray

    const slideshow = document.getElementById('slideshow');
    slideshow.innerHTML = '';

    const trackList = document.getElementById('track-list');
    trackList.innerHTML = '';

    // Use forEach to iterate over the array
    songsArray.forEach((song, index) => {
        const songDiv = document.createElement('div');
        songDiv.className = 'song';
        songDiv.style.display = index === currentSongIndex ? 'block' : 'none'; // Show only the current song

        songDiv.innerHTML = `
            <img class="album-cover" src="${song.cover_image}" alt="Album Cover of ${song.song_name}">
            <div class="info">
                <h2 class="song-title">${song.song_name}</h2>
                <p class="song-artist">${song.artist_name}</p>
            </div>
            <div class="progress-container">
                <span></span>
                <div class="progress" onclick="moveProgress(event, 1)">
                    <div class="progress-bar" id="progress-bar-1"></div>
                </div>
                <span></span>
            </div>`;
        slideshow.appendChild(songDiv);
        


        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.innerHTML = `
            <div class="track-details">
                <img src="${song.cover_image}" alt="Album Cover of ${song.song_name}">
                <div class="track-info">
                    <h3>${song.song_name}</h3>
                    <p>${song.artist_name}</p>
                </div>
            </div>`;
        trackList.appendChild(trackItem);
    });
}

// Function to load the current song
function loadSong(index) {
    const songElements = document.querySelectorAll('.song');
    songElements.forEach((song, i) => {
        song.style.display = i === index ? 'block' : 'none'; // Show the current song
    });
}

// Event listeners for navigation
document.getElementById('prev').addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + songsArray.length) % songsArray.length;
    loadSong(currentSongIndex);
});

document.getElementById('next').addEventListener('click', () => {
    currentSongIndex = (currentSongIndex + 1) % songsArray.length;
    loadSong(currentSongIndex);
});

// Create song elements and load the first song on page load
createSongElements().then(() => loadSong(currentSongIndex));
document.getElementById('toggleButton').addEventListener('click', function() {
    const content = document.getElementById('content');
    const tombol = document.getElementById('toggleButton');
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block'; // Show content
        tombol.style.display = 'none';

    } else {
        content.style.display = 'none'; // Hide content
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Plyr
    const player = new Plyr('#player', {
        controls: ['play-large', 'play', 'current-time', 'mute', 'volume', 'fullscreen'],
        keyboard: { focused: true, global: true }
    });

    // Move the scrubber container inside .plyr so it remains visible in fullscreen mode
    player.on('ready', () => {
        const plyrContainer = document.querySelector('.plyr');
        const scrubberContainer = document.querySelector('.custom-scrubber-container');
        if (plyrContainer && scrubberContainer) {
            plyrContainer.appendChild(scrubberContainer);
        }
        
        // Intercept mouseleave on plyr container to prevent controls from hiding when moving to the header
        const playerHeader = document.querySelector('.player-header');
        if (plyrContainer && playerHeader) {
            plyrContainer.addEventListener('mouseleave', (e) => {
                // If the mouse is moving to the player-header, stop the event from reaching Plyr
                if (e.relatedTarget && (playerHeader === e.relatedTarget || playerHeader.contains(e.relatedTarget))) {
                    e.stopImmediatePropagation();
                }
            }, true); // Use capture phase
            
            // Also prevent mouseenter on playerHeader from bubbling to anything else just in case
            playerHeader.addEventListener('mouseenter', () => {
                player.toggleControls(true);
            });
        }
    });

    const movieGridEl = document.getElementById('movie-grid');
    const searchInput = document.getElementById('search-input');
    const playerOverlay = document.getElementById('player-overlay');
    const closePlayerBtn = document.getElementById('close-player');
    const nowPlayingTitleEl = document.getElementById('now-playing-title');
    
    let allMovies = [];
    let currentMoviePath = null;
    let currentMovieDuration = 0;
    let currentSeekOffset = 0;
    let isSeeking = false;
    let uiTimeout;
    
    const customScrubber = document.getElementById('custom-scrubber');
    const customScrubberProgress = document.getElementById('custom-scrubber-progress');

    // Fetch movies from API
    async function fetchMovies() {
        try {
            const response = await fetch('/api/movies');
            allMovies = await response.json();
            renderMovies(allMovies);
        } catch (error) {
            console.error('Failed to fetch movies:', error);
            movieGridEl.innerHTML = '<div class="loading">Failed to load movies. Make sure server is running.</div>';
        }
    }

    // Render movies in Grid
    function renderMovies(movies) {
        movieGridEl.innerHTML = '';
        
        if (!movies || movies.length === 0) {
            movieGridEl.innerHTML = '<div class="loading">No movies found.</div>';
            return;
        }

        movies.forEach((movie, index) => {
            const card = document.createElement('div');
            // Assign a random gradient from 1-5
            const gradientClass = `gradient-${(index % 5) + 1}`;
            card.className = `movie-card ${gradientClass}`;
            
            // Clean up the name a bit (remove extension)
            const cleanName = movie.name.replace(/\.[^/.]+$/, "");
            
            card.innerHTML = `<span class="movie-card-title">${cleanName}</span>`;
            
            card.addEventListener('click', () => {
                openPlayer(movie.path, cleanName);
            });
            
            movieGridEl.appendChild(card);
        });
    }

    // Search filter
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allMovies.filter(movie => movie.name.toLowerCase().includes(query));
        renderMovies(filtered);
    });

    // Open Player
    async function openPlayer(path, name) {
        currentMoviePath = path;
        currentSeekOffset = 0;
        nowPlayingTitleEl.textContent = name;
        
        // Show Overlay
        playerOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent background scrolling

        if (customScrubber) {
            customScrubber.disabled = true;
            customScrubber.value = 0;
            if (customScrubberProgress) {
                customScrubberProgress.style.width = '0%';
            }
        }

        try {
            // Fetch precise duration
            const encodedPath = encodeURIComponent(currentMoviePath);
            const metaRes = await fetch(`/api/metadata?path=${encodedPath}`);
            const meta = await metaRes.json();
            currentMovieDuration = meta.duration || 0;
            
            if (customScrubber && currentMovieDuration > 0) {
                customScrubber.max = currentMovieDuration;
                customScrubber.disabled = false;
            }
        } catch (e) {
            console.error('Failed to fetch metadata', e);
        }

        loadStream(0);
    }

    // Close Player
    closePlayerBtn.addEventListener('click', () => {
        player.stop();
        playerOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        currentMoviePath = null;
    });

    // Load Stream
    function loadStream(seekTimeInSeconds) {
        if (!currentMoviePath) return;
        const encodedPath = encodeURIComponent(currentMoviePath);
        const url = `/stream?path=${encodedPath}&seek=${seekTimeInSeconds}`;

        if (player.media) {
            player.media.src = url;
        } else {
            player.source = {
                type: 'video',
                sources: [ { src: url, type: 'video/mp4' } ]
            };
        }
        player.play().catch(e => console.log('Auto-play prevented:', e));
    }

    // Custom Scrubber Logic
    if (customScrubber) {
        customScrubber.addEventListener('input', (e) => {
            if (!currentMoviePath) return;
            isSeeking = true;
            const newAbsoluteTime = parseFloat(e.target.value);
            currentSeekOffset = newAbsoluteTime;
            updateScrubberUI(newAbsoluteTime);
        });

        customScrubber.addEventListener('change', (e) => {
            if (!currentMoviePath) return;
            isSeeking = true;
            player.toggleControls(false);
            const newAbsoluteTime = parseFloat(e.target.value);
            currentSeekOffset = newAbsoluteTime;
            
            loadStream(currentSeekOffset);
            
            player.once('playing', () => { 
                isSeeking = false; 
            });
            setTimeout(() => { 
                isSeeking = false; 
            }, 2000);
        });
    }

    // Update custom scrubber visual fill
    function updateScrubberUI(absoluteTime) {
        if (currentMovieDuration > 0 && customScrubberProgress) {
            const percent = (absoluteTime / currentMovieDuration) * 100;
            customScrubberProgress.style.width = `${Math.min(percent, 100)}%`;
        }
    }

    // Sync scrubber with playback
    player.on('timeupdate', () => {
        if (!isSeeking && customScrubber && currentMovieDuration > 0) {
            const currentTime = currentSeekOffset + player.currentTime;
            customScrubber.value = currentTime;
            updateScrubberUI(currentTime);
        }
    });
    
    // UI idle hiding for player overlay synced with Plyr native controls
    player.on('controlshidden', () => {
        playerOverlay.classList.remove('active-controls');
    });
    
    player.on('controlsshown', () => {
        playerOverlay.classList.add('active-controls');
    });



    // Handle Keyboard Shortcuts for Seeking
    document.addEventListener('keydown', (e) => {
        if (!currentMoviePath || playerOverlay.classList.contains('hidden')) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();

            isSeeking = true;
            player.toggleControls(false);
            const skipAmount = 10;
            let targetTime = currentSeekOffset + player.currentTime;

            if (e.key === 'ArrowRight') {
                targetTime += skipAmount;
            } else if (e.key === 'ArrowLeft') {
                targetTime -= skipAmount;
            }

            if (targetTime < 0) targetTime = 0;
            if (currentMovieDuration > 0 && targetTime > currentMovieDuration) {
                targetTime = currentMovieDuration;
            }

            currentSeekOffset = targetTime;

            if (customScrubber) {
                customScrubber.value = currentSeekOffset;
                updateScrubberUI(currentSeekOffset);
            }

            loadStream(currentSeekOffset);

            player.once('playing', () => { 
                isSeeking = false; 
            });
            setTimeout(() => { 
                isSeeking = false; 
            }, 2000);
        }
    });

    // Start
    fetchMovies();
});

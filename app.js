// FlashCard type definition (in TypeScript style comments)
/**
 * @typedef {Object} FlashCard
 * @property {string} id
 * @property {Object} front
 * @property {string} front.primaryText
 * @property {string} [front.secondaryText]
 * @property {string} [front.audioUrl]
 * @property {Object} back
 * @property {string} back.translation
 * @property {string} [back.example]
 * @property {string} [back.notes]
 * @property {boolean} isFavourite
 */

/**
 * @typedef {Object} AppState
 * @property {FlashCard[]} cards
 * @property {number} index
 * @property {string[]} knownIds
 * @property {string[]} learningIds
 * @property {Array<{action: 'left'|'right', card: FlashCard}>} history
 * @property {boolean} isFlipped
 * @property {string} theme
 */

class FlashCardApp {
    constructor() {
        // Wait for auth manager to be ready
        this.waitForAuth();
    }

    waitForAuth() {
        if (typeof authManager !== 'undefined') {
            this.initializeApp();
        } else {
            setTimeout(() => this.waitForAuth(), 100);
        }
    }

    initializeApp() {
        this.authManager = authManager;
        
        this.state = {
            cards: this.generateSampleCards(),
            index: 0,
            knownIds: [],
            learningIds: [],
            history: [],
            isFlipped: false,
            theme: localStorage.getItem('flashcard-theme') || 'dark'
        };

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isDragging = false;
        this.currentAudio = null;
        this.sessionStartTime = Date.now();

        this.initializeElements();
        this.setupEventListeners();
        this.loadUserProgress();
        this.applyTheme();
        this.render();
    }

    generateSampleCards() {
        return [
            {
                id: '1',
                front: {
                    primaryText: 'Hallo',
                    secondaryText: 'greeting',
                    audioUrl: null
                },
                back: {
                    translation: 'Hello',
                    example: 'Hallo, wie geht es dir?',
                    notes: 'Common greeting'
                },
                isFavourite: false
            },
            {
                id: '2',
                front: {
                    primaryText: 'Danke',
                    secondaryText: 'expression of gratitude',
                    audioUrl: null
                },
                back: {
                    translation: 'Thank you',
                    example: 'Danke für deine Hilfe!',
                    notes: 'Polite expression'
                },
                isFavourite: true
            },
            {
                id: '3',
                front: {
                    primaryText: 'Lernen',
                    secondaryText: 'verb (infinitive)',
                    audioUrl: null
                },
                back: {
                    translation: 'To learn',
                    example: 'Ich möchte Deutsch lernen.',
                    notes: 'Regular verb'
                },
                isFavourite: false
            },
            {
                id: '4',
                front: {
                    primaryText: 'Haus',
                    secondaryText: 'noun (neuter)',
                    audioUrl: null
                },
                back: {
                    translation: 'House',
                    example: 'Das Haus ist sehr groß.',
                    notes: 'Das Haus, die Häuser'
                },
                isFavourite: false
            },
            {
                id: '5',
                front: {
                    primaryText: 'Schön',
                    secondaryText: 'adjective',
                    audioUrl: null
                },
                back: {
                    translation: 'Beautiful / Nice',
                    example: 'Das ist ein schönes Bild.',
                    notes: 'Can mean beautiful, nice, or lovely'
                },
                isFavourite: false
            }
        ];
    }

    initializeElements() {
        this.elements = {
            closeBtn: document.getElementById('closeBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            progressLabel: document.getElementById('progressLabel'),
            knowPill: document.getElementById('knowPill'),
            learningPill: document.getElementById('learningPill'),
            knowCounter: document.getElementById('knowCounter'),
            learningCounter: document.getElementById('learningCounter'),
            cardContainer: document.getElementById('cardContainer'),
            flashcard: document.getElementById('flashcard'),
            audioBtn: document.getElementById('audioBtn'),
            starBtn: document.getElementById('starBtn'),
            audioBtnBack: document.getElementById('audioBtnBack'),
            starBtnBack: document.getElementById('starBtnBack'),
            primaryText: document.getElementById('primaryText'),
            secondaryText: document.getElementById('secondaryText'),
            translation: document.getElementById('translation'),
            example: document.getElementById('example'),
            notes: document.getElementById('notes'),
            undoBtn: document.getElementById('undoBtn'),
            nextBtn: document.getElementById('nextBtn'),
            themeToggle: document.getElementById('themeToggle')
        };
    }    setupEventListeners() {
        // Card flip on tap
        this.elements.flashcard.addEventListener('click', (e) => {
            if (e.target.classList.contains('card-icon')) return;
            this.flipCard();
        });

        // Touch events for swiping
        this.elements.flashcard.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.elements.flashcard.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.elements.flashcard.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Mouse events for desktop swiping
        this.elements.flashcard.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Button controls
        this.elements.undoBtn.addEventListener('click', this.undo.bind(this));
        this.elements.nextBtn.addEventListener('click', () => this.swipeCard('right'));

        // Audio buttons
        this.elements.audioBtn.addEventListener('click', this.playAudio.bind(this));
        this.elements.audioBtnBack.addEventListener('click', this.playAudio.bind(this));

        // Star buttons
        this.elements.starBtn.addEventListener('click', this.toggleFavourite.bind(this));
        this.elements.starBtnBack.addEventListener('click', this.toggleFavourite.bind(this));

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));

        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Close button
        this.elements.closeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to close the app?')) {
                window.close();
            }
        });

        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => {
            this.showAccountSettings();
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
            logoutBtn.style.display = 'block';
        }

        // Account settings
        this.setupAccountSettingsListeners();

        // Auto-save progress periodically
        setInterval(() => {
            this.saveUserProgress();
        }, 30000); // Save every 30 seconds

        // Save progress when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.saveUserProgress();
        });
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isDragging = false;
    }

    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - this.touchStartX;
        const deltaY = touchY - this.touchStartY;

        // Only start dragging if horizontal movement is greater than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            this.isDragging = true;
            e.preventDefault();

            // Visual feedback during drag
            const progress = Math.min(Math.abs(deltaX) / 100, 1);
            const rotation = deltaX > 0 ? progress * 12 : -progress * 12;
            const opacity = 1 - progress * 0.3;

            this.elements.flashcard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
            this.elements.flashcard.style.opacity = opacity;
        }
    }

    handleTouchEnd(e) {
        if (!this.isDragging) {
            this.touchStartX = null;
            this.touchStartY = null;
            return;
        }

        const touchX = e.changedTouches[0].clientX;
        const deltaX = touchX - this.touchStartX;
        const threshold = 80;

        // Reset visual state
        this.elements.flashcard.style.transform = '';
        this.elements.flashcard.style.opacity = '';

        if (Math.abs(deltaX) > threshold) {
            this.swipeCard(deltaX > 0 ? 'right' : 'left');
        }

        this.isDragging = false;
        this.touchStartX = null;
        this.touchStartY = null;
    }

    handleMouseDown(e) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        this.isDragging = false;
    }

    handleMouseMove(e) {
        if (!this.touchStartX) return;

        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            this.isDragging = true;

            const progress = Math.min(Math.abs(deltaX) / 100, 1);
            const rotation = deltaX > 0 ? progress * 12 : -progress * 12;
            const opacity = 1 - progress * 0.3;

            this.elements.flashcard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
            this.elements.flashcard.style.opacity = opacity;
        }
    }

    handleMouseUp(e) {
        if (!this.isDragging) {
            this.touchStartX = null;
            this.touchStartY = null;
            return;
        }

        const deltaX = e.clientX - this.touchStartX;
        const threshold = 80;

        this.elements.flashcard.style.transform = '';
        this.elements.flashcard.style.opacity = '';

        if (Math.abs(deltaX) > threshold) {
            this.swipeCard(deltaX > 0 ? 'right' : 'left');
        }

        this.isDragging = false;
        this.touchStartX = null;
        this.touchStartY = null;
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.swipeCard('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.swipeCard('right');
                break;
            case ' ':
                e.preventDefault();
                this.flipCard();
                break;
            case 'u':
            case 'U':
                e.preventDefault();
                this.undo();
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                this.playAudio();
                break;
        }
    }

    flipCard() {
        this.state = {
            ...this.state,
            isFlipped: !this.state.isFlipped
        };
        this.renderCardFlip();
    }    swipeCard(direction) {
        const currentCard = this.getCurrentCard();
        if (!currentCard) return;

        const newState = { ...this.state };

        // Add to appropriate array
        if (direction === 'right') {
            newState.knownIds = [...newState.knownIds, currentCard.id];
        } else {
            newState.learningIds = [...newState.learningIds, currentCard.id];
        }

        // Add to history
        newState.history = [...newState.history, { action: direction, card: currentCard }];

        // Move to next card
        newState.index = newState.index + 1;
        newState.isFlipped = false;

        this.state = newState;
        this.animateCardExit(direction);
        this.saveUserProgress();
    }

    animateCardExit(direction) {
        const card = this.elements.flashcard;
        const className = direction === 'right' ? 'slide-right' : 'slide-left';
        
        card.classList.add(className);
        
        setTimeout(() => {
            card.classList.remove(className);
            this.render();
            this.animateCounterPulse(direction === 'right' ? 'know' : 'learning');
        }, 300);
    }

    animateCounterPulse(type) {
        const pill = type === 'know' ? this.elements.knowPill : this.elements.learningPill;
        pill.classList.add('pulse');
        setTimeout(() => pill.classList.remove('pulse'), 300);
    }    undo() {
        if (this.state.history.length === 0) return;

        const newState = { ...this.state };
        const lastAction = newState.history.pop();
        
        // Remove from appropriate array
        if (lastAction.action === 'right') {
            newState.knownIds = newState.knownIds.filter(id => id !== lastAction.card.id);
        } else {
            newState.learningIds = newState.learningIds.filter(id => id !== lastAction.card.id);
        }

        // Go back one card
        newState.index = Math.max(0, newState.index - 1);
        newState.isFlipped = false;

        this.state = newState;
        this.animateCardEnter(lastAction.action);
        this.saveUserProgress();
    }

    animateCardEnter(fromDirection) {
        const card = this.elements.flashcard;
        const className = fromDirection === 'right' ? 'slide-right' : 'slide-left';
        
        card.classList.add(className);
        this.render();
        
        // Force reflow
        card.offsetHeight;
        
        setTimeout(() => {
            card.classList.remove(className);
        }, 50);
    }    toggleFavourite() {
        const currentCard = this.getCurrentCard();
        if (!currentCard) return;

        const newCards = this.state.cards.map(card => 
            card.id === currentCard.id 
                ? { ...card, isFavourite: !card.isFavourite }
                : card
        );

        this.state = { ...this.state, cards: newCards };
        this.renderStarButtons();
        this.saveUserProgress();
    }

    playAudio() {
        const currentCard = this.getCurrentCard();
        if (!currentCard || !currentCard.front.audioUrl) {
            // Simulate audio playback with a beep
            this.playBeep();
            return;
        }

        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = new Audio(currentCard.front.audioUrl);
        this.currentAudio.play().catch(console.error);
    }

    playBeep() {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.saveUserProgress();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.state.theme);
        this.elements.themeToggle.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
    }

    getCurrentCard() {
        return this.state.cards[this.state.index] || null;
    }

    render() {
        this.renderProgress();
        this.renderCounters();
        this.renderCard();
        this.renderControls();
    }

    renderProgress() {
        const total = this.state.cards.length;
        const current = Math.min(this.state.index + 1, total);
        this.elements.progressLabel.textContent = `${current} / ${total}`;
    }

    renderCounters() {
        this.elements.knowCounter.textContent = this.state.knownIds.length;
        this.elements.learningCounter.textContent = this.state.learningIds.length;
    }

    renderCard() {
        const currentCard = this.getCurrentCard();
        
        if (!currentCard) {
            this.renderEmptyState();
            return;
        }

        // Front side
        this.elements.primaryText.textContent = currentCard.front.primaryText;
        this.elements.secondaryText.textContent = currentCard.front.secondaryText || '';
        this.elements.secondaryText.style.display = currentCard.front.secondaryText ? 'block' : 'none';

        // Back side
        this.elements.translation.textContent = currentCard.back.translation;
        this.elements.example.textContent = currentCard.back.example || '';
        this.elements.example.style.display = currentCard.back.example ? 'block' : 'none';
        this.elements.notes.textContent = currentCard.back.notes || '';
        this.elements.notes.style.display = currentCard.back.notes ? 'block' : 'none';

        this.renderStarButtons();
        this.renderCardFlip();
    }

    renderCardFlip() {
        if (this.state.isFlipped) {
            this.elements.flashcard.classList.add('flipping');
        } else {
            this.elements.flashcard.classList.remove('flipping');
        }
    }

    renderStarButtons() {
        const currentCard = this.getCurrentCard();
        const isActive = currentCard && currentCard.isFavourite;
        
        this.elements.starBtn.textContent = isActive ? '★' : '☆';
        this.elements.starBtnBack.textContent = isActive ? '★' : '☆';
        
        if (isActive) {
            this.elements.starBtn.classList.add('active');
            this.elements.starBtnBack.classList.add('active');
        } else {
            this.elements.starBtn.classList.remove('active');
            this.elements.starBtnBack.classList.remove('active');
        }
    }

    renderControls() {
        this.elements.undoBtn.disabled = this.state.history.length === 0;
    }

    renderEmptyState() {
        this.elements.primaryText.textContent = 'All Done! 🎉';
        this.elements.secondaryText.textContent = 'You\'ve completed all cards';
        this.elements.translation.textContent = 'Great job!';
        this.elements.example.textContent = '';
        this.elements.notes.textContent = '';
        this.elements.starBtn.style.display = 'none';
        this.elements.starBtnBack.style.display = 'none';
        this.elements.audioBtn.style.display = 'none';
        this.elements.audioBtnBack.style.display = 'none';
    }    saveStateToStorage() {
        // This method is now handled by saveUserProgress
        this.saveUserProgress();
    }

    loadStateFromStorage() {
        // This method is now handled by loadUserProgress
        this.loadUserProgress();
    }

    saveUserProgress() {
        if (!this.authManager || !this.authManager.getCurrentUser()) {
            return;
        }

        const currentUser = this.authManager.getCurrentUser();
        const sessionTime = Date.now() - this.sessionStartTime;
        
        const progressData = {
            knownIds: this.state.knownIds,
            learningIds: this.state.learningIds,
            lastCardIndex: this.state.index,
            favourites: this.state.cards.filter(card => card.isFavourite).map(card => card.id),
            theme: this.state.theme,
            totalSessionTime: (this.authManager.getUserProgress().totalSessionTime || 0) + sessionTime
        };

        this.authManager.saveUserProgress(progressData);
        this.sessionStartTime = Date.now(); // Reset session timer
    }

    loadUserProgress() {
        if (!this.authManager || !this.authManager.getCurrentUser()) {
            return;
        }

        const progress = this.authManager.getUserProgress();
        if (progress) {
            this.state = {
                ...this.state,
                knownIds: progress.knownIds || [],
                learningIds: progress.learningIds || [],
                index: progress.lastCardIndex || 0,
                theme: progress.theme || 'dark'
            };

            // Restore favourites
            if (progress.favourites) {
                this.state.cards = this.state.cards.map(card => ({
                    ...card,
                    isFavourite: progress.favourites.includes(card.id)
                }));
            }
        }

        // Show user info
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.style.display = 'block';
            this.authManager.updateUserInfo();
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to sign out? Your progress has been saved.')) {
            this.saveUserProgress();
            this.authManager.logout();
        }
    }

    setupAccountSettingsListeners() {
        const exportBtn = document.getElementById('exportBtn');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        const closeSettings = document.getElementById('closeSettings');
        const accountSettings = document.getElementById('accountSettings');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.handleDeleteAccount();
            });
        }

        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                accountSettings.style.display = 'none';
            });
        }

        // Close modal when clicking outside
        if (accountSettings) {
            accountSettings.addEventListener('click', (e) => {
                if (e.target === accountSettings) {
                    accountSettings.style.display = 'none';
                }
            });
        }
    }

    showAccountSettings() {
        const accountSettings = document.getElementById('accountSettings');
        if (accountSettings) {
            accountSettings.style.display = 'flex';
        }
    }

    exportUserData() {
        const userData = this.authManager.exportUserData();
        if (userData) {
            const blob = new Blob([userData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashcard-progress-${this.authManager.getCurrentUser()}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Your progress has been exported successfully!');
        }
    }

    handleDeleteAccount() {
        const confirmation = prompt(
            'Are you sure you want to delete your account? This action cannot be undone.\n\n' +
            'Type "DELETE" to confirm:'
        );
        
        if (confirmation === 'DELETE') {
            try {
                this.authManager.deleteAccount();
                alert('Your account has been deleted successfully.');
            } catch (error) {
                alert('Failed to delete account: ' + error.message);
            }
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for authentication to complete before initializing the app
    const initializeAppWhenReady = () => {
        if (typeof authManager !== 'undefined' && authManager.currentUser) {
            new FlashCardApp();
        } else {
            setTimeout(initializeAppWhenReady, 100);
        }
    };
    
    // Start checking for auth readiness
    initializeAppWhenReady();
});

// Also listen for custom auth events
document.addEventListener('authReady', () => {
    if (!window.flashCardApp) {
        window.flashCardApp = new FlashCardApp();
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashCardApp;
}

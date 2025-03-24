import { WordProcessor } from './wordProcessor.js';
import { AudioManager } from './audioManager.js';
import { KeyboardControls } from './keyboardControls.js';
import { UI } from './ui.js';
import { Settings } from './settings.js';

class App {
    constructor() {
        this.settings = new Settings();
        this.wordProcessor = new WordProcessor();
        this.audioManager = new AudioManager(this.settings);
        this.ui = new UI();
        this.isReadingMode = false;
        this.isPlaying = false;
        this.autoPlayTimeout = null;
        
        // Set up letter click handling
        this.ui.setLetterClickHandler((index) => {
            if (this.isReadingMode && !this.isPlaying) {
                this.jumpToLetter(index);
            }
        });
        
        this.setupEventListeners();
        this.settings.initializeSettingsPanel();
    }

    initializeKeyboardControls() {
        this.keyboardControls = new KeyboardControls({
            onSpacePress: () => this.moveNext(),
            onLeftArrow: () => this.movePrevious(),
            onRightArrow: () => this.moveNext()
        });
    }

    initializeSettingsPanel() {
        const modal = document.getElementById('settingsModal');
        const settingsButton = document.getElementById('settingsButton');
        const closeButton = modal.querySelector('.close-button');
        const resetButton = modal.querySelector('.reset-button');
        const recordingsGrid = modal.querySelector('.recordings-grid');

        // Reset functionality
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings and recordings? This cannot be undone.')) {
                // Stop any active recordings
                if (this.settings.recordingStream) {
                    this.settings.recordingStream.getTracks().forEach(track => track.stop());
                }
                
                // Clear all stored recordings
                localStorage.clear();
                this.settings.customRecordings.clear();
                
                // Reload the page
                window.location.reload();
            }
        });

        // Create recording items for each letter
        'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
            const item = this.createRecordingItem(letter);
            recordingsGrid.appendChild(item);
        });

        // Modal controls
        settingsButton.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    createRecordingItem(letter) {
        const item = document.createElement('div');
        item.className = 'recording-item';
        item.innerHTML = `
            <h3>Letter "${letter.toUpperCase()}"</h3>
            <div class="recording-controls">
                <div>
                    <strong>Letter Name:</strong>
                    <button class="record-button" data-type="name">Record</button>
                    <button class="play-button" data-type="name">Play</button>
                    <button class="delete-button" data-type="name">Delete</button>
                </div>
                <div>
                    <strong>Letter Sound:</strong>
                    <button class="record-button" data-type="sound">Record</button>
                    <button class="play-button" data-type="sound">Play</button>
                    <button class="delete-button" data-type="sound">Delete</button>
                </div>
            </div>
            <div class="recording-status"></div>
        `;

        // Add event listeners for recording controls
        const controls = item.querySelectorAll('.recording-controls button');
        controls.forEach(button => {
            const type = button.dataset.type;
            if (button.classList.contains('record-button')) {
                button.addEventListener('click', () => this.handleRecording(letter, type, item));
            } else if (button.classList.contains('play-button')) {
                button.addEventListener('click', () => this.handlePlayback(letter, type));
            } else if (button.classList.contains('delete-button')) {
                button.addEventListener('click', () => this.handleDelete(letter, type, item));
            }
        });

        // Update initial status
        this.updateRecordingStatus(item, letter);
        return item;
    }

    async handleRecording(letter, type, item) {
        const recordButton = item.querySelector(`.record-button[data-type="${type}"]`);
        const statusDiv = item.querySelector('.recording-status');

        if (!this.settings.mediaRecorder) {
            statusDiv.textContent = 'Requesting microphone access...';
            const result = await this.settings.setupRecorder();
            
            if (!result.success) {
                switch (result.error) {
                    case 'browser_unsupported':
                        statusDiv.textContent = 'Your browser does not support recording. Please try Chrome, Firefox, or Safari.';
                        break;
                    case 'format_unsupported':
                        statusDiv.textContent = 'Your browser does not support any compatible audio format. Please try a different browser.';
                        break;
                    case 'permission_denied':
                        statusDiv.textContent = 'Microphone access was denied. Please allow microphone access in your browser settings and try again.';
                        break;
                    default:
                        statusDiv.textContent = `Recording error: ${result.message || 'Unknown error'}`;
                }
                return;
            }
        }

        if (!this.settings.isRecording) {
            // Start recording
            this.settings.startRecording();
            recordButton.classList.add('recording');
            recordButton.textContent = 'Stop';
            statusDiv.textContent = 'Recording...';
        } else {
            // Stop recording
            const audioBlob = await this.settings.stopRecording();
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
            
            if (audioBlob) {
                this.settings.saveRecording(letter, type, audioBlob);
                this.updateRecordingStatus(item, letter);
            }
        }
    }

    handlePlayback(letter, type) {
        if (type === 'name') {
            this.audioManager.playLetterName(letter);
        } else {
            this.audioManager.playPhoneticSound(letter);
        }
    }

    handleDelete(letter, type, item) {
        this.settings.deleteRecording(letter, type);
        this.updateRecordingStatus(item, letter);
    }

    updateRecordingStatus(item, letter) {
        const statusDiv = item.querySelector('.recording-status');
        const hasName = this.settings.hasCustomRecording(letter, 'name');
        const hasSound = this.settings.hasCustomRecording(letter, 'sound');

        if (hasName || hasSound) {
            statusDiv.textContent = `Custom recordings: ${hasName ? 'Name' : ''} ${hasName && hasSound ? '&' : ''} ${hasSound ? 'Sound' : ''}`;
        } else {
            statusDiv.textContent = 'No custom recordings';
        }
    }

    setupEventListeners() {
        const wordInput = document.getElementById('wordInput');
        const startButton = document.getElementById('startReading');
        
        wordInput.addEventListener('input', () => {
            const value = wordInput.value.trim();
            startButton.disabled = value.length === 0;
            this.ui.clearDisplays();
        });
        
        startButton.addEventListener('click', () => this.startReading());
        
        // Click on letter to hear its name
        document.getElementById('currentLetter').addEventListener('click', () => {
            if (!this.isReadingMode || this.isPlaying) return;
            const letter = this.wordProcessor.getCurrentLetter();
            if (letter) {
                this.audioManager.playLetterName(letter);
            }
        });

        // Click pronounce button to hear the phonetic sound
        document.getElementById('pronounceButton').addEventListener('click', () => {
            if (!this.isReadingMode || this.isPlaying) return;
            const letter = this.wordProcessor.getCurrentLetter();
            if (letter) {
                this.audioManager.playPhoneticSound(letter);
            }
        });
        
        // Navigation buttons
        const prevButton = document.getElementById('prevLetter');
        const nextButton = document.getElementById('nextLetter');

        prevButton.addEventListener('click', () => {
            if (!this.isPlaying) this.movePrevious();
        });
        nextButton.addEventListener('click', () => {
            if (!this.isPlaying) this.moveNext();
        });

        // Play button
        const playButton = document.getElementById('playButton');
        playButton.addEventListener('click', () => this.togglePlay());

        // Disable navigation buttons initially
        prevButton.disabled = true;
        nextButton.disabled = true;

        // Initialize start button state
        startButton.disabled = true;
    }

    startReading() {
        const wordInput = document.getElementById('wordInput');
        const word = wordInput.value.trim();
        
        if (word === '') return;
        
        this.isReadingMode = true;
        this.wordProcessor.setWord(word);
        this.initializeKeyboardControls();
        this.updateDisplays();
        this.ui.showPronounceButton();
        
        // Enable navigation buttons
        document.getElementById('prevLetter').disabled = false;
        document.getElementById('nextLetter').disabled = false;
        
        // Disable input and start button while in reading mode
        wordInput.disabled = true;
        document.getElementById('startReading').disabled = true;
    }

    moveNext() {
        if (!this.isReadingMode) return;
        if (this.wordProcessor.moveNext()) {
            this.updateDisplays();
        }
    }

    movePrevious() {
        if (!this.isReadingMode) return;
        if (this.wordProcessor.movePrevious()) {
            this.updateDisplays();
        }
    }

    async updateDisplays() {
        const word = this.wordProcessor.word;
        const currentIndex = this.wordProcessor.currentIndex;
        const currentLetter = this.wordProcessor.getCurrentLetter();
        
        this.ui.updateWordDisplay(word, currentIndex);
        this.ui.updateCurrentLetter(currentLetter);

        // Automatically play the letter sound with the current volume setting
        if (currentLetter) {
            await this.audioManager.playLetterSoundAuto(currentLetter);
            
            // If in auto-play mode and not at the end, schedule next letter
            if (this.isPlaying && currentIndex < word.length - 1) {
                const delay = parseInt(document.getElementById('delayTimer').value);
                this.autoPlayTimeout = setTimeout(() => this.moveNext(), delay);
            } else if (this.isPlaying) {
                // Stop playing at the end
                this.stopPlaying();
            }
        }
    }

    async togglePlay() {
        if (this.isPlaying) {
            this.stopPlaying();
        } else {
            this.isPlaying = true;
            this.ui.setPlaying(true);
            // Start from beginning when play is pressed
            await this.jumpToLetter(0);
        }
    }

    stopPlaying() {
        this.isPlaying = false;
        this.ui.setPlaying(false);
        if (this.autoPlayTimeout) {
            clearTimeout(this.autoPlayTimeout);
            this.autoPlayTimeout = null;
        }
    }

    async jumpToLetter(index) {
        if (index >= 0 && index < this.wordProcessor.word.length) {
            this.wordProcessor.currentIndex = index;
            await this.updateDisplays();
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

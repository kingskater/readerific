export class UI {
    constructor() {
        this.wordDisplay = document.getElementById('wordDisplay');
        this.currentLetter = document.getElementById('currentLetter');
        this.pronounceButton = document.getElementById('pronounceButton');
        this.playButton = document.getElementById('playButton');
        this.playIcon = this.playButton.querySelector('.play-icon');
        this.stopIcon = this.playButton.querySelector('.stop-icon');
        this.onLetterClick = null; // Callback for letter clicks
    }

    setLetterClickHandler(callback) {
        this.onLetterClick = callback;
    }

    updateWordDisplay(word, currentIndex = -1) {
        // Clear existing content
        this.wordDisplay.innerHTML = '';
        
        // Create clickable spans for each letter
        word.split('').forEach((letter, index) => {
            const span = document.createElement('span');
            span.textContent = letter;
            span.className = 'letter' + (index === currentIndex ? ' highlighted' : '');
            span.dataset.index = index;
            
            // Add click handler if callback is set
            if (this.onLetterClick) {
                span.addEventListener('click', () => this.onLetterClick(index));
            }
            
            this.wordDisplay.appendChild(span);
        });
    }

    updateCurrentLetter(letter) {
        this.currentLetter.textContent = letter;
        this.currentLetter.classList.add('pop');
        setTimeout(() => {
            this.currentLetter.classList.remove('pop');
        }, 300);
    }

    clearDisplays() {
        this.wordDisplay.innerHTML = '';
        this.currentLetter.textContent = '';
        this.pronounceButton.style.display = 'none';
        this.playButton.style.display = 'none';
        this.setPlaying(false);
    }

    showPronounceButton() {
        this.pronounceButton.style.display = 'inline-block';
        this.playButton.style.display = 'inline-block';
    }

    setPlaying(isPlaying) {
        this.playButton.classList.toggle('playing', isPlaying);
        this.playIcon.style.display = isPlaying ? 'none' : 'inline';
        this.stopIcon.style.display = isPlaying ? 'inline' : 'none';
    }
}

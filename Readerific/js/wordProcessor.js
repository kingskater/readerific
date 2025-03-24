export class WordProcessor {
    constructor() {
        this.word = '';
        this.currentIndex = 0;
    }

    setWord(word) {
        this.word = word.toLowerCase();
        this.currentIndex = 0;
        return this.word;
    }

    getCurrentLetter() {
        return this.word[this.currentIndex] || '';
    }

    moveNext() {
        if (this.currentIndex < this.word.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    }

    movePrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return true;
        }
        return false;
    }

    getHighlightedWord() {
        return this.word.split('').map((letter, index) => {
            return index === this.currentIndex ? 
                `<span class="highlight">${letter}</span>` : 
                letter;
        }).join('');
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    isValidWord() {
        return this.word.length > 0;
    }
}

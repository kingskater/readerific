export class KeyboardControls {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.initializeListeners();
    }

    initializeListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    this.callbacks.onSpacePress();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.callbacks.onLeftArrow();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.callbacks.onRightArrow();
                    break;
            }
        });
    }
}

export class AudioManager {
    constructor(settings) {
        this.settings = settings;
        this.speech = window.speechSynthesis;
        this.autoPlayVolume = 0;
        this.setupVolumeControl();
        
        // Map of letters to their phonetic sounds with example words
        this.letterSounds = new Map([
            ['a', { sound: 'ah', example: 'apple' }],
            ['b', { sound: 'buh', example: 'ball' }],
            ['c', { sound: 'kuh', example: 'cat' }],
            ['d', { sound: 'duh', example: 'dog' }],
            ['e', { sound: 'eh', example: 'egg' }],
            ['f', { sound: 'fuh', example: 'fish' }],
            ['g', { sound: 'guh', example: 'go' }],
            ['h', { sound: 'huh', example: 'hat' }],
            ['i', { sound: 'ih', example: 'in' }],
            ['j', { sound: 'juh', example: 'jump' }],
            ['k', { sound: 'kuh', example: 'kite' }],
            ['l', { sound: 'luh', example: 'log' }],
            ['m', { sound: 'muh', example: 'mom' }],
            ['n', { sound: 'nuh', example: 'no' }],
            ['o', { sound: 'oh', example: 'ox' }],
            ['p', { sound: 'puh', example: 'pig' }],
            ['q', { sound: 'kwuh', example: 'queen' }],
            ['r', { sound: 'ruh', example: 'red' }],
            ['s', { sound: 'sss', example: 'sun' }],
            ['t', { sound: 'tuh', example: 'top' }],
            ['u', { sound: 'uh', example: 'up' }],
            ['v', { sound: 'vuh', example: 'van' }],
            ['w', { sound: 'wuh', example: 'win' }],
            ['x', { sound: 'ks', example: 'fox' }],
            ['y', { sound: 'yuh', example: 'yes' }],
            ['z', { sound: 'zzz', example: 'zoo' }]
        ]);
        this.currentUtterance = null;
    }

    async playLetterName(letter) {
        letter = letter.toLowerCase();
        
        // Check for custom recording first
        if (this.settings && this.settings.hasCustomRecording(letter, 'name')) {
            await this.playCustomRecording(letter, 'name');
            return;
        }

        // Fall back to speech synthesis
        if (this.letterSounds.has(letter)) {
            this.stopSound();
            const utterance = new SpeechSynthesisUtterance(letter);
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = 'en-US';
            this.currentUtterance = utterance;
            this.speech.speak(utterance);
        }
    }

    async playPhoneticSound(letter) {
        letter = letter.toLowerCase();
        
        // Check for custom recording first
        if (this.settings && this.settings.hasCustomRecording(letter, 'sound')) {
            await this.playCustomRecording(letter, 'sound');
            return;
        }

        // Fall back to speech synthesis
        const letterData = this.letterSounds.get(letter);
        if (letterData) {
            this.stopSound();
            const utterance = new SpeechSynthesisUtterance(letterData.sound);
            utterance.rate = 0.7; // Even slower for phonetic sounds
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = 'en-US';
            this.currentUtterance = utterance;
            this.speech.speak(utterance);
        }
    }

    async playCustomRecording(letter, type) {
        const audioUrl = this.settings.getCustomRecording(letter, type);
        if (!audioUrl) {
            console.log('No custom recording found for', letter, type);
            return false;
        }

        this.stopSound();
        console.log('Playing custom recording from URL:', audioUrl);

        return new Promise((resolve, reject) => {
            const audio = new Audio();
            let hasError = false;

            // Set up error handling
            audio.onerror = (e) => {
                console.error('Audio playback error:', {
                    code: audio.error?.code,
                    message: audio.error?.message,
                    event: e
                });
                hasError = true;
                reject(new Error(`Failed to play audio: ${audio.error?.message || 'Unknown error'}`));
            };

            // Set up success handling
            audio.oncanplaythrough = () => {
                if (hasError) return;
                
                console.log('Audio is ready to play');
                audio.play()
                    .then(() => {
                        console.log('Successfully started playing audio for', letter, type);
                        resolve(true);
                    })
                    .catch(error => {
                        console.error('Play() failed:', error);
                        reject(error);
                    });
            };

            // Set up loading timeout
            const timeout = setTimeout(() => {
                if (!hasError) {
                    console.error('Audio loading timed out');
                    reject(new Error('Audio loading timed out'));
                }
            }, 5000); // 5 second timeout

            // Clean up on completion
            const cleanup = () => {
                clearTimeout(timeout);
                audio.onerror = null;
                audio.oncanplaythrough = null;
            };

            audio.onended = cleanup;
            audio.onpause = cleanup;

            // Start loading the audio
            try {
                audio.src = audioUrl;
                audio.load(); // Explicitly start loading
            } catch (error) {
                console.error('Error setting audio source:', error);
                cleanup();
                reject(error);
            }
        }).catch(error => {
            console.error('Playback failed:', error);
            // Fall back to speech synthesis
            if (type === 'name') {
                this.playLetterName(letter);
            } else {
                this.playPhoneticSound(letter);
            }
            return false;
        });
    }

    setupVolumeControl() {
        this.volumeSlider = document.getElementById('autoSoundVolume');
        this.volumeSlider.addEventListener('input', (e) => {
            this.autoPlayVolume = e.target.value / 100;
        });
    }

    stopSound() {
        if (this.speech.speaking) {
            this.speech.cancel();
        }
    }

    async playLetterSoundAuto(letter) {
        if (this.autoPlayVolume <= 0) return; // Skip if volume is 0

        const audioUrl = this.settings.getCustomRecording(letter, 'sound');
        if (audioUrl) {
            // Play custom recording with volume
            const audio = new Audio(audioUrl);
            audio.volume = this.autoPlayVolume;
            try {
                await audio.play();
            } catch (error) {
                console.error('Error playing auto sound:', error);
                this.playPhoneticSoundWithVolume(letter);
            }
        } else {
            // Fall back to speech synthesis
            this.playPhoneticSoundWithVolume(letter);
        }
    }

    playPhoneticSoundWithVolume(letter) {
        const letterData = this.letterSounds.get(letter.toLowerCase());
        if (letterData) {
            this.stopSound();
            const utterance = new SpeechSynthesisUtterance(letterData.sound);
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            utterance.volume = this.autoPlayVolume;
            utterance.lang = 'en-US';
            this.currentUtterance = utterance;
            this.speech.speak(utterance);
        }
    }
}

export class Settings {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.customRecordings = new Map();
        this.recordingStream = null;
        this.currentRecordingKey = null;
        this.loadSavedRecordings();
    }

    getSupportedMimeType() {
        const types = [
            'audio/webm',
            'audio/mp4',
            'audio/ogg',
            'audio/wav'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Using audio format:', type);
                return type;
            }
        }
        return null;
    }

    cleanup() {
        console.log('Cleaning up recording resources...');
        if (this.mediaRecorder) {
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            this.mediaRecorder = null;
        }

        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            this.recordingStream = null;
        }

        this.audioChunks = [];
        this.isRecording = false;
        this.currentRecordingKey = null;
    }

    async setupRecorder() {
        // Clean up any existing recorder
        this.cleanup();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('Media devices API not supported');
            return { success: false, error: 'browser_unsupported' };
        }

        const mimeType = this.getSupportedMimeType();
        if (!mimeType) {
            console.error('No supported audio format found');
            return { success: false, error: 'format_unsupported' };
        }

        try {
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            
            console.log('Microphone access granted, setting up recorder...');
            this.recordingStream = stream;
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            console.log('Recorder setup complete');
            return { success: true };
        } catch (error) {
            console.error('Error accessing microphone:', error.name, error.message);
            this.cleanup();
            return { 
                success: false, 
                error: error.name === 'NotAllowedError' ? 'permission_denied' : 'unknown',
                message: error.message
            };
        }
    }

    startRecording(letter, type) {
        if (this.mediaRecorder && !this.isRecording) {
            this.currentRecordingKey = `${letter}-${type}`;
            console.log(`Starting recording for ${this.currentRecordingKey}`);
            this.audioChunks = [];
            this.isRecording = true;
            this.mediaRecorder.start(100); // Start with 100ms timeslice
        }
    }

    async stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            console.log('No active recording to stop');
            return null;
        }

        console.log(`Stopping recording for ${this.currentRecordingKey}`);
        this.isRecording = false;

        return new Promise(resolve => {
            const onStop = () => {
                if (this.audioChunks.length === 0) {
                    console.error('No audio data recorded');
                    this.cleanup();
                    resolve(null);
                    return;
                }

                const mimeType = this.mediaRecorder.mimeType;
                console.log('Creating blob with type:', mimeType, 'chunks:', this.audioChunks.length);
                
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                console.log('Created blob size:', audioBlob.size, 'bytes');
                
                // Clean up after successful recording
                this.cleanup();
                resolve(audioBlob);
            };

            // Set up one-time stop handler
            this.mediaRecorder.onstop = onStop;
            this.mediaRecorder.stop();
        });
    }

    saveRecording(letter, type, blob) {
        if (!blob || blob.size === 0) {
            console.error('Invalid blob received for saving');
            return;
        }

        const key = `${letter}-${type}`;
        console.log(`Saving recording for ${key}:`, {
            blobSize: blob.size,
            blobType: blob.type
        });
        
        // Revoke old URL if it exists
        if (this.customRecordings.has(key)) {
            const oldRecording = this.customRecordings.get(key);
            console.log('Revoking old URL:', oldRecording.url);
            URL.revokeObjectURL(oldRecording.url);
        }

        // Create new URL and verify it works
        const url = URL.createObjectURL(blob);
        console.log(`Created new URL for ${key}:`, url);

        // Test that the blob is valid audio
        const testAudio = new Audio(url);
        testAudio.onerror = () => {
            console.error(`Test playback failed for ${key}`);
            URL.revokeObjectURL(url);
            return;
        };

        // If test passes, save the recording
        this.customRecordings.set(key, { 
            url, 
            type: blob.type,
            size: blob.size
        });
        
        // Save to localStorage
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                const storageData = JSON.stringify({
                    data: base64data,
                    type: blob.type,
                    size: blob.size,
                    timestamp: Date.now()
                });
                
                localStorage.setItem(key, storageData);
                console.log(`Saved recording to localStorage:`, {
                    key,
                    size: base64data.length,
                    type: blob.type
                });
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error saving recording:', error);
        }
        
        // Setup new recorder for next recording
        this.setupRecorder();
    }

    hasCustomRecording(letter, type) {
        return this.customRecordings.has(`${letter}-${type}`);
    }

    getCustomRecording(letter, type) {
        const key = `${letter}-${type}`;
        const recording = this.customRecordings.get(key);
        
        if (!recording) {
            console.log(`No recording found for ${key}`);
            return null;
        }

        console.log(`Retrieved recording for ${key}:`, {
            url: recording.url,
            type: recording.type,
            size: recording.size
        });

        // Verify the URL is still valid
        try {
            const response = fetch(recording.url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('URL is no longer valid');
                    }
                })
                .catch(error => {
                    console.error(`URL validation failed for ${key}:`, error);
                    return null;
                });

            return recording.url;
        } catch (error) {
            console.error(`Error validating URL for ${key}:`, error);
            return null;
        }
    }

    deleteRecording(letter, type) {
        const key = `${letter}-${type}`;
        if (this.customRecordings.has(key)) {
            URL.revokeObjectURL(this.customRecordings.get(key));
            this.customRecordings.delete(key);
            localStorage.removeItem(key);
        }
    }

    loadSavedRecordings() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('-name') || key.includes('-sound')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (!item || !item.data) {
                        console.error(`Invalid data format for ${key}`);
                        localStorage.removeItem(key);
                        continue;
                    }
                    
                    const blob = this.base64toBlob(item.data, item.type);
                    const url = URL.createObjectURL(blob);
                    this.customRecordings.set(key, { url, type: item.type });
                    console.log(`Loaded recording for ${key}, size: ${item.data.length} bytes, type: ${item.type}`);
                } catch (error) {
                    console.error(`Error loading recording ${key}:`, error);
                    localStorage.removeItem(key); // Remove corrupted data
                }
            }
        }
    }

    base64toBlob(base64Data, type) {
        try {
            const parts = base64Data.split(';base64,');
            const contentType = type || parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);

            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }

            const blob = new Blob([uInt8Array], { type: contentType });
            console.log('Created blob from base64:', {
                size: blob.size,
                type: blob.type
            });
            return blob;
        } catch (error) {
            console.error('Error converting base64 to blob:', error);
            return null;
        }
    }

    createRecordingItem(letter) {
        const row = document.createElement('tr');
        
        // Letter cell
        const letterCell = document.createElement('td');
        letterCell.className = 'letter-cell';
        letterCell.textContent = letter.toUpperCase();
        row.appendChild(letterCell);
        
        // Name and Sound cells
        ['name', 'sound'].forEach(type => {
            const cell = document.createElement('td');
            cell.className = 'control-cell';
            
            const recordButton = document.createElement('button');
            recordButton.className = 'record-button ' + 
                (this.hasCustomRecording(letter, type) ? 'custom' : 'default');
            recordButton.setAttribute('data-type', type);
            
            const icon = document.createElement('span');
            icon.className = 'status-icon';
            recordButton.appendChild(icon);
            
            const text = document.createElement('span');
            text.textContent = this.hasCustomRecording(letter, type) ? 'Re-record' : 'Record';
            recordButton.appendChild(text);
            
            // Create play button
            const playButton = document.createElement('button');
            playButton.className = 'play-button';
            playButton.disabled = !this.hasCustomRecording(letter, type);
            
            const playIcon = document.createElement('span');
            playIcon.className = 'status-icon';
            playButton.appendChild(playIcon);
            
            // Add play button event listener
            playButton.addEventListener('click', () => {
                const audioUrl = this.getCustomRecording(letter, type);
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            });
            
            // Add record button event listener
            recordButton.addEventListener('click', async () => {
                if (!this.mediaRecorder) {
                    const result = await this.setupRecorder();
                    if (!result.success) return;
                }

                if (this.isRecording) {
                    recordButton.classList.remove('recording');
                    const blob = await this.stopRecording();
                    if (blob) {
                        this.saveRecording(letter, type, blob);
                        recordButton.className = 'record-button custom';
                        text.textContent = 'Re-record';
                        playButton.disabled = false;
                    }
                } else {
                    recordButton.classList.add('recording');
                    text.textContent = 'Stop';
                    this.startRecording(letter, type);
                }
            });
            
            cell.appendChild(recordButton);
            cell.appendChild(playButton);
            row.appendChild(cell);
        });
        
        return row;
    }

    initializeSettingsPanel() {
        const modal = document.getElementById('settingsModal');
        const closeButton = document.getElementById('closeSettings');
        const resetButton = document.getElementById('resetSettings');
        const recordingsGrid = modal.querySelector('.recordings-grid');

        // Generate recording items for each letter
        'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
            const row = this.createRecordingItem(letter);
            recordingsGrid.appendChild(row);
        });

        // Close button handler
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Reset button handler
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete all custom recordings?')) {
                this.clearAllRecordings();
                recordingsGrid.innerHTML = '';
                'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
                    const row = this.createRecordingItem(letter);
                    recordingsGrid.appendChild(row);
                });
            }
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Settings button handler
        document.getElementById('settingsButton').addEventListener('click', () => {
            modal.style.display = 'block';
        });
    }

    clearAllRecordings() {
        this.customRecordings.forEach((recording, key) => {
            URL.revokeObjectURL(recording.url);
        });
        this.customRecordings.clear();
        localStorage.clear();
    }
}

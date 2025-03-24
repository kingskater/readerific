# Readerific - Interactive Reading Learning App for Kids

A simple, interactive web application designed to help children learn to read by breaking down words into individual letters and providing customizable audio feedback. Parents can record their own voice for letter sounds and names, creating a more personalized learning experience.

## Features

- Parent input for custom words
- Interactive letter-by-letter highlighting
- Customizable audio feedback:
  - Record custom letter sounds and names with your own voice
  - Preview recorded audio instantly
  - Default speech synthesis fallback when no custom recordings exist
- Enhanced settings panel:
  - Clean, tabular layout for all letters
  - Record and play buttons for each letter's name and sound
  - Visual indicators for custom recordings
  - One-click reset functionality
- Playback controls:
  - Adjustable delay between letters (1-3 seconds)
  - Volume control for automatic playback
  - Auto-play mode for hands-free learning
- Keyboard navigation:
  - Spacebar for next letter
  - Left/right arrow keys for manual navigation
- Large, clear visual display
- Mobile-friendly responsive design

## How to Use

1. Open `index.html` in a web browser (must be served over HTTPS or localhost for microphone access)
2. (Optional) Click the settings gear icon (⚙️) to:
   - Record custom sounds and names for each letter
   - Preview your recordings using the play button
   - Re-record any letter as needed
   - Reset all recordings if desired
3. Type a word in the input field
4. Click "Let's Read!" to begin
5. The first letter will be highlighted
6. Interaction options:
   - Press spacebar to advance to next letter
   - Use arrow keys (←/→) for manual navigation
   - Click the large letter to hear its sound
   - Click "Pronounce" to hear the letter name
   - Use the play button (▶) for automatic playback
   - Adjust the delay timer for auto-playback speed
   - Control volume using the sound slider (🔊)
   
## Technical Details

The application is built using vanilla HTML, CSS, and JavaScript, with a focus on modularity and maintainability. The code is organized into separate modules:

- `index.html`: Main application structure and responsive layout
- `styles/`: CSS styles
  - `main.css`: Core styling, UI components, and responsive design
  - `animations.css`: Visual feedback and transitions
- `js/`: JavaScript modules
  - `main.js`: Application entry point and state management
  - `settings.js`: Recording management and settings UI
  - `wordProcessor.js`: Word processing and letter handling
  - `audioManager.js`: Audio recording and playback

### Audio Features

- Uses the MediaRecorder API for high-quality audio recording
- Supports multiple audio formats (webm, mp4, ogg, wav)
- Implements proper resource cleanup and error handling
- Stores recordings efficiently in localStorage with base64 encoding
- Provides speech synthesis fallback for missing recordings
- Instant playback of recorded audio for verification

## Browser Support

- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires HTTPS or localhost for microphone access
- Requires browser support for:
  - MediaRecorder API
  - Web Audio API
  - localStorage
  - Speech Synthesis API (for fallback)

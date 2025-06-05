# Language Flash Cards App 🎴

A mobile-first, responsive web application for learning vocabulary with interactive flash cards. Features include card flipping, swipe gestures, progress tracking, and audio playback.

## Features ✨

- **Mobile-First Design**: Optimized for touch devices with responsive layout
- **Interactive Flash Cards**: Tap to flip, swipe to mark as "Know" or "Still Learning"
- **Smooth Animations**: 180° Y-axis flip animation and slide-out effects
- **Progress Tracking**: Real-time counters with localStorage persistence
- **Audio Support**: Play pronunciation audio (with fallback beep sound)
- **Favorites System**: Star cards for later review
- **Undo Functionality**: Restore accidentally swiped cards
- **Keyboard Controls**: Full keyboard navigation support
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Accessibility**: High contrast ratios (≥4.5:1) and reduced motion support

## Controls 🎮

### Touch/Mouse Gestures
- **Tap card**: Flip to see translation
- **Swipe right**: Mark as "Know" (turquoise counter)
- **Swipe left**: Mark as "Still Learning" (orange counter)
- **Tap 🔊**: Play audio pronunciation
- **Tap ☆**: Toggle favorite status

### Keyboard Shortcuts
- **←/→ arrows**: Swipe left/right
- **Space**: Flip card
- **U**: Undo last action
- **A**: Play audio

### Buttons
- **↺**: Undo last swipe
- **▶️**: Skip card (same as swipe right)
- **✕**: Close app
- **⚙️**: Settings (placeholder)
- **🌙/☀️**: Toggle theme

## Quick Start 🚀

1. **Run the server**:
   ```bash
   python app.py
   ```

2. **Open your browser** to `http://localhost:8000`

3. **Start learning**! The app includes sample German vocabulary cards.

## File Structure 📁

```
Language_Cards/
├── index.html          # Main HTML structure
├── styles.css          # CSS with mobile-first responsive design
├── app.js             # JavaScript with all app logic
├── app.py             # Python development server
└── README.md          # This file
```

## Technical Details 🔧

### State Management
The app uses immutable state pattern with a single state object:
```javascript
{
  cards: FlashCard[],          // Ordered deck of cards
  index: number,               // Current card position
  knownIds: string[],          // IDs of cards marked "Know"
  learningIds: string[],       // IDs of cards marked "Still Learning"
  history: [{action, card}],   // For undo functionality
  isFlipped: boolean,          // Current card flip state
  theme: 'dark' | 'light'      // UI theme
}
```

### Card Data Structure
```javascript
{
  id: string,
  front: {
    primaryText: string,       // Main word/phrase
    secondaryText?: string,    // Grammar info, verb forms, etc.
    audioUrl?: string          // Audio file URL
  },
  back: {
    translation: string,       // Primary translation
    example?: string,          // Example sentence
    notes?: string            // Additional notes
  },
  isFavourite: boolean
}
```

### Responsive Breakpoints
- **Mobile**: < 480px (85vw card width)
- **Tablet**: 481px - 768px (70vw card width, max 400px)
- **Desktop**: > 769px (60vw card width, max 450px)

### Browser Support
- Modern browsers with ES6+ support
- Touch events for mobile devices
- Web Audio API for audio playback
- CSS custom properties for theming
- LocalStorage for persistence

## Customization 🎨

### Adding Your Own Cards
Edit the `generateSampleCards()` method in `app.js`:

```javascript
generateSampleCards() {
    return [
        {
            id: 'unique-id',
            front: {
                primaryText: 'Your Word',
                secondaryText: 'grammar info',
                audioUrl: 'path/to/audio.mp3' // optional
            },
            back: {
                translation: 'Translation',
                example: 'Example sentence',
                notes: 'Additional notes'
            },
            isFavourite: false
        }
        // ... more cards
    ];
}
```

### Theming
Modify CSS custom properties in `styles.css`:

```css
:root {
    --bg-primary: #1a1d29;      /* Main background */
    --card-bg: #4a5568;         /* Card background */
    --accent-know: #38b2ac;     /* "Know" color */
    --accent-learning: #ed8936; /* "Still Learning" color */
    /* ... more variables */
}
```

### Audio Files
Place audio files in your project directory and reference them in the card data:
```javascript
audioUrl: './audio/hello.mp3'
```

## Performance 📈

- **Smooth 60fps animations** with hardware acceleration
- **Minimal DOM manipulation** with efficient rendering
- **Touch gesture optimization** with proper event handling
- **Memory efficient** state management
- **LocalStorage caching** for instant app resumption

## Accessibility ♿

- **High contrast ratios** (≥4.5:1) for all text
- **Keyboard navigation** for all functionality
- **Reduced motion** support for users with vestibular disorders
- **Touch target sizes** optimized for mobile use
- **Screen reader friendly** semantic HTML structure

## Browser Compatibility 🌐

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 12+)
- **Mobile browsers**: Optimized for touch

## Development 👨‍💻

The app is built with vanilla JavaScript for maximum compatibility and performance. No frameworks or build tools required - just open `index.html` in a browser or run the Python server for development.

### Local Development
```bash
# Start development server
python app.py

# Or use any static file server
python -m http.server 8000
# Then open http://localhost:8000
```

## License 📄

MIT License - feel free to use, modify, and distribute!

---

Made with ❤️ for language learners everywhere!

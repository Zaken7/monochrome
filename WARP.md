# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Monochrome is an open-source, privacy-respecting, ad-free TIDAL web UI built on top of Hi-Fi. It's a single-page application (SPA) that provides a music streaming interface with offline capabilities via Progressive Web App (PWA) features.

**Important Note**: This is a maintained fork of the original project. The official repository is at https://github.com/eduardprigoana/monochrome.

## Development Commands

### Setup
```bash
npm install
```

### Development Server
```bash
npm run dev
```
The app runs at `http://localhost:5173/` with Hot Module Replacement (HMR).

### Build for Production
```bash
npm run build
```
Generates optimized output in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

### Testing
No automated tests are currently configured. The test script is a placeholder.

## Architecture Overview

### Technology Stack
- **Build Tool**: Vite 7.x with vite-plugin-pwa for service worker generation
- **Module System**: ES Modules (type: "module" in package.json)
- **Storage**: IndexedDB for local data persistence, localStorage for settings
- **Routing**: Hash-based client-side routing (via `router.js`)
- **Optional Sync**: Firebase Realtime Database for cross-device synchronization

### Core Module Structure

The application follows a modular architecture with clear separation of concerns:

**`js/app.js`** - Application entry point. Initializes all subsystems:
- API client (LosslessAPI)
- Audio player (Player)
- UI renderer (UIRenderer)
- Router for navigation
- Event handlers and keyboard shortcuts
- Casting support (Chromecast/AirPlay)
- Service worker registration

**`js/api.js`** - TIDAL API abstraction layer (LosslessAPI class):
- Multi-instance support with automatic failover
- Rate limiting handling with exponential backoff
- Request caching via APICache
- Response normalization across different API providers
- Stream URL caching

**`js/storage.js`** - Settings and API instance management:
- apiSettings: Loads instances from `public/instances.json`, performs speed tests, caches fastest instances
- themeManager: Dark/light theme switching
- Other settings objects for UI preferences

**`js/db.js`** - IndexedDB wrapper (MusicDatabase class):
- Object stores: favorites (tracks/albums/artists/playlists/mixes), history, user_playlists
- Methods for favorites management, history tracking, and playlist CRUD
- Data minification to reduce storage footprint

**`js/player.js`** - Audio playback controller (Player class):
- Queue management (play next, add to queue, shuffle, repeat modes)
- Quality selection (LOSSLESS, HI_RES, etc.)
- Metadata injection for downloaded files
- Crossfade support

**`js/ui.js`** - DOM rendering engine (UIRenderer class):
- Renders all pages: home, search, album, artist, playlist, library, recent
- Track list rendering with context menus
- Loading states and error handling

**`js/router.js`** - Hash-based routing:
- Maps URLs like `#album/12345` to UI render methods
- Updates browser tab title based on playback state

**`js/events.js`** - Event handling orchestration:
- Player events (play, pause, track changes)
- Track interactions (context menus, like, add to playlist)
- MediaSession API integration for system media controls

**`js/downloads.js`** - Download functionality:
- Single track downloads with metadata
- Album downloads as ZIP with folder structure
- Discography downloads
- Playlist downloads as ZIP
- Uses JSZip for archive creation

**`js/lyrics.js`** - Lyrics display (LyricsManager class):
- Fetches and renders synced/unsynced lyrics
- Side panel integration
- Fullscreen lyrics view

**`js/lastfm.js`** - Last.fm scrobbling (LastFMScrobbler class):
- OAuth authentication flow
- Track scrobbling and "now playing" updates

**`js/firebase/`** - Optional cloud sync:
- `auth.js`: Google Sign-In authentication
- `config.js`: Firebase initialization and configuration
- `sync.js`: Bidirectional sync of favorites, history, and user playlists between IndexedDB and Firebase Realtime Database

### Data Flow

1. **API Requests**: ui.js → api.js → TIDAL backend (via configured instances)
2. **Playback**: ui.js (user action) → player.js → HTMLAudioElement → api.js (stream URL)
3. **Favorites**: ui.js → db.js (IndexedDB) → firebase/sync.js (optional cloud sync)
4. **Navigation**: User clicks → router.js → ui.js renders page
5. **Settings**: settings.js reads/writes → localStorage or firebase config

### Key Configuration Files

**`vite.config.js`**:
- Base path: `'./'` (supports deployment to subdirectories)
- PWA configuration with workbox caching strategies
- Includes runtime caching for images and media

**`public/instances.json`**:
- Defines TIDAL API and streaming backend instances
- Structure: `{ "api": [...], "streaming": [...] }`
- The app loads this at runtime and speed-tests instances

**`index.html`**:
- Single HTML entry point
- Contains all UI structure (sidebar, player bar, modals, side panel)
- Vite injects module scripts during build

## Deployment

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers on push to `main` branch
- Runs `npm ci && npm run build`
- Publishes `dist/` folder to the `deployed-ver` branch
- Uses Node.js 22

The build artifact works on both Cloudflare Pages (root path) and GitHub Pages (subdirectory) due to the relative base path.

## Firebase Setup (Optional)

Firebase enables cross-device sync of library, history, and settings. Setup instructions are in `firebase-setup.md`:
1. Create Firebase project
2. Enable Google Authentication
3. Enable Realtime Database with security rules (users can only read/write their own data)
4. Configure in app settings

**Security Rules** (from firebase-setup.md):
- `/users/$uid`: Read/write only if authenticated user matches UID
- `/public_playlists`: Public read, write only by authenticated owner

## Code Conventions

### Module Imports
All JavaScript files use ES module imports. Internal modules use relative paths:
```javascript
import { LosslessAPI } from './api.js';
import { db } from './db.js';
```

### Async Patterns
The codebase extensively uses async/await for:
- API calls
- IndexedDB operations
- Firebase operations

### Error Handling
- API retries with exponential backoff in `api.js`
- Rate limiting detection (HTTP 429) with `Retry-After` header support
- Graceful fallbacks for offline scenarios

### State Management
- No framework state management; state lives in:
  - Player instance (current track, queue, playback state)
  - IndexedDB (favorites, history, playlists)
  - localStorage (settings, API instances)
  - Firebase (synced data, optional)

### DOM Manipulation
Direct DOM manipulation throughout. No virtual DOM or framework:
- `innerHTML` for rendering large structures
- Manual event listener attachment
- Query selectors for element access

## Common Development Scenarios

### Adding a New Page
1. Add route case in `router.js` `createRouter()` switch statement
2. Implement `renderXPage()` method in `ui.js`
3. Add navigation link in `index.html` sidebar if needed

### Adding a New API Endpoint
1. Add method to `LosslessAPI` class in `api.js`
2. Use `fetchWithRetry()` for automatic failover and caching
3. Normalize response structure if needed (see `normalizeSearchResponse()`)

### Modifying IndexedDB Schema
1. Increment `this.version` in `db.js` MusicDatabase constructor
2. Add migration logic in `request.onupgradeneeded` handler
3. Test with existing data to ensure migration works

### Modifying PWA Configuration
Edit `vite.config.js` VitePWA plugin options:
- `workbox.globPatterns`: Files to precache
- `workbox.runtimeCaching`: Network request caching strategies
- `manifest: false` because we use `public/manifest.json` directly

## Architecture Patterns

### API Instance Management
The app supports multiple TIDAL backend instances with automatic failover:
1. Load instances from `public/instances.json` or localStorage
2. Speed test each instance (cached for 1 hour)
3. Sort by speed and attempt requests in order
4. On failure, retry with next instance

### Caching Strategy
- **API Cache**: In-memory LRU cache (200 items, 30 min TTL) in `api.js`
- **Stream Cache**: Map-based cache for stream URLs (max 50 entries)
- **IndexedDB**: Persistent storage for user data
- **Service Worker**: Precache static assets, runtime cache for images/media

### Keyboard Shortcuts
Implemented in `app.js` `initializeKeyboardShortcuts()`:
- Space: Play/pause
- Arrow keys: Seek/skip (with Shift for prev/next track)
- M: Mute
- S: Shuffle
- R: Repeat
- Q: Queue
- L: Open lyrics/fullscreen cover
- /: Focus search
- Escape: Close panels

### Context Menu System
Right-click context menu for tracks (see `events.js`):
- Like/unlike
- Add to playlist
- Play next / add to queue
- Download
- Track mix (radio-like feature)

## Important Implementation Details

### Track Normalization
The `api.js` module normalizes track data from different API responses:
- Ensures `artist` field exists (from `artists` array)
- Derives audio quality from codec/bitrate (`deriveTrackQuality()` in `utils.js`)
- Minifies track data for storage in `db.js`

### Casting Support
The app detects and supports:
- **Chromecast**: Via Remote Playback API (`audioPlayer.remote`)
- **AirPlay**: Via WebKit-specific APIs (`webkitShowPlaybackTargetPicker`)

### Offline Support
PWA with service worker provides:
- Offline page loading
- Cached API responses
- IndexedDB for user data persistence
- Offline notification UI when connectivity is lost

### Hash Routing
Uses hash-based URLs for client-side navigation:
- `#home` → Home page
- `#album/12345` → Album detail
- `#search/query` → Search results
- `#library` → User library

This approach works without server configuration and supports GitHub Pages deployment.

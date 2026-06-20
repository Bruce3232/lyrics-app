# Lyrics & Chords — Performance Viewer

A mobile-first Progressive Web App (PWA) for storing song lyrics with chords and
displaying them during live performances. The interface is in German.

## Features

- **Song library** — create, edit, and organize songs with lyrics and chords.
- **Setlists** — group songs into ordered setlists for a gig or rehearsal.
- **Performance mode** — distraction-free, large-text view with **pinch-to-zoom**
  font sizing for reading on stage.
- **Transpose** — shift chords up or down to a different key.
- **Cloud sync & sharing** — sign in (register / login) to back up songs and
  share them with friends. Powered by Firebase (Auth + Firestore).
- **Dark & light themes.**
- **Offline support** — installable PWA with a service worker, so it works
  without a connection once loaded.

## Project structure

| File / folder | Purpose |
|---|---|
| `index.html` | The entire app (markup, styles, and logic in one file). |
| `manifest.json` | PWA manifest (name, icons, theme color, display mode). |
| `sw.js` | Service worker for offline caching. |
| `vendor/` | Firebase compat libraries (app, auth, firestore). |

## Running locally

Because it's a static site, serve the folder with any static web server, e.g.:

```bash
# Python 3
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser. Opening `index.html` directly
via `file://` may break service-worker and Firebase features, so a local server
is recommended.

## Deployment

The app is fully static and can be hosted on any static host (GitHub Pages,
Firebase Hosting, Netlify, etc.).

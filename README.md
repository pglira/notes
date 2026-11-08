# Notes

A Progressive Web App for simple notes with text and images.

- Tap + to write a note. Each change saves at once.
- Add images below the text with "Add images". Tap an image to see it at full size or to remove it.
- Share a note with the share button, for example to WhatsApp. The share sheet gets the text and the images.
- Archive a note to move it out of the list. The "Archive" tab shows the archived notes, and a note can come back from there.
- Delete a note with the delete button and a second tap.
- An empty note is removed when the editor closes.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the text of the notes, IndexedDB for the images
- Images are scaled down to at most 1600 px and stored as JPEG.

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/notes/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".

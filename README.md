# Breakfast Chooser (GitHub Pages)

This repo hosts a tiny offline web app for your iPad. Install it via Safari → Share → **Add to Home Screen**.

## Files
- `index.html` — the app (single page)
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker for offline
- `icon-192.png`, `icon-512.png` — app icons

## Deploy to GitHub Pages (step-by-step)
1. Create a new repo on GitHub named **breakfast-chooser** (public is fine).
2. Upload **all files** from this folder to the **root** of the repo.
   - Or push via git: `git init`, `git add .`, `git commit -m "init"`, `git branch -M main`, `git remote add origin https://github.com/<your-username>/breakfast-chooser.git`, `git push -u origin main`
3. In the repo: **Settings → Pages → Build and deployment**.
   - **Source**: *Deploy from a branch*
   - **Branch**: *main* and **/ (root)**
4. Wait for the “Your site is published at …” message. Your URL will be:
   `https://<your-username>.github.io/breakfast-chooser/`
5. On your iPad, open that URL in **Safari**.
   - Tap **Share** → **Add to Home Screen**.
   - Open it once while online so the service worker caches assets.
6. It now works offline. All data stays on the device (localStorage).

## Changing the repo name or path
This service worker auto-detects its base path, so it will work whether the site is at `/` or at a subpath like `/breakfast-chooser/`. No changes needed.

## Development tips
- If you edit files, bump the `CACHE` version in `sw.js` (e.g., `breakfast-v2`) so users get the update.
- To “Reset Day,” use the button in the app for the selected date.
- Photos are saved locally in the browser (no upload).

Enjoy!

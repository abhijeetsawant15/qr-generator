# QR Studio

> Instant QR code generator for URLs, WiFi, contacts, emails, SMS, and more.
> Pure HTML/CSS/JS — no build step, no backend, deploy anywhere.

![QR Studio](icons/icon-192.png)

---

## Features

### Core
- **7 QR types** — URL, WiFi, Contact (vCard 3.0), Email, Phone, SMS, Plain Text
- **Auto filename detection** — `https://youtube.com` → `youtubeqr.png`
- **Download in 3 formats** — PNG, JPG, SVG
- **Copy URL** to clipboard in one click
- **Clear form** resets everything instantly
- **Enter key** triggers generation in the URL tab
- **Input validation** with inline error messages

### Customisation
- Foreground & background **color pickers**
- **Three sizes** — Small (200px), Medium (300px), Large (450px)
- **Four margin levels** — None, Small, Medium, Large
- **Four error correction levels** — L / M / Q / H
- **Logo overlay** — drag & drop or click to upload; resize with a slider; remove anytime

### Design
- **Dark mode / Light mode** — toggles in header, persists via `localStorage`
- Fully **responsive** — mobile, tablet, desktop
- **High contrast** support
- **Reduced motion** respected

### History
- Stores the last **20 generated QR codes** in `localStorage`
- Shows thumbnail, type badge, label, and timestamp
- Re-download any item as PNG
- Delete individual items or clear all

### PWA
- **Installable** on Android and iOS (Add to Home Screen)
- **Offline support** via Service Worker (cache-first strategy)
- Custom app icons (192×192, 512×512)
- Proper `manifest.json`

### Accessibility
- All interactive elements are **keyboard accessible**
- `aria-label`, `aria-expanded`, `aria-live`, `role` attributes throughout
- Visible `:focus-visible` ring on all controls
- Screen-reader announcements for errors and QR preview

---

## Project Structure

```
QR-Generator/
├── index.html        # App shell + all markup
├── style.css         # Design tokens, layout, dark mode, responsive
├── script.js         # QR generation, history, PWA, downloads
├── manifest.json     # Web App Manifest
├── sw.js             # Service Worker (offline caching)
├── icons/
│   ├── icon-192.png  # PWA icon
│   └── icon-512.png  # PWA icon
└── README.md
```

---

## Quick Start (local)

```bash
# Clone or download the project
git clone https://github.com/your-username/qr-studio.git
cd qr-studio

# Open directly in browser — no build step required
open index.html
```

Or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Deployment

### Netlify

**Option A — Drag & Drop**

1. Go to [app.netlify.com](https://app.netlify.com) and log in.
2. Click **"Add new site" → "Deploy manually"**.
3. Drag the entire `QR-Generator/` folder into the drop zone.
4. Netlify publishes your site instantly. Copy the URL.

**Option B — Git**

1. Push this folder to a GitHub / GitLab / Bitbucket repository.
2. In Netlify: **"Add new site" → "Import an existing project"**.
3. Connect your repo. Set:
   - **Build command:** *(leave blank)*
   - **Publish directory:** `.` (or the folder name if it's a sub-folder)
4. Click **Deploy**.

**Option C — Netlify CLI**

```bash
npm install -g netlify-cli
netlify login
netlify deploy --dir . --prod
```

> **Note:** No `netlify.toml` is required. The project is pure static files.

---

### GitHub Pages

1. Push the project to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Source**, select **"Deploy from a branch"**.
4. Choose `main` branch, `/ (root)` folder.
5. Click **Save**. Your site is live at `https://username.github.io/repository-name/`.

---

### Vercel

**Option A — Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B — Git integration**

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com) → **"New Project"**.
3. Import your GitHub repo.
4. Leave all settings as default (Framework Preset: **Other**).
5. Click **Deploy**.

---

## Screenshots

| Light Mode | Dark Mode |
|-----------|-----------|
| *(screenshot placeholder)* | *(screenshot placeholder)* |

| History | WiFi QR |
|---------|---------|
| *(screenshot placeholder)* | *(screenshot placeholder)* |

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full (incl. PWA install) |
| Firefox 90+ | ✅ Full |
| Safari 14+ | ✅ Full (PWA via "Add to Home Screen") |
| Edge 90+ | ✅ Full |

---

## Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| [qr-creator](https://github.com/nicktindall/qr-creator) | 1.0.0 | Canvas-based QR rendering with color support |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | — | UI typography |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | — | Color value display |

No framework. No build tools. No npm required.

---

## License

MIT — free to use, modify, and distribute.

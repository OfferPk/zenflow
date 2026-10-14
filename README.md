# ZenFlow 🌊✨

> A sleek, calm, offline color connect and flow puzzle with 50 handcrafted levels, harmonic pentatonic chimes, smart hints, and unlimited undo.

[![CI](https://github.com/OfferPk/zenflow/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenflow/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenflow/actions/workflows/pages.yml/badge.svg)](https://offerpk.github.io/zenflow/)
[![Android](https://github.com/OfferPk/zenflow/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenflow/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌐 Live Web Demo

Play immediately in any web browser:  
👉 **[https://offerpk.github.io/zenflow/](https://offerpk.github.io/zenflow/)**

100% offline via PWA Service Worker caching. Installable directly to your home screen on Android, iOS, Windows, and macOS.

---

## 📱 Android APK Download

- **GitHub Actions Debug APK**: Download the latest build directly from [Android Build Artifacts](https://github.com/OfferPk/zenflow/actions/workflows/android.yml) (Artifact name: `zenflow-apk`).
- **Releases**: Tagged releases include standalone APK assets under [GitHub Releases](https://github.com/OfferPk/zenflow/releases).

---

## 📸 Screenshots

| Starter 5x5 Grid | Master 9x9 Grid | 3-Star Victory Celebration |
| :---: | :---: | :---: |
| _[ Glowing Neon Flow Board ]_ | _[ Complex Multi-Flow Matrix ]_ | _[ Particle Confetti Cascade ]_ |

---

## ✨ Features

- **50 Handcrafted Levels**:
  - `Starter 5x5` (10 levels)
  - `Classic 6x6` (10 levels)
  - `Challenger 7x7` (10 levels)
  - `Expert 8x8` (10 levels)
  - `Master 9x9` (10 levels)
- **Harmonic Pentatonic Audio**: Pure synthesized Web Audio bells tuned to musical degrees that chime when each color flow connects.
- **Smart Hint Assistant**: Unstuck yourself anytime with one-tap solution paths.
- **Fluid Touch & Mouse Controls**: High-DPI canvas rendering with rounded tube caps, glowing halos, and smooth pointer tracking.
- **Multi-Step Undo & Reset**: Step back move-by-move or clear the board instantly.
- **Colorblind Accessible**: High-contrast node letter indicators (R, B, G, Y, O, P, C, M, L, W).
- **100% Offline & Private**: Zero tracking SDKs, no ads, no internet required.

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js >= 20
- npm >= 10

### Setup
```bash
# Clone the repository
git clone https://github.com/OfferPk/zenflow.git
cd zenflow

# Install dependencies
npm install
```

### Run Tests
```bash
npm test
```

### Build Web Assets
```bash
npm run build
```

### Sync to Android
```bash
npm run build
npx cap sync android
```

---

## 📄 License

MIT © [OfferPk](https://github.com/OfferPk)

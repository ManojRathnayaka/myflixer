# 🎬 MYFLIXER - Personal Media Streaming Server

A lightweight, high-performance personal media streaming server with a sleek, Netflix-inspired web interface. Designed to scan your local movie library and stream it directly to your browser anywhere, on any device.

This application focuses on delivering a premium, mobile-optimized viewing experience with on-the-fly video transcoding.

---

## ✨ Features

- **Netflix-Style Interface:** A beautiful, dark-themed UI with a responsive grid layout and real-time search filtering.
- **On-the-Fly Transcoding:** Uses FFmpeg to transcode MKV, AVI, and MP4 files into web-friendly H.264/AAC streams instantly.
- **Mobile-Optimized:** Carefully crafted for mobile devices. Features include:
  - Touch-friendly custom scrubbers and UI elements.
  - Seamless landscape/portrait orientation handling.
  - Fullscreen immersive player overlay that mimics native apps.
- **Hardware Acceleration:** Configured to use AMF (Advanced Media Framework) for efficient hardware-accelerated video encoding.
- **Local Network Access:** Stream your library from any device connected to your local WiFi network. No internet connection required!
- **No Sign-up Required:** Instant access to your media without the hassle of accounts or passwords.
- **Lightweight Frontend:** Lightning-fast load times.

---

## 🛠️ Technologies Used & Why

### Backend
* **Node.js**: The core runtime environment, chosen for its non-blocking I/O, which is perfect for handling chunked video streams and API requests concurrently.
* **Fastify**: A highly focused, ultra-fast web framework for Node.js. Chosen over Express for its superior performance and low overhead, making it ideal for serving media and static assets.
* **FFmpeg & FFprobe**: The undisputed kings of multimedia handling. Used to extract video metadata and perform real-time video transcoding to ensure playback compatibility across all modern web browsers (Safari, Chrome, iOS, Android).

### Frontend
* **Vanilla JavaScript & HTML5**: Kept the core frontend dependency-free (no React/Vue) to ensure maximum performance, minimal bundle size, and total control over the DOM and video APIs.
* **Modern CSS3**: Utilizes CSS Variables, Grid, and Flexbox for a responsive design. Built without heavy CSS frameworks to maintain a completely bespoke, highly optimized, and maintainable stylesheet.
* **Plyr.js**: A simple, lightweight, and highly customizable HTML5 video player. It provides a beautiful, consistent UI across different browsers while allowing us to hook into its API for custom scrubbing and mobile UI adjustments.
* **Google Fonts (Inter)**: Chosen for clean, modern, and highly legible typography that mimics premium streaming platforms.

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **FFmpeg** (Must be installed and added to your system's PATH)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/myflixer.git
   cd myflixer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your media directory:
   Open `server.js` and update the `ENTERTAINMENT_DIR` constant to point to your local movies folder:
   ```javascript
   const ENTERTAINMENT_DIR = 'D:/Entertainment'; // Change this to your path
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   `http://localhost:8080` (or `http://<your-local-ip>:8080` to access from your phone!)

---

## 📱 Mobile Experience

A significant amount of effort went into making MYFLIXER feel like a native mobile app. The UI is completely responsive, but more importantly, the video player itself is tailored for touch interfaces. We implemented custom event listeners to handle fullscreen API quirks on mobile browsers, ensuring the close buttons, scrubbers, and controls remain accessible and perfectly styled whether you are in portrait or landscape mode.
# YouTube Grabber - Standalone Application

A modern, standalone YouTube video downloader built with Electron technology. This application provides an easy YouTube downloading experience as a native desktop application.

## Features

- 🎥 Download YouTube videos in various qualities
- 🎵 Audio-only download (MP3 format)
- 📁 Custom download destination folder
- 📊 Real-time download progress
- 🔄 Automatic MKV → MP4 conversion
- 💾 Settings persistence
- 🌍 Multi-language support (English/Hungarian)
- 📍 Auto-detect location for default language

## Installation

1. Install Node.js (if not already installed)
2. Clone the repository
   ```bash
   git clone https://github.com/herowarriors0/YouTube-Grabber.git
   ```
3. Navigate to the project directory
4. Install dependencies:
   ```bash
   npm install
   ```
   **Note:** The node_modules folder is quite large (~800MB) due to Electron and its dependencies. This folder is excluded from version control via .gitignore and will be created when you run `npm install`.

## Assets (Binaries)

The `assets/` folder must contain `ffmpeg.exe` and `ffprobe.exe` for the app to work. These files are not included in the repository. Please download them manually from the official FFmpeg website and place them in the `assets/` folder:

- Download from: https://www.gyan.dev/ffmpeg/builds/
- Extract `ffmpeg.exe` and `ffprobe.exe` from the ZIP's `bin/` folder into your local `assets/` directory.

`yt-dlp.exe` is included in the repository and does not need to be downloaded manually.

## Usage

### Development Mode
```bash
npm run dev
```

### Build Production Version
```bash
npm run build
```

### Create Installer Package
```bash
npm run dist
```

## How to Use

1. **Select Destination Folder**: Choose where you want to save downloads
2. **Enter YouTube URL**: Paste the YouTube video URL and wait a moment
3. **Choose Settings**: Select video quality or audio-only mode
4. **Download**: Click the download button and wait!

## Requirements

- Windows 10 or newer
- Internet connection
- Sufficient storage space for downloads

## Technical Details

- Built with Electron for cross-platform compatibility
- Uses yt-dlp for YouTube video extraction
- FFmpeg for video/audio processing
- HTML5/CSS3/JavaScript frontend
- i18n support for multiple languages

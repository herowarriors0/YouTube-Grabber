const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let downloadProcess = null;


function createWindow() {
  const width = 1024;
  const height = 576;
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 640,
    minHeight: 360,
    aspectRatio: 16 / 9,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    resizable: true,
    autoHideMenuBar: true
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.commandLine.appendSwitch('--disable-geolocation');
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') {
    return false;
  }
  
  const normalizedPath = path.normalize(folderPath);
  if (normalizedPath.includes('..') || !path.isAbsolute(normalizedPath)) {
    return false;
  }
  
  if (fs.existsSync(normalizedPath)) {
    shell.openPath(normalizedPath);
    return true;
  }
  return false;
});

ipcMain.handle('validate-youtube-url', async (event, url) => {
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return false;
  }
  
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}(\S*)?$/;
  return youtubeRegex.test(url);
});

ipcMain.handle('get-video-info', async (event, url) => {
  try {
    const ytDlpPath = getYtDlpPath();
    
    return new Promise((resolve, reject) => {
      const ytDlpArgs = [
        '--dump-json',
        '--no-playlist',
        url
      ];

      const ytDlpProcess = spawn(ytDlpPath, ytDlpArgs);
      let stdout = '';
      let stderr = '';

      ytDlpProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytDlpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ytDlpProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            
            const videoFormats = info.formats.filter(f => f.vcodec && f.vcodec !== 'none');
            const uniqueQualities = new Map();
            
            videoFormats.forEach(format => {
              if (format.height && !uniqueQualities.has(format.height)) {
                uniqueQualities.set(format.height, format.format_id);
              }
            });

            const sortedQualities = Array.from(uniqueQualities.entries())
              .map(([height, format_id]) => ({
                label: `${height}p`,
                value: height.toString(),
                resolution: height,
              }))
              .sort((a, b) => b.resolution - a.resolution);

            resolve({
              title: info.title || 'Ismeretlen cím',
              thumbnail: info.thumbnail || '',
              qualities: [{ label: 'Legjobb minőség', value: 'best' }, ...sortedQualities]
            });
          } catch (parseError) {
            reject(new Error(`Videó információ feldolgozása sikertelen: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Videó információ lekérése sikertelen: ${stderr}`));
        }
      });
    });
  } catch (error) {
    throw new Error(`Videó információ lekérése sikertelen: ${error.message}`);
  }
});

ipcMain.handle('download-video', async (event, options) => {
  const { url, folderPath, audioOnly, quality } = options;
  
  try {
    const ytDlpPath = getYtDlpPath();
    
    const infoArgs = ['--get-title', '--no-playlist', url];
    const infoProcess = spawn(ytDlpPath, infoArgs);
    
    let title = '';
    infoProcess.stdout.on('data', (data) => {
      title += data.toString().trim();
    });

    return new Promise((resolve, reject) => {
      infoProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Videó cím lekérése sikertelen'));
          return;
        }

        const fileName = title.replace(/[\\/:*?"<>|]/g, '');
        let outputTemplate;
        
        if (audioOnly) {
          outputTemplate = path.join(folderPath, `${fileName}.%(ext)s`);
        } else {
          outputTemplate = path.join(folderPath, `${fileName}.%(ext)s`);
        }

        const ffmpegPath = getFfmpegPath();
        const ytDlpArgs = [
          url,
          '-o', outputTemplate,
          '--no-playlist',
          '--ffmpeg-location', ffmpegPath
        ];

        if (audioOnly) {
          ytDlpArgs.push('--extract-audio', '--audio-format', 'mp3');
          ytDlpArgs.push('--audio-quality', '0');
          ytDlpArgs.push('--output', outputTemplate.replace(/\.%\(ext\)s$/, '.mp3'));
        } else {
          ytDlpArgs.push('-f', quality === 'best' ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' : `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`);
          ytDlpArgs.push('--merge-output-format', 'mp4');
          ytDlpArgs.push('--output', outputTemplate.replace(/\.%\(ext\)s$/, '.mp4'));
        }

        const ytDlpProcess = spawn(ytDlpPath, ytDlpArgs);
        downloadProcess = ytDlpProcess;

        const downloadProgressRegex = /\[download\]\s+(\d{1,3}\.\d+)%/;

        ytDlpProcess.stdout.on('data', (data) => {
          const message = data.toString();
          const match = message.match(downloadProgressRegex);
          if (match && match[1]) {
            const progress = parseFloat(match[1]);
            if (!isNaN(progress)) {
              mainWindow.webContents.send('download-progress', {
                progress: (progress * 80) / 100,
                text: `Letöltés: ${progress.toFixed(1)}%`
              });
            }
          }
        });

        ytDlpProcess.stderr.on('data', (data) => {
          console.log(`yt-dlp stderr: ${data.toString()}`);
        });

        ytDlpProcess.on('close', async (downloadCode) => {
          downloadProcess = null;
          
          if (downloadCode === 0) {
            const files = fs.readdirSync(folderPath);
            const downloadedFile = files.find(file => file.includes(fileName));
            
            if (downloadedFile) {
              const filePath = path.join(folderPath, downloadedFile);
              
              if (path.extname(downloadedFile) === '.mkv' && !audioOnly) {
                await convertMkvToMp4(filePath, ffmpegPath);
              }
              
              mainWindow.webContents.send('download-progress', {
                progress: 100,
                text: 'Letöltés befejezve!'
              });
              resolve({ success: true, filePath });
            } else {
              reject(new Error('Letöltött fájl nem található'));
            }
          } else {
            reject(new Error(`Letöltés sikertelen (kód: ${downloadCode})`));
          }
        });
      });
    });
    
  } catch (error) {
    throw new Error(`Letöltés sikertelen: ${error.message}`);
  }
});

ipcMain.handle('cancel-download', async () => {
  if (downloadProcess) {
    downloadProcess.kill('SIGTERM');
    downloadProcess = null;
    return true;
  }
  return false;
});

async function convertMkvToMp4(mkvPath, ffmpegPath) {
  const mp4Path = mkvPath.replace('.mkv', '.mp4');
  
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', mkvPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      '-progress', 'pipe:1',
      mp4Path,
    ];

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

    ffmpegProcess.stdout.on('data', (data) => {
      const message = data.toString();
      const lines = message.split('\n');
      let progress = {};

      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          progress[key.trim()] = value.trim();
        }
      });

      if (progress.out_time_ms) {
        mainWindow.webContents.send('download-progress', {
          progress: 90,
          text: 'Konvertálás MP4 formátumra...'
        });
      }
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        fs.unlinkSync(mkvPath);
        resolve(mp4Path);
      } else {
        reject(new Error(`FFmpeg konvertálás sikertelen (kód: ${code})`));
      }
    });
  });
}

function getYtDlpPath() {
  const bundledPath = path.join(process.resourcesPath, 'yt-dlp.exe');
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  
  const devPath = path.join(__dirname, '../assets/yt-dlp.exe');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  
  return 'yt-dlp';
}

function getFfmpegPath() {
  try {
    return require('ffmpeg-static');
  } catch (e) {
    const bundledPath = path.join(process.resourcesPath, 'ffmpeg.exe');
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
    
    const devPath = path.join(__dirname, '../assets/ffmpeg.exe');
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    
    return 'ffmpeg';
  }
}

function getFfprobePath() {
  try {
    return require('ffprobe-static');
  } catch (e) {
    const bundledPath = path.join(process.resourcesPath, 'ffprobe.exe');
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
    
    const devPath = path.join(__dirname, '../assets/ffprobe.exe');
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    
    return 'ffprobe';
  }
}

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  
  validateYouTubeUrl: (url) => ipcRenderer.invoke('validate-youtube-url', url),
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', callback);
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

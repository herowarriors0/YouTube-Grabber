class YouTubeGrabber {
    constructor() {
        this.isDownloading = false;
        this.selectedFolder = '';
        this.videoInfo = null;
        
        if (window.i18n) {
            this.init();
        } else {
            document.addEventListener('i18nReady', () => this.init());
        }
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.updateDownloadButton();
        
        this.setupI18nListeners();
    }

    setupI18nListeners() {
        document.addEventListener('languageChanged', () => {
            this.updateDownloadButton();
        });
        
        const audioOnlyCheckbox = document.getElementById('audioOnly');
        if (audioOnlyCheckbox) {
            audioOnlyCheckbox.addEventListener('change', () => {
                if (window.i18n) {
                    window.i18n.updateDownloadButtonText();
                }
            });
        }
    }

    bindEvents() {
        document.getElementById('selectFolderBtn').addEventListener('click', () => this.selectFolder());
        document.getElementById('openFolderBtn').addEventListener('click', () => this.openFolder());

        const urlInput = document.getElementById('youtubeUrl');
        urlInput.addEventListener('input', this.debounce(() => this.handleUrlChange(), 500));

        document.getElementById('audioOnly').addEventListener('change', (e) => {
            const qualityGroup = document.getElementById('qualityGroup');
            qualityGroup.style.display = e.target.checked ? 'none' : 'block';
            this.updateDownloadButton();
        });

        document.getElementById('downloadBtn').addEventListener('click', () => this.startDownload());
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelDownload());

        window.electronAPI.onDownloadProgress((event, data) => {
            this.updateProgress(data.progress, data.text);
        });
    }

    async selectFolder() {
        try {
            const folderPath = await window.electronAPI.selectFolder();
            if (folderPath) {
                this.selectedFolder = folderPath;
                document.getElementById('folderPath').value = folderPath;
                document.getElementById('openFolderBtn').disabled = false;
                this.saveSettings();
                this.updateDownloadButton();
                this.showToast(window.i18n ? window.i18n.t('messages.folderSelected') : 'Folder selected successfully', 'success');
            }
        } catch (error) {
            this.showToast(window.i18n ? window.i18n.t('messages.errorOccurred') : 'An error occurred', 'error');
        }
    }

    async openFolder() {
        if (this.selectedFolder) {
            try {
                await window.electronAPI.openFolder(this.selectedFolder);
            } catch (error) {
                this.showToast(window.i18n ? window.i18n.t('messages.errorOccurred') : 'An error occurred', 'error');
            }
        }
    }

    async handleUrlChange() {
        const url = document.getElementById('youtubeUrl').value.trim();
        const fetchingInfo = document.getElementById('fetchingInfo');
        const videoPreview = document.getElementById('videoPreview');

        if (!url) {
            videoPreview.style.display = 'none';
            this.videoInfo = null;
            this.updateDownloadButton();
            return;
        }

        try {
            const isValid = await window.electronAPI.validateYouTubeUrl(url);
            if (!isValid) {
                videoPreview.style.display = 'none';
                this.videoInfo = null;
                this.updateDownloadButton();
                return;
            }

            fetchingInfo.style.display = 'inline';
            
            const info = await window.electronAPI.getVideoInfo(url);
            this.videoInfo = info;

            document.getElementById('thumbnail').src = info.thumbnail;
            document.getElementById('videoTitle').textContent = info.title;
            
            const qualitySelect = document.getElementById('quality');
            qualitySelect.innerHTML = '';
            
            const bestOption = document.createElement('option');
            bestOption.value = 'best';
            bestOption.textContent = window.i18n ? window.i18n.t('ui.bestQuality') : 'Best Quality';
            qualitySelect.appendChild(bestOption);
            
            info.qualities.forEach(quality => {
                const option = document.createElement('option');
                option.value = quality.value;
                option.textContent = quality.label;
                qualitySelect.appendChild(option);
            });

            videoPreview.style.display = 'block';
            fetchingInfo.style.display = 'none';
            this.updateDownloadButton();
            this.showToast(window.i18n ? window.i18n.t('messages.videoInfoFetched') : 'Video information fetched successfully', 'success');

        } catch (error) {
            fetchingInfo.style.display = 'none';
            videoPreview.style.display = 'none';
            this.videoInfo = null;
            const errorMsg = window.i18n ? window.i18n.t('messages.errorOccurred') : 'An error occurred';
            this.showToast(`${errorMsg}: ${error.message}`, 'error');
            this.updateDownloadButton();
        }
    }

    updateDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        const url = document.getElementById('youtubeUrl').value.trim();
        const audioOnly = document.getElementById('audioOnly').checked;
        
        const canDownload = this.selectedFolder && 
                           this.videoInfo && 
                           url && 
                           !this.isDownloading;

        downloadBtn.disabled = !canDownload;
        
        if (window.i18n) {
            const text = audioOnly ? window.i18n.t('ui.downloadAudio') : window.i18n.t('ui.downloadVideo');
            downloadBtn.textContent = text;
        } else {
            const text = audioOnly ? '⬇️ Download Audio' : '⬇️ Download Video';
            downloadBtn.textContent = text;
        }
    }

    async startDownload() {
        if (this.isDownloading) return;

        const url = document.getElementById('youtubeUrl').value.trim();
        const audioOnly = document.getElementById('audioOnly').checked;
        const quality = document.getElementById('quality').value;

        if (!this.selectedFolder || !this.videoInfo || !url) {
            this.showToast(window.i18n ? window.i18n.t('messages.selectFolderFirst') : 'Please select a destination folder first', 'error');
            return;
        }

        this.isDownloading = true;
        this.showDownloadProgress();

        try {
            const result = await window.electronAPI.downloadVideo({
                url,
                folderPath: this.selectedFolder,
                audioOnly,
                quality
            });

            if (result.success) {
                this.showToast(window.i18n ? window.i18n.t('messages.downloadCompleted') : 'Download completed successfully!', 'success');
                this.hideDownloadProgress();
            }
        } catch (error) {
            const errorMsg = window.i18n ? window.i18n.t('messages.downloadFailed') : 'Download failed';
            this.showToast(`${errorMsg}: ${error.message}`, 'error');
            this.hideDownloadProgress();
        }

        this.isDownloading = false;
        this.updateDownloadButton();
    }

    async cancelDownload() {
        try {
            await window.electronAPI.cancelDownload();
            this.showToast(window.i18n ? window.i18n.t('messages.downloadCancelled') : 'Download cancelled', 'info');
            this.hideDownloadProgress();
            this.isDownloading = false;
            this.updateDownloadButton();
        } catch (error) {
            this.showToast(window.i18n ? window.i18n.t('messages.errorOccurred') : 'An error occurred', 'error');
        }
    }

    showDownloadProgress() {
        document.getElementById('downloadButton').style.display = 'none';
        document.getElementById('downloadProgress').style.display = 'block';
    }

    hideDownloadProgress() {
        document.getElementById('downloadButton').style.display = 'block';
        document.getElementById('downloadProgress').style.display = 'none';
        this.updateProgress(0, '');
    }

    updateProgress(progress, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${Math.min(progress, 100)}%`;
        progressText.textContent = text;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    saveSettings() {
        localStorage.setItem('youtubeGrabberSettings', JSON.stringify({
            folderPath: this.selectedFolder
        }));
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('youtubeGrabberSettings') || '{}');
            if (settings.folderPath) {
                this.selectedFolder = settings.folderPath;
                document.getElementById('folderPath').value = settings.folderPath;
                document.getElementById('openFolderBtn').disabled = false;
            }
        } catch (error) {
            console.log('No saved settings found');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new YouTubeGrabber();
});

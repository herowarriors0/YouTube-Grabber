class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = {
            'en': 'English',
            'hu': 'Magyar'
        };
        this.init();
    }

    async init() {
        await this.detectDefaultLanguage();
        await this.loadTranslations();
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && this.supportedLanguages[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        }
        this.updateUI();
        this.createLanguageSelector();
        document.dispatchEvent(new Event('i18nReady'));
    }

    async detectDefaultLanguage() {
        try {
            const browserLang = navigator.language.substr(0, 2);
            if (browserLang === 'hu') {
                this.currentLanguage = 'hu';
                return;
            }
            if (navigator.languages) {
                for (const lang of navigator.languages) {
                    if (lang.startsWith('hu')) {
                        this.currentLanguage = 'hu';
                        return;
                    }
                }
            }
            this.currentLanguage = 'en';
        } catch (error) {
            this.currentLanguage = 'en';
        }
    }

    async loadTranslations() {
        try {
            this.translations.en = {
                "app": {
                    "title": "YouTube Grabber",
                    "subtitle": "Download YouTube videos and audio easily"
                },
                "ui": {
                    "selectFolder": "Select Folder",
                    "folderPath": "📁 Destination Folder:",
                    "folderPlaceholder": "Choose destination folder...",
                    "browse": "Browse",
                    "openInExplorer": "Open in Explorer",
                    "youtubeUrl": "🔗 YouTube URL:",
                    "urlPlaceholder": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "fetchingInfo": "Fetching video information...",
                    "audioOnly": "🎵 Audio Only (MP3)",
                    "videoQuality": "🎬 Video Quality:",
                    "bestQuality": "Best Quality",
                    "downloadVideo": "⬇️ Download Video",
                    "downloadAudio": "⬇️ Download Audio",
                    "starting": "Starting download...",
                    "cancel": "❌ Cancel Download",
                    "language": "Language"
                },
                "messages": {
                    "folderSelected": "Folder selected successfully",
                    "invalidUrl": "Please enter a valid YouTube URL",
                    "selectFolderFirst": "Please select a destination folder first",
                    "downloadStarted": "Download started",
                    "downloadCompleted": "Download completed successfully!",
                    "downloadCancelled": "Download cancelled",
                    "downloadFailed": "Download failed",
                    "errorOccurred": "An error occurred",
                    "videoInfoFetched": "Video information fetched successfully",
                    "noVideoFormats": "No video formats available for this video"
                }
            };

            this.translations.hu = {
                "app": {
                    "title": "YouTube Letöltő",
                    "subtitle": "Tölts le YouTube videókat és hangokat egyszerűen"
                },
                "ui": {
                    "selectFolder": "Mappa kiválasztása",
                    "folderPath": "📁 Célmappa:",
                    "folderPlaceholder": "Válassz célmappát...",
                    "browse": "Tallózás",
                    "openInExplorer": "Megnyitás Intézőben",
                    "youtubeUrl": "🔗 YouTube URL:",
                    "urlPlaceholder": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "fetchingInfo": "Videó információ lekérése...",
                    "audioOnly": "🎵 Csak hang (MP3)",
                    "videoQuality": "🎬 Videó minőség:",
                    "bestQuality": "Legjobb minőség",
                    "downloadVideo": "⬇️ Videó letöltése",
                    "downloadAudio": "⬇️ Hang letöltése",
                    "starting": "Letöltés indítása...",
                    "cancel": "❌ Letöltés megszakítása",
                    "language": "Nyelv"
                },
                "messages": {
                    "folderSelected": "Mappa sikeresen kiválasztva",
                    "invalidUrl": "Kérlek adj meg egy érvényes YouTube URL-t",
                    "selectFolderFirst": "Először válassz ki egy célmappát",
                    "downloadStarted": "Letöltés elkezdődött",
                    "downloadCompleted": "Letöltés sikeresen befejezve!",
                    "downloadCancelled": "Letöltés megszakítva",
                    "downloadFailed": "Letöltés sikertelen",
                    "errorOccurred": "Hiba történt",
                    "videoInfoFetched": "Videó információ sikeresen lekérve",
                    "noVideoFormats": "Nincsenek elérhető videó formátumok ehhez a videóhoz"
                }
            };
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                break;
            }
        }
        
        if (!value && this.currentLanguage !== 'en') {
            value = this.translations.en;
            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    break;
                }
            }
        }
        
        return value || key;
    }

    setLanguage(lang) {
        if (this.supportedLanguages[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
            
            document.dispatchEvent(new Event('languageChanged'));
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    createLanguageSelector() {
        const header = document.querySelector('.header');
        if (!header) return;

        const existing = header.querySelector('.language-selector');
        if (existing) {
            existing.remove();
        }

        const langContainer = document.createElement('div');
        langContainer.className = 'language-selector';
        
        const langLabel = document.createElement('span');
        langLabel.textContent = this.t('ui.language');
        langLabel.className = 'language-label';
        
        const langSelect = document.createElement('select');
        langSelect.id = 'languageSelect';
        langSelect.className = 'language-select';
        
        Object.entries(this.supportedLanguages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            option.selected = code === this.currentLanguage;
            langSelect.appendChild(option);
        });
        
        langSelect.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
        
        langContainer.appendChild(langLabel);
        langContainer.appendChild(langSelect);
        header.appendChild(langContainer);
    }

    updateUI() {
        document.title = this.t('app.title');
        document.documentElement.lang = this.currentLanguage;
        
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        this.updateStaticElements();
    }

    updateStaticElements() {
        const title = document.querySelector('h1');
        if (title) title.textContent = this.t('app.title');
        
        const subtitle = document.querySelector('.header p');
        if (subtitle) subtitle.textContent = this.t('app.subtitle');
        
        this.updateDownloadButtonText();
        
        this.updateLanguageSelector();
    }

    updateLanguageSelector() {
        const langLabel = document.querySelector('.language-label');
        if (langLabel) {
            langLabel.textContent = this.t('ui.language');
        }
    }

    updateDownloadButtonText() {
        const downloadBtn = document.getElementById('downloadBtn');
        const audioOnly = document.getElementById('audioOnly');
        
        if (downloadBtn && audioOnly) {
            const isAudioOnly = audioOnly.checked;
            const text = isAudioOnly ? this.t('ui.downloadAudio') : this.t('ui.downloadVideo');
            downloadBtn.textContent = text;
        }
    }
}

window.i18n = new I18nManager();

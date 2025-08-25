class VoiceSearch {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.setupRecognition();
    }

    setupRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.onListeningStart?.();
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.onResult?.(transcript);
            };

            this.recognition.onerror = (event) => {
                this.onError?.(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.onListeningEnd?.();
            };
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                return true;
            } catch (error) {
                console.error('Voice recognition error:', error);
                return false;
            }
        }
        return false;
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            return true;
        }
        return false;
    }

    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    // Event handlers
    onListeningStart = null;
    onListeningEnd = null;
    onResult = null;
    onError = null;

    // Utility methods
    isSupported() {
        return 'webkitSpeechRecognition' in window;
    }

    getAvailableLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' }
        ];
    }

    processVoiceCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        
        // Simple command recognition
        if (lowerTranscript.includes('search for')) {
            return transcript.replace('search for', '').trim();
        }
        if (lowerTranscript.includes('find')) {
            return transcript.replace('find', '').trim();
        }
        if (lowerTranscript.includes('look for')) {
            return transcript.replace('look for', '').trim();
        }
        
        return transcript;
    }
}

// Create global instance
const voiceSearch = new VoiceSearch();

// Background message handler for voice search
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startVoiceSearch') {
        const started = voiceSearch.start();
        sendResponse({ success: started });
    }
    
    if (request.action === 'stopVoiceSearch') {
        const stopped = voiceSearch.stop();
        sendResponse({ success: stopped });
    }
    
    if (request.action === 'checkVoiceSupport') {
        sendResponse({ supported: voiceSearch.isSupported() });
    }
});
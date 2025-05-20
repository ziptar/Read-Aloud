export class Reader {
    private speechSynthesis: SpeechSynthesis;
    private utterance: SpeechSynthesisUtterance | null = null;
    private onSpeechStart: () => void;
    private onSpeechEnd: () => void;
    private onSpeechError: (error: string) => void;
    private onSpeechPause: () => void;
    private onSpeechResume: () => void;
    private onSpeechStop: () => void;

    constructor(callbacks: {
        onSpeechStart?: () => void;
        onSpeechEnd?: () => void;
        onSpeechError?: (error: string) => void;
        onSpeechPause?: () => void;
        onSpeechResume?: () => void;
        onSpeechStop?: () => void;
    } = {}) {
        this.speechSynthesis = window.speechSynthesis;
        this.speechSynthesis.getVoices();
        this.onSpeechStart = callbacks.onSpeechStart || (() => { });
        this.onSpeechEnd = callbacks.onSpeechEnd || (() => { });
        this.onSpeechError = callbacks.onSpeechError || (() => { });
        this.onSpeechPause = callbacks.onSpeechPause || (() => { });
        this.onSpeechResume = callbacks.onSpeechResume || (() => { });
        this.onSpeechStop = callbacks.onSpeechStop || (() => { });
    }

    getVoices(): SpeechSynthesisVoice[] {
        return this.speechSynthesis.getVoices();
    }

    /**
    * Start speaking the provided text with the given options
    */
    speak(text: string, options: SpeechOptions = {}): void {
        // Stop any ongoing speech
        if (this.utterance) {
            this.speechSynthesis.cancel();
        }

        // Create a new utterance with the provided text
        this.utterance = new SpeechSynthesisUtterance(text);

        // Apply speech options
        if (options.voice) {
            const voices = this.speechSynthesis.getVoices();
            const selectedVoice = voices.find(voice => voice.name === options.voice);
            if (selectedVoice) {
                this.utterance.voice = selectedVoice;
            }
        }

        if (options.rate) {
            this.utterance.rate = options.rate;
        }

        if (options.pitch) {
            this.utterance.pitch = options.pitch;
        }

        if (options.volume) {
            this.utterance.volume = options.volume;
        }

        if (options.lang) {
            this.utterance.lang = options.lang;
        }

        // Add event listeners
        this.utterance.onend = () => {
            this.utterance = null;
            this.onSpeechEnd();
        };

        this.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.utterance = null;
            this.onSpeechError(event.error);
        };

        // Start speaking
        this.speechSynthesis.speak(this.utterance);
        this.onSpeechStart();
    }

    /**
    * Stop the current speech
    */
    stop(): void {
        if (this.utterance) {
            this.speechSynthesis.cancel();
            this.utterance = null;
            this.onSpeechStop();
        }
    }

    /**
    * Pause the current speech
    */
    pause(): void {
        if (this.utterance && this.speechSynthesis.speaking) {
            this.speechSynthesis.pause();
            this.onSpeechPause();
        }
    }

    /**
    * Resume the paused speech
    */
    resume(): void {
        if (this.utterance && this.speechSynthesis.paused) {
            this.speechSynthesis.resume();
            this.onSpeechResume();
        }
    }

    /**
    * Check if speech is currently active
    */
    isSpeaking(): boolean {
        return this.speechSynthesis.speaking;
    }

    /**
    * Check if speech is currently paused
    */
    isPaused(): boolean {
        return this.speechSynthesis.paused;
    }
}

/**
* Options for speech synthesis
*/
export interface SpeechOptions {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
}

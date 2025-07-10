import { EventEmitter } from "./event-emitter";

type ReaderEvents = {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  error: (error: Error) => void;
};

export class Reader extends EventEmitter<ReaderEvents> {
  private voices: SpeechSynthesisVoice[] = [];
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    super();
    Reader.getVoices().then((voices) => (this.voices = voices));
  }

  static getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length !== 0) {
        resolve(voices);
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", function () {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        });
      }
    });
  }

  /**
   * Start speaking the provided text with the given options
   */
  speak(text: string, options: SpeechOptions = {}): void {
    // Stop any ongoing speech
    if (this.utterance) {
      window.speechSynthesis.cancel();
    }

    // Create a new utterance with the provided text
    this.utterance = new SpeechSynthesisUtterance(text);

    // Apply speech options
    if (options.voice) {
      const selectedVoice = this.voices.find(
        (voice) => voice.name === options.voice
      );
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
      this.emit("end");
    };

    this.utterance.onerror = (event) => {
      this.utterance = null;
      this.emit("error", new Error(event.error));
    };

    // Start speaking
    window.speechSynthesis.speak(this.utterance);
    this.emit("start");
  }

  /**
   * Stop the current speech
   */
  stop(): void {
    if (this.utterance) {
      window.speechSynthesis.cancel();
      this.utterance = null;
      this.emit("stop");
    }
  }

  /**
   * Pause the current speech
   */
  pause(): void {
    if (this.utterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.emit("pause");
    }
  }

  /**
   * Resume the paused speech
   */
  resume(): void {
    if (this.utterance && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.emit("resume");
    }
  }

  /**
   * Check if speech is currently active
   */
  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }

  /**
   * Check if speech is currently paused
   */
  isPaused(): boolean {
    return window.speechSynthesis.paused;
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

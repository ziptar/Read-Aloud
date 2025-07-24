import { EventEmitter, TTSSettings } from "./";

type ReaderEvents = {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  error: (error: Error) => void;
};

export class Reader {
  private voices: SpeechSynthesisVoice[] = [];
  private utterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking: boolean = false;
  private _isPaused: boolean = false;

  private eventEmitter: EventEmitter<ReaderEvents>;

  constructor() {
    this.eventEmitter = new EventEmitter<ReaderEvents>();
    this.loadVoices().then((voices) => (this.voices = voices));
  }

  on<K extends keyof ReaderEvents>(event: K, listener: ReaderEvents[K]): void {
    this.eventEmitter.on(event, listener);
  }

  off<K extends keyof ReaderEvents>(event: K, listener: ReaderEvents[K]): void {
    this.eventEmitter.off(event, listener);
  }

  emit<K extends keyof ReaderEvents>(
    event: K,
    ...args: Parameters<ReaderEvents[K]>
  ): void {
    this.eventEmitter.emit(event, ...args);
  }

  private loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", function () {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        });
      }
    });
  }

  getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.voices.length > 0) {
      return Promise.resolve(this.voices);
    }
    return this.loadVoices();
  }

  /**
   * Start speaking the provided text with the given options
   */
  speak(text: string, options: TTSSettings): void {
    // Stop any ongoing speech
    this.stop();

    // Create a new utterance with the provided text
    this.utterance = new SpeechSynthesisUtterance(text);

    // Apply speech options

    const selectedVoice = this.voices.find(
      (voice) => voice.name === options.voice
    );
    if (selectedVoice) {
      this.utterance.voice = selectedVoice;
    }
    this.utterance.rate = options.rate;
    this.utterance.pitch = options.pitch;
    this.utterance.volume = options.volume;
    this.utterance.lang = options.lang;

    // Add event listeners
    this.utterance.onend = () => {
      this.utterance = null;
      this.emit("end");
      this._isSpeaking = false;
    };

    this.utterance.onerror = (event) => {
      this.utterance = null;
      this.emit("error", new Error(event.error));
      this._isSpeaking = false;
      this._isPaused = false;
    };

    // Start speaking
    window.speechSynthesis.speak(this.utterance);
    this.emit("start");
    this._isSpeaking = true;
  }

  /**
   * Stop the current speech
   */
  stop(): void {
    if (this.utterance) {
      window.speechSynthesis.cancel();
      this.utterance = null;
      this.emit("stop");
      this._isSpeaking = false;
      this._isPaused = false;
    }
  }

  /**
   * Pause the current speech
   */
  pause(): void {
    if (this.utterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.emit("pause");
      this._isPaused = true;
    }
  }

  /**
   * Resume the paused speech
   */
  resume(): void {
    if (this.utterance && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.emit("resume");
      this._isPaused = false;
    }
  }

  /**
   * Check if speech is currently active
   */
  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Check if speech is currently paused
   */
  get isPaused(): boolean {
    return this._isPaused;
  }
}

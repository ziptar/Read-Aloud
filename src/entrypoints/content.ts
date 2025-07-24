import { Readability } from "@mozilla/readability";
import {
  Reader,
  Logger,
  MessageBus,
  PlaybackState,
  TTSVoice,
  Message,
  TTSSettings,
} from "../lib/";

class ContentScript {
  private reader: Reader;
  private logger: Logger;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger);
    this.reader = new Reader();
    this.setupEventListener();
    this.logger.log("Content script initialized and listening for messages.");
  }

  private setupEventListener(): void {
    this.setupReaderEventListeners();

    // Listen for messages from the popup or background script
    browser.runtime.onMessage.addListener((message) =>
      this.handleMessage(message)
    );
  }
  private setupReaderEventListeners() {
    this.reader.on("start", () => {
      this.logger.log("Speech playback has started.");
      MessageBus.sendToPopup({ type: "SPEECH_STARTED" });
    });
    this.reader.on("end", () => {
      this.logger.log("Speech playback has concluded.");
      MessageBus.sendToPopup({ type: "SPEECH_ENDED" });
    });
    this.reader.on("error", (error) => {
      if (error.message !== "interrupted") {
        console.error("An error occurred during speech playback:", error);
        MessageBus.sendToPopup({
          type: "SPEECH_ERROR",
          payload: error,
        });
      }
    });
    this.reader.on("pause", () => {
      this.logger.log("Speech playback paused.");
      MessageBus.sendToPopup({ type: "SPEECH_PAUSED" });
    });
    this.reader.on("resume", () => {
      this.logger.log("Speech playback resumed.");
      MessageBus.sendToPopup({ type: "SPEECH_RESUMED" });
    });
    this.reader.on("stop", () => {
      this.logger.log("Speech playback stopped.");
      MessageBus.sendToPopup({ type: "SPEECH_STOPPED" });
    });
  }

  private handleMessage(message: Message): void {
    this.logger.log("Content script received message:", message.type);

    switch (message.type) {
      case "PING":
        this.logger.log("Received PING message.");
        break;
      case "SPEAK_TEXT":
        this.handleSpeakText(message.payload);
        break;
      case "STOP_SPEECH":
        this.reader.stop();
        break;
      case "PAUSE_SPEECH":
        this.reader.pause();
        break;
      case "RESUME_SPEECH":
        this.reader.resume();
        break;
      case "GET_SPEECH_STATE":
        this.handleGetSpeechState();
        break;
      case "GET_VOICES":
        this.handleGetVoices();
        break;
    }
  }

  private handleSpeakText(settings: TTSSettings): void {
    // Extract selected text or page content
    const selectedText = window.getSelection()?.toString();
    const textToRead =
      selectedText || this.extractReadableContent() || document.body.innerText;

    if (textToRead) {
      this.reader.speak(textToRead, settings);
    }
  }

  private handleGetSpeechState(): void {
    const playbackState: PlaybackState = {
      isPlaying: this.reader.isSpeaking,
      isPaused: this.reader.isPaused,
    };
    MessageBus.sendToPopup({
      type: "UPDATE_SPEECH_STATE",
      payload: playbackState,
    });
  }

  private async handleGetVoices(): Promise<void> {
    const voices: TTSVoice[] = (await this.reader.getVoices()).map((voice) => ({
      name: voice.name,
      lang: voice.lang,
    }));
    MessageBus.sendToPopup({
      type: "UPDATE_VOICES",
      payload: voices,
    });
  }

  private extractReadableContent(): string | undefined {
    try {
      const doc = document.cloneNode(true) as Document;
      const reader = new Readability(doc);
      const article = reader.parse();
      return article?.textContent?.trim();
    } catch (error) {
      console.error("Failed to extract readable content from the page:", error);
    }
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    new ContentScript(true);
  },
});

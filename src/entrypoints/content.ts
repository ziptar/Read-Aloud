import { Readability } from "@mozilla/readability";
import { Reader, Logger, MessageBus, PlaybackState, TTSVoice } from "../lib/";

class ContentScript {
  private reader: Reader;
  private logger: Logger;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger || false);
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

  private handleMessage(message: any): void {
    this.logger.log("Content script received message:", message);

    const messageHandlers: Record<string, () => void> = {
      // Add a ping handler to check if content script is loaded
      // PING: () => {
      //   this.logger.log("Received PING message.");
      // },

      SPEAK_TEXT: () => {
        // Extract selected text or page content
        const selectedText = window.getSelection()?.toString();
        const textToRead =
          selectedText ||
          this.extractReadableContent() ||
          document.body.innerText;

        if (textToRead) {
          this.reader.speak(textToRead, message.payload);
        }
      },

      STOP_SPEECH: () => {
        this.reader.stop();
      },
      PAUSE_SPEECH: () => {
        this.reader.pause();
      },
      RESUME_SPEECH: () => {
        this.reader.resume();
      },

      GET_SPEECH_STATE: () => {
        const playbackState: PlaybackState = {
          isPlaying: this.reader.isSpeaking(),
          isPaused: this.reader.isPaused(),
        };
        MessageBus.sendToPopup({
          type: "UPDATE_SPEECH_STATE",
          payload: playbackState,
        });
      },
      GET_VOICES: async () => {
        const voices: TTSVoice[] = (await this.reader.getVoices()).map(
          (voice) => ({
            name: voice.name,
            lang: voice.lang,
          })
        );
        MessageBus.sendToPopup({
          type: "UPDATE_VOICES",
          payload: voices,
        });
      },
    };

    messageHandlers[message.type]?.();
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

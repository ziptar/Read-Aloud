import { Readability } from "@mozilla/readability";
import { Reader, Logger } from "../lib/";

class ContentScript {
  private reader: Reader | undefined;
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
    this.reader!.on("start", () => {
      this.logger.log("Speech playback has started.");
      browser.runtime.sendMessage({ action: "speechStarted" });
    });
    this.reader!.on("end", () => {
      this.logger.log("Speech playback has concluded.");
      browser.runtime.sendMessage({ action: "speechEnded" });
    });
    this.reader!.on("error", (error) => {
      if (error.message !== "interrupted") {
        console.error("An error occurred during speech playback:", error);
        browser.runtime.sendMessage({
          action: "speechError",
          error: error,
        });
      }
    });
    this.reader!.on("pause", () => {
      this.logger.log("Speech playback paused.");
      browser.runtime.sendMessage({ action: "speechPaused" });
    });
    this.reader!.on("resume", () => {
      this.logger.log("Speech playback resumed.");
      browser.runtime.sendMessage({ action: "speechResumed" });
    });
    this.reader!.on("stop", () => {
      this.logger.log("Speech playback stopped.");
      browser.runtime.sendMessage({ action: "speechStopped" });
    });
  }

  private handleMessage(message: any): void {
    this.logger.log("Content script received message:", message);

    const messageHandlers: Record<string, () => void> = {
      // Add a ping handler to check if content script is loaded
      // ping: () => {
      //   this.logger.log("Received ping.");
      // },
      startSpeaking: () => {
        // Extract selected text or page content
        const selectedText = window.getSelection()?.toString();
        const textToRead =
          selectedText ||
          this.extractReadableContent() ||
          document.body.innerText;

        if (textToRead) {
          this.reader!.speak(textToRead, message.options);
        }
      },
      stopSpeaking: () => this.reader!.stop(),
      pauseSpeaking: () => this.reader!.pause(),
      resumeSpeaking: () => this.reader!.resume(),
      getSpeechState: () => {
        browser.runtime.sendMessage({
          action: "updateSpeechState",
          state: {
            isSpeaking: this.reader!.isSpeaking(),
            isPaused: this.reader!.isPaused(),
          },
        });
      },
    };

    messageHandlers[message.action]?.();
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

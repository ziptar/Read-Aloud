import { Readability } from "@mozilla/readability";
import { Reader } from "./modules/reader";
import { Logger } from "./modules/logger";

class ContentScript {
  private reader: Reader | undefined;
  private logger: Logger;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger || false);
    this.init();
  }

  private init(): void {
    this.reader = new Reader({
      onSpeechStart: () => {
        this.logger.log("Speech started.");
        browser.runtime.sendMessage({ action: "speechStarted" });
      },
      onSpeechEnd: () => {
        this.logger.log("Speech ended.");
        browser.runtime.sendMessage({ action: "speechEnded" });
      },
      onSpeechError: (error) => {
        if (error === "interrupted") {
          this.logger.log("Speech was interrupted");
        } else {
          console.error("Speech error:", error);
          browser.runtime.sendMessage({
            action: "speechError",
            error: error,
          });
        }
      },
      onSpeechPause: () => {
        this.logger.log("Speech paused.");
        browser.runtime.sendMessage({ action: "speechPaused" });
      },
      onSpeechResume: () => {
        this.logger.log("Speech resumed.");
        browser.runtime.sendMessage({ action: "speechResumed" });
      },
      onSpeechStop: () => {
        this.logger.log("Speech stopped.");
        browser.runtime.sendMessage({ action: "speechStopped" });
      },
    });

    // Listen for messages from the popup or background script
    browser.runtime.onMessage.addListener((message) => {
      this.logger.log("Content script received message:", message);

      // Add a ping handler to check if content script is loaded
      if (message.action === "ping") {
        this.logger.log("Received ping.");
      }

      if (message.action === "startReading") {
        // Extract selected text or page content
        const selectedText = window.getSelection()?.toString();
        const textToRead =
          selectedText || extractReadableContent() || document.body.innerText;
        this.logger.log(textToRead);

        if (textToRead) {
          this.reader!.speak(textToRead, message.options);
        }
      } else if (message.action === "stopSpeaking") {
        this.reader!.stop();
      } else if (message.action === "pauseSpeaking") {
        this.reader!.pause();
      } else if (message.action === "resumeSpeaking") {
        this.reader!.resume();
      } else if (message.action === "getSpeechState") {
        browser.runtime.sendMessage({
          action: "updateSpeechState",
          state: {
            isSpeaking: this.reader!.isSpeaking(),
            isPaused: this.reader!.isPaused(),
          },
        });
      }
    });

    function extractReadableContent(): string | undefined {
      try {
        const doc = document.cloneNode(true) as Document;
        const reader = new Readability(doc);
        const article = reader.parse();
        return article?.textContent?.trim();
      } catch (error) {
        console.error("Error extracting readable content:", error);
      }
    }
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    new ContentScript(true);
  },
});

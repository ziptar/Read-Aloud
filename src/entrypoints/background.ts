import { SettingsManager } from "./lib/settings";
import { SpeechOptions } from "./lib/reader";
import { Logger } from "./lib/logger";

class BackgroundService {
  private speechOptions: SpeechOptions | undefined;
  private readonly CONTEXT_MENU_ID = "read-aloud-context-menu";
  private logger: Logger;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger || false);
    this.init();
    this.logger.log("Read Aloud background script loaded successfully.");
  }

  private init(): void {
    SettingsManager.enableLogger(this.logger.enabled);
    SettingsManager.loadSettings().then((settings) => {
      this.speechOptions = settings;
    });

    // --- Context Menu Setup ---
    browser.runtime.onInstalled.addListener(() => {
      browser.contextMenus.create({
        id: this.CONTEXT_MENU_ID,
        title: "Read aloud",
        contexts: ["page", "selection"],
      });
      this.logger.log("Context menu created successfully.");
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === this.CONTEXT_MENU_ID && tab?.id) {
        this.logger.log(
          "Context menu clicked. Injecting content script if needed."
        );

        // First check if we can communicate with the content script
        browser.tabs
          .sendMessage(tab.id, { action: "ping" })
          .then(() => {
            // Content script is already loaded, send the readAloud message
            this.logger.log(
              "Content script is loaded. Sending startReading message."
            );
            return browser.tabs.sendMessage(tab?.id!, {
              action: "startReading",
              options: this.speechOptions,
            });
          })
          .catch((err) => {
            // Content script is not loaded, inject it first
            this.logger.log("Content script not loaded. Injecting it now.");
            browser.scripting
              .executeScript({
                target: { tabId: tab?.id! },
                files: ["content-scripts/content.js"],
              })
              .then(() => {
                this.logger.log("Content script injected successfully.");
                this.logger.log(
                  "Sending startReading message to newly injected content script."
                );
                return browser.tabs.sendMessage(tab?.id!, {
                  action: "startReading",
                  options: this.speechOptions,
                });
              })
              .catch((err) => {
                console.error("Error communicating with content script:", err);
              });
          });
      }
    });

    // Handle messages from content scripts & popup
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "saveSettings") {
        this.logger.log(
          "Received saveSettings message with options:",
          message.options
        );
        this.speechOptions = message.options;
        SettingsManager.saveSettings(message.options);
      }
    });
  }
}

export default defineBackground(() => {
  new BackgroundService(true);
});

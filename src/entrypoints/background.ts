import {
  SettingsManager,
  TTSSettings,
  Logger,
  Message,
  MessageBus,
} from "../lib/";

class BackgroundService {
  private ttsSettings!: TTSSettings;
  private readonly CONTEXT_MENU_ID = "read-aloud-context-menu";
  private logger: Logger;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger || false);
    this.init();
    this.logger.log("Background service initialized.");
  }

  private init(): void {
    SettingsManager.enableLogger(this.logger.enabled);
    SettingsManager.loadSettings().then((settings) => {
      this.ttsSettings = settings;
    });

    // --- Context Menu Setup ---
    browser.runtime.onInstalled.addListener(() => this.createContextMenu());

    browser.contextMenus.onClicked.addListener((info, tab) =>
      this.handleContextMenuClick(info, tab)
    );

    // Handle messages from content scripts & popup
    browser.runtime.onMessage.addListener((message) =>
      this.handleMessage(message)
    );
  }

  private createContextMenu(): void {
    try {
      browser.contextMenus.create({
        id: this.CONTEXT_MENU_ID,
        title: "Read aloud",
        contexts: ["page", "selection"],
      });
      this.logger.log("Context menu for 'Read aloud' successfully registered.");
    } catch (error: any) {
      console.error(
        "Failed to register 'Read aloud' context menu: ",
        error.message
      );
    }
  }

  private async handleContextMenuClick(info: any, tab: any): Promise<any> {
    if (info.menuItemId === this.CONTEXT_MENU_ID && tab?.id) {
      this.logger.log(
        `Context menu 'Read aloud' clicked for tab ID: ${tab?.id}.`
      );

      try {
        // First check if we can communicate with the content script
        await MessageBus.sendToContent({ type: "PING", tabId: tab.id });
        // Content script is already loaded, send the readAloud message
        this.logger.log(
          "Content script is loaded. Sending SPEAK_TEXT message."
        );
        await MessageBus.sendToContent({
          type: "STOP_SPEECH",
          tabId: tab.id,
        });
        return MessageBus.sendToContent({
          type: "SPEAK_TEXT",
          payload: this.ttsSettings,
          tabId: tab.id,
        });
      } catch (error) {
        try {
          // Content script is not loaded, inject it first
          this.logger.log("Content script not loaded. Injecting it now.");
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content-scripts/content.js"],
          });
          this.logger.log("Content script injected successfully.");
          this.logger.log(
            "Sending SPEAK_TEXT message to newly injected content script."
          );

          return MessageBus.sendToContent({
            type: "SPEAK_TEXT",
            payload: this.ttsSettings,
            tabId: tab.id,
          });
        } catch (error) {
          console.error("Failed to inject content script:", error);
        }
      }
    }
  }

  private handleMessage(message: Message): void {
    //this.logger.log("Background script received message:", message);
    if (message.type === "SAVE_SETTINGS") {
      this.logger.log(
        "Received SAVE_SETTINGS message with settings:",
        message.payload
      );
      this.ttsSettings = message.payload;
      SettingsManager.saveSettings(message.payload);
    }
  }
}

export default defineBackground(() => {
  new BackgroundService(true);
});

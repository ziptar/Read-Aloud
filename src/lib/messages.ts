import { Message } from "./";

export class MessageBus {
  private static async sendMessage(
    message: Message,
    receiver: "background" | "popup" | "options" | "content-script"
  ): Promise<any> {
    try {
      if (receiver === "content-script") {
        return await browser.tabs.sendMessage(message.tabId!, message);
      }

      return await browser.runtime.sendMessage(message);
    } catch (error) {
      console.log(`Failed to send message to ${receiver}:`, error);
      throw error;
    }
  }
  static async sendToBackground(message: Message): Promise<any> {
    return this.sendMessage(message, "background");
  }

  static async sendToPopup(message: Message): Promise<any> {
    return this.sendMessage(message, "popup");
  }

  static async sendToContent(message: Message): Promise<any> {
    return this.sendMessage(message, "content-script");
  }
}

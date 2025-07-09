import { SpeechOptions } from "./reader";
import { Logger } from "./logger";

export class SettingsManager {
  private static _logger: Logger = new Logger(false);
  private static defaults: SpeechOptions = {
    voice: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: "en-US",
  };

  public static enableLogger(value: boolean) {
    this._logger.enabled = value;
  }

  static async loadSettings(): Promise<SpeechOptions> {
    try {
      const result = await browser.storage.local.get("settings");
      const settings = result.settings || this.defaults;
      this._logger.log("Settings loaded successfully.");
      return settings;
    } catch (error) {
      console.error("Failed to load settings:", error);
      console.log("Falling back to default settings.");
      return this.defaults;
    }
  }

  static saveSettings(settings: SpeechOptions) {
    browser.storage.local
      .set({ settings })
      .then(() => {
        this._logger.log("Settings saved successfully.");
      })
      .catch((error) => {
        console.error("Failed to save settings:", error);
      });
  }
}

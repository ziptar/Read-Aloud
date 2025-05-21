import { SpeechOptions } from '../modules/reader';

export class SettingsManager {
    private static defaults: SpeechOptions = {
        voice: '',
        rate: 1,
        pitch: 1,
        volume: 1,
        lang: 'en-US'
    };

    static async loadSettings(): Promise<SpeechOptions> {
        try {
            const result = await browser.storage.local.get('settings');
            const settings = result.settings || this.defaults;
            console.debug('Settings loaded successfully');
            return settings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            console.log('Falling back to default settings');
            return this.defaults;
        }
    }

    static saveSettings(settings: SpeechOptions) {
        browser.storage.local.set({ settings }).then(() => {
            console.debug('Settings saved successfully');
        }).catch(err => {
            console.error('Failed to save settings:', err);
        });
    }
}
import { SettingsManager } from "./modules/settings"

export default defineBackground(() => {
    console.log('Read Aloud background script loaded.');

    const CONTEXT_MENU_ID = 'read-aloud-context-menu';

    // --- Context Menu Setup ---
    browser.runtime.onInstalled.addListener(() => {
        browser.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: 'Read aloud',
            contexts: ['page', 'selection'],
        });
        console.log('Context menu created.');
    });

    browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === CONTEXT_MENU_ID && tab?.id) {
            console.debug('Context menu clicked. Injecting content script if needed.');

            // First check if we can communicate with the content script
            browser.tabs.sendMessage(tab.id, { action: 'ping' }).then(() => {
                // Content script is already loaded, send the readAloud message
                console.debug('Content script is loaded. Sending readAloud message.');
                return browser.tabs.sendMessage(tab.id, { action: 'readAloud' });
            }).catch(err => {
                // Content script is not loaded, inject it first
                console.debug('Content script not loaded. Injecting it now.');
                browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-scripts/content.js'] // Make sure this path matches your build output
                }).then(() => {
                    console.debug('Content script injected.');
                    console.debug('Sending readAloud message to newly injected content script.');
                    return browser.tabs.sendMessage(tab.id, { action: 'readAloud' });
                }).catch(err => {
                    console.error('Error communicating with content script:', err);
                });
            });
        }
    });

    // Handle messages from content scripts & popup
    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'saveSettings') {
            console.debug('Received saveSettings message with options:', message.options);
            SettingsManager.saveSettings(message.options);
        }
    });
});





import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    manifest: {
        name: 'Read Aloud',
        description: 'Read webpage content aloud using text-to-speech',
        permissions: [
            'activeTab',
            'tabs',
            'storage',
            'contextMenus',
            'scripting'
        ],
        host_permissions: ['<all_urls>'],
    }
});

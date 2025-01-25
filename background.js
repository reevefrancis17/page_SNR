// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && !tab.url?.startsWith('chrome://')) {
        // Inject content script and calculate SNR
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        }).then(() => {
            // Get the page text and send for SNR calculation
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.innerText
            }).then(([{result: text}]) => {
                chrome.tabs.sendMessage(tabId, {
                    action: "calculateSNR",
                    text: text
                });
            });
        });
    }
});

// Listen for SNR updates from content script
chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === "updateSNR" && sender.tab) {
        if (request.snr) {
            // Update badge with SNR value
            chrome.action.setBadgeText({
                text: request.snr,
                tabId: sender.tab.id
            });
            // Set tooltip with detailed info
            const tooltip = `SNR: ${request.snr}\n` +
                          `RLE: ${(request.debug.rleRatio * 100).toFixed(1)}%\n` +
                          `Dict: ${(request.debug.dictRatio * 100).toFixed(1)}%\n` +
                          `Freq: ${(request.debug.freqRatio * 100).toFixed(1)}%`;
            chrome.action.setTitle({
                title: tooltip,
                tabId: sender.tab.id
            });
        } else if (request.error) {
            chrome.action.setBadgeText({
                text: 'ERR',
                tabId: sender.tab.id
            });
            chrome.action.setTitle({
                title: request.error,
                tabId: sender.tab.id
            });
        }
    }
});

// Set badge background color
chrome.action.setBadgeBackgroundColor({ color: '#4a90e2' }); 
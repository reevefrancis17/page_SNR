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
            // Only update tooltip, don't change badge
            const tooltip = `SNR: ${request.snr}\n` +
                          `RLE: ${(request.debug.rleRatio * 100).toFixed(1)}%\n` +
                          `Dict: ${(request.debug.dictRatio * 100).toFixed(1)}%\n` +
                          `Freq: ${(request.debug.freqRatio * 100).toFixed(1)}%`;
            chrome.action.setTitle({
                title: tooltip,
                tabId: sender.tab.id
            });
        } else if (request.error) {
            // Only update tooltip for errors
            chrome.action.setTitle({
                title: request.error,
                tabId: sender.tab.id
            });
        }
    }
});

// Initialize badge text
chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
chrome.action.setBadgeText({ text: '0%' });

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_PERCENTAGE') {
    const percentage = message.percentage;
    chrome.action.setBadgeText({ 
      text: `${percentage}%`,
      tabId: sender.tab.id
    });
  }
}); 
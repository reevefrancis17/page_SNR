// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', function() {
    // Select button and display elements
    const getSNRButton = document.getElementById('getSNR');
    const snrDisplay = document.getElementById('snrDisplay');
  
    // Add click event listener to the button
    getSNRButton.addEventListener('click', async function() {
        try {
            // Get the current active tab
            snrDisplay.textContent = 'Getting active tab...';
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!tab) {
                snrDisplay.textContent = 'Error: No active tab';
                return;
            }

            // Check if we're on a chrome:// page
            if (tab.url.startsWith('chrome://')) {
                snrDisplay.textContent = 'Please navigate to a webpage first';
                return;
            }

            // Execute script directly to get page text
            const [{result}] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.innerText
            });

            if (!result) {
                snrDisplay.textContent = 'Error: No text found on page';
                return;
            }

            snrDisplay.textContent = 'Processing text...';

            // Now inject and run the content script for SNR calculation
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Send the collected text to content script
            chrome.tabs.sendMessage(tab.id, {
                action: "calculateSNR",
                text: result
            });

        } catch (error) {
            console.error('Error:', error);
            snrDisplay.textContent = 'Error: ' + error.message;
        }
    });
  
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(request, sender) {
        if (request.action === "updateSNR") {
            console.log('Received message:', request);
            if (request.status) {
                // Show intermediate status updates
                snrDisplay.textContent = request.status;
            } else if (request.error) {
                snrDisplay.textContent = 'Error: ' + request.error;
            } else {
                snrDisplay.textContent = request.snr;
            }
        }
    });
});

document.getElementById('compressButton').addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: "getText" });
        
        // Create debug file with raw text and metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugData = {
            timestamp: timestamp,
            url: tab.url,
            rawText: response.rawText
        };
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `SNR_DEBUG_${timestamp}.json`;
        downloadLink.click();
        
        // Continue with normal compression display
        document.getElementById('result').textContent = response.compressedText;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result').textContent = 'Error: Could not compress text';
    }
});
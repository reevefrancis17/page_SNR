// Function to clean and prepare text
function prepareText(text) {
    // Log the input
    console.log('Original text length:', text.length);
    console.log('Sample:', text.substring(0, 100));

    const cleaned = text
        .replace(/\s+/g, ' ')     // normalize whitespace
        .replace(/[^\w\s]/g, '')  // remove special characters
        .trim()                   // remove leading/trailing whitespace
        .toLowerCase();           // convert to lowercase

    // Log the cleaned text
    console.log('Cleaned text length:', cleaned.length);
    console.log('Cleaned sample:', cleaned.substring(0, 100));

    return cleaned;
}

// Different compression algorithms
function runLengthEncode(text) {
    return text.replace(/(.)\1+/g, (match, char) => char + match.length);
}

function dictionaryEncode(text) {
    const dictionary = new Map();
    const words = text.split(' ');
    let compressed = [];
    let dictSize = 0;
    
    for (const word of words) {
        if (!dictionary.has(word)) {
            dictionary.set(word, dictSize++);
        }
        compressed.push(dictionary.get(word));
    }
    
    return compressed.join(' ');
}

function characterFrequencyEncode(text) {
    const freq = {};
    for (let char of text) {
        freq[char] = (freq[char] || 0) + 1;
    }
    
    // Sort characters by frequency
    const sorted = Object.entries(freq)
        .sort(([,a], [,b]) => b - a)
        .map(([char]) => char)
        .join('');
    
    return sorted;
}

// Function to calculate SNR (signal divided by noise)
function calculateSNRValue(original, compressed) {
    // Signal is what can't be compressed (compressed length)
    const signal = compressed.length;
    // Noise is what could be compressed (original - compressed length)
    const noise = Math.max(0.1, original.length - compressed.length);  // Avoid division by zero
    return signal / noise;
}

// Function to calculate geometric mean
function geometricMean(numbers) {
    return Math.pow(numbers.reduce((a, b) => a * b), 1.0 / numbers.length);
}

// Main SNR calculation function
async function calculateSNR(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('No input text provided');
        }

        // Clean the text
        const cleanText = prepareText(text);

        if (cleanText.length === 0) {
            throw new Error('No valid text found after cleaning');
        }

        console.log('Starting SNR analysis...');

        // Calculate SNR using different methods
        const snrRatios = [];

        // Run-length encoding SNR
        const rleCompressed = runLengthEncode(cleanText);
        const rleRatio = calculateSNRValue(cleanText, rleCompressed);
        snrRatios.push(rleRatio);

        // Dictionary encoding SNR
        const dictCompressed = dictionaryEncode(cleanText);
        const dictRatio = calculateSNRValue(cleanText, dictCompressed);
        snrRatios.push(dictRatio);

        // Character frequency encoding SNR
        const freqCompressed = characterFrequencyEncode(cleanText);
        const freqRatio = calculateSNRValue(cleanText, freqCompressed);
        snrRatios.push(freqRatio);

        // Calculate geometric mean of SNR ratios
        const meanRatio = geometricMean(snrRatios);

        // Format the display value with 2 significant figures
        let snr;
        if (meanRatio < 1) {
            // Show as percentage if less than 1
            const percentage = meanRatio * 100;
            const magnitude = Math.floor(Math.log10(percentage));
            const normalized = percentage / Math.pow(10, magnitude);
            const rounded = Math.round(normalized * 10) / 10;
            snr = (rounded * Math.pow(10, magnitude)).toFixed(Math.max(0, -magnitude + 1)) + '%';
        } else {
            // Show as ratio with 2 significant figures if >= 1
            const magnitude = Math.floor(Math.log10(meanRatio));
            const normalized = meanRatio / Math.pow(10, magnitude);
            const rounded = Math.round(normalized * 10) / 10;
            snr = (rounded * Math.pow(10, magnitude)).toFixed(Math.max(0, -magnitude + 1));
        }

        // Send debug data
        const debugData = {
            originalLength: cleanText.length,
            rleRatio,
            dictRatio,
            freqRatio,
            meanRatio,
            finalSNR: snr
        };
        console.log('Debug data:', debugData);

        // Send final result
        chrome.runtime.sendMessage({
            action: "updateSNR",
            snr: snr,  // Already includes % if needed
            debug: debugData
        });

    } catch (error) {
        console.error('Error in calculateSNR:', error);
        chrome.runtime.sendMessage({
            action: "updateSNR",
            snr: 'ERR',
            debug: {
                error: error.message
            }
        });
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "calculateSNR" && request.text) {
        console.log('Received text for SNR calculation');
        calculateSNR(request.text);
    }
    if (request.action === "getText") {
        const text = document.body.innerText;
        sendResponse({
            rawText: text,  // Send the raw text for debugging
            compressedText: compressText(text)
        });
    }
    return true;
});

// Function to handle text selection
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        // Calculate SNR for selected text
        calculateSNR(selectedText);
    } else {
        // If no text is selected, revert to full page calculation
        calculateSNRForFullPage();
    }
}

// Calculate SNR for full page
function calculateSNRForFullPage() {
    const allText = document.body.innerText;
    if (allText.trim()) {
        calculateSNR(allText);
    }
}

// Add selection event listener
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', (e) => {
    // Check for selection keyboard events (shift + arrow keys)
    if (e.shiftKey && (e.key.includes('Arrow') || e.key === 'Home' || e.key === 'End')) {
        handleTextSelection();
    }
});

// Call when page loads
window.addEventListener('load', calculateSNRForFullPage);

// Also call when page content changes (but not on selection changes)
const observer = new MutationObserver((mutations) => {
    // Only recalculate if no text is currently selected
    if (!window.getSelection().toString().trim()) {
        calculateSNRForFullPage();
    }
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true 
});
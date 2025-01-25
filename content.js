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

// Function to calculate compression ratio
function getCompressionRatio(original, compressed) {
    return compressed.length / original.length;
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

        console.log('Starting compression analysis...');

        // Apply different compression algorithms
        const compressionRatios = [];

        // Run-length encoding
        const rleCompressed = runLengthEncode(cleanText);
        const rleRatio = getCompressionRatio(cleanText, rleCompressed);
        compressionRatios.push(rleRatio);

        // Dictionary encoding
        const dictCompressed = dictionaryEncode(cleanText);
        const dictRatio = getCompressionRatio(cleanText, dictCompressed);
        compressionRatios.push(dictRatio);

        // Character frequency encoding
        const freqCompressed = characterFrequencyEncode(cleanText);
        const freqRatio = getCompressionRatio(cleanText, freqCompressed);
        compressionRatios.push(freqRatio);

        // Calculate geometric mean of compression ratios
        const meanRatio = geometricMean(compressionRatios);

        // Convert to percentage with appropriate decimal places
        const snrValue = Math.max(0.1, Math.min(100, meanRatio * 100));
        let snr;
        if (snrValue < 1) {
            // For values less than 1%, show one decimal place
            snr = snrValue.toFixed(1);
        } else {
            // For values 1% and above, round to whole number
            snr = Math.round(snrValue).toString();
        }

        // Send debug data with the exact same SNR value
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
            snr: snr + '%',
            debug: debugData
        });

    } catch (error) {
        console.error('Error in calculateSNR:', error);
        // Only now do we default to 100% for errors
        chrome.runtime.sendMessage({
            action: "updateSNR",
            snr: '100%',
            debug: {
                rleRatio: 1,
                dictRatio: 1,
                freqRatio: 1,
                meanRatio: 1,
                finalSNR: '100',
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
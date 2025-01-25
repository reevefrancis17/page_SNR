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
        if (!text) {
            throw new Error('No input text provided');
        }

        // Clean the text
        chrome.runtime.sendMessage({
            action: "updateSNR",
            status: "Cleaning text..."
        });
        
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
        console.log('RLE compression ratio:', rleRatio);

        // Dictionary encoding
        const dictCompressed = dictionaryEncode(cleanText);
        const dictRatio = getCompressionRatio(cleanText, dictCompressed);
        compressionRatios.push(dictRatio);
        console.log('Dictionary compression ratio:', dictRatio);

        // Character frequency encoding
        const freqCompressed = characterFrequencyEncode(cleanText);
        const freqRatio = getCompressionRatio(cleanText, freqCompressed);
        compressionRatios.push(freqRatio);
        console.log('Frequency compression ratio:', freqRatio);

        // Calculate geometric mean of compression ratios
        const meanRatio = geometricMean(compressionRatios);
        console.log('Geometric mean of compression ratios:', meanRatio);

        // Convert to percentage with one decimal place
        const snr = (meanRatio * 100).toFixed(1);
        console.log('Final SNR:', snr);

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
            snr: snr + '%',
            debug: debugData
        });

    } catch (error) {
        console.error('Error in calculateSNR:', error);
        chrome.runtime.sendMessage({
            action: "updateSNR",
            error: error.message
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

function calculateAndSendPercentage() {
  const allText = document.body.innerText;
  const words = allText.trim().split(/\s+/);
  const totalWords = words.length;
  
  // Calculate what percentage of words are read (you can adjust this logic)
  const readWords = Math.floor(Math.random() * totalWords); // This is a placeholder
  const percentage = Math.min(Math.floor((readWords / totalWords) * 100), 100);
  
  // Send percentage to background script
  chrome.runtime.sendMessage({
    type: 'UPDATE_PERCENTAGE',
    percentage: percentage
  });
}

// Call when page loads
window.addEventListener('load', calculateAndSendPercentage);

// Also call when page content changes
const observer = new MutationObserver(calculateAndSendPercentage);
observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
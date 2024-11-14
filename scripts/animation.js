import wahVis from '../scripts/wahVisualization/wahVis.js';
import { wahCompress } from '../scripts/compression/raw_compression/wah.js';
import { valCompress, getValSegmentLength } from './compression/raw_compression/val.js';
import { getStoredCompressionSettings } from './storage.js';

// get settings and input from local
const savedSettings = getStoredCompressionSettings();
const savedInputData = localStorage.getItem('inputData');



// Check if the settings and input data are valid
if ((savedSettings.compressionMethod !== 'wah' && savedSettings.compressionMethod !== 'val') || savedSettings.wordSize == 64) {
    document.getElementById('VisTitle').innerHTML = 'Please choose either WAH or VAL with a word size of 8 - 32.';
} else if (!savedInputData || savedInputData.length == 0) {
    document.getElementById('VisTitle').innerHTML = 'Please go to live view and input your uncompressed bits';
} else {
    // Now you can use the wahVis class in this file

    let states;

    switch (savedSettings.compressionMethod) {
        case 'wah':
            states = wahCompress(savedInputData, savedSettings.wordSize, true)
            break;
        case 'val':
            states = valCompress(savedInputData, savedSettings.wordSize, savedSettings.numSegments, true)
            break;
    }

    //console.log(states)

    const canvasId = 'animationCanvas';
    const compressedContentId = 'compressedContent';

    const wordSize = savedSettings.wordSize;
    let litSize = wordSize - 1;
    let numSegments = 1;

    if (savedSettings.compressionMethod === 'val') {
        litSize = getValSegmentLength(wordSize, savedSettings.numSegments);
        numSegments = savedSettings.numSegments;
    }

   // old test const uncompressed = '010100100000000000000000000011111111111111111111111111111110101';

    const wahVisualizer = new wahVis(canvasId, compressedContentId, states, wordSize, litSize, numSegments, savedInputData);

    // Function to scroll to the end of the compressed content
    function scrollToEnd() {
        const compressedContent = document.getElementById('compressedContent');
        // Force a reflow to ensure content width is calculated correctly
        compressedContent.style.display = 'none';
        compressedContent.offsetHeight; // Force reflow
        compressedContent.style.display = 'block';
        
        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
            compressedContent.scrollTo({
                left: compressedContent.scrollWidth,
                behavior: 'smooth'
            });
        });
    }

    // Add event listeners for buttons
    document.getElementById('next-step').addEventListener('click', function() {
        wahVisualizer.transitionNext();
        setTimeout(scrollToEnd, 600); // Increased delay
    });
    document.getElementById('micro-step').addEventListener('click', function() {
        wahVisualizer.transitionMicro();
        setTimeout(scrollToEnd, 500); // Increased delay
    });
    document.getElementById('back-step').addEventListener('click', function() {
        wahVisualizer.stepBack();
        
    });
    document.getElementById('reset-btn').addEventListener('click', function() {
        wahVisualizer.reset();
        
    });
}
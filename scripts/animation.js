import wahVis from '../scripts/wahVisualization/wahVis.js';
import bbcVis from './bbcVisualization/bbcVis.js';
import { wahCompress } from '../scripts/compression/wah.js';
import { valCompress, getValSegmentLength } from './compression/val.js';
import { bbcCompress } from './compression/bbc.js';
import { plwahCompress } from './compression/plwah.js';
import { AnimSettingsManager } from './AnimSettingsManager.js'

const compressedContent = document.getElementById('compressedContent');
const inputField = document.getElementById('input-data');
const outputField = document.getElementById('compressed-output');
const darkModeToggle = document.getElementById('dark-mode-toggle');

function compress(inputBitstring, settings, getStates) {
    switch (settings.compressionMethod) {
        case 'wah':
            if (getStates)
                return wahCompress(inputBitstring, settings.wordSize, true);
            else
                return wahCompress(inputBitstring, settings.wordSize).str;
        case 'val':
            if (getStates)
                return valCompress(inputBitstring, settings.wordSize, settings.numSegments, true);
            else
                return valCompress(inputBitstring, settings.wordSize, settings.numSegments).str;
        case 'plwah':
            if (getStates)
                return plwahCompress(inputBitstring, settings.wordSize, true);
            else
                return plwahCompress(inputBitstring, settings.wordSize).str;
        case 'bbc':
            if (getStates)
                return bbcCompress(inputBitstring, true);
            else
                return bbcCompress(inputBitstring);
    }
}

// Function to scroll to the end of the compressed content
function scrollToEnd() {
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

class AnimationControls {
    constructor() {
        // define buttons to control animations and their actions
        this.nextStepButton = document.getElementById('next-step');
        this.microStepButton = document.getElementById('micro-step');
        this.backStepButton = document.getElementById('back-step');
        this.resetButton = document.getElementById('reset-btn');

        this.nextStepFunction = null;
        this.microStepFunction = null;
        this.backStepFunction = null;
        this.resetFunction = null;
    }

    
    setClickAction(visualizer) {
        // remove old event listeners for buttons
        if (this.nextStepFunction) this.nextStepButton.removeEventListener('click', this.nextStepFunction);
        if (this.microStepFunction) this.microStepButton.removeEventListener('click', this.microStepFunction);
        if (this.backStepFunction) this.backStepButton.removeEventListener('click', this.backStepFunction);
        if (this.resetFunction) this.resetButton.removeEventListener('click', this.resetFunction);

        this.nextStepFunction = function() {
            visualizer.transitionNext();
            setTimeout(scrollToEnd, 600); // Increased delay
        }
        this.microStepFunction = function() {
            visualizer.transitionMicro();
            setTimeout(scrollToEnd, 500); // Increased delay
        }
        this.backStepFunction = function() {
            visualizer.stepBack();
        }
        this.resetFunction = function() {
            visualizer.reset();
        }

        // Add event listeners for buttons
        this.nextStepButton.addEventListener('click', this.nextStepFunction);
        this.microStepButton.addEventListener('click', this.microStepFunction);
        this.backStepButton.addEventListener('click', this.backStepFunction);
        this.resetButton.addEventListener('click', this.resetFunction);
    }
}

const animationControls = new AnimationControls();
let redrawCanvas = null;

function initAnimation(inputBitstring, settings) {
    // If the input is empty, tell the user to add more input
    if (inputBitstring.length == 0) {
        document.getElementById('animationContainer').classList.add('d-none');
        document.getElementById('animationInstructionContainer').classList.remove('d-none');
        return;
    }
    document.getElementById('animationContainer').classList.remove('d-none');
    document.getElementById('animationInstructionContainer').classList.add('d-none');

    // Now you can use the wahVis class in this file
    let states = compress(inputBitstring, settings, true);
    const canvasId = 'animationCanvas';
    const compressedContentId = 'compressedContent';
    const stepDescriptionId = 'stepDescription';

    const wordSize = settings.wordSize;
    let litSize = wordSize - 1;
    let numSegments = 1;
    let dirtySegmentBits = 0;

    if (settings.compressionMethod === 'val') {
        litSize = getValSegmentLength(wordSize, settings.numSegments);
        numSegments = settings.numSegments;
    }
    else if (settings.compressionMethod === 'plwah') {
        dirtySegmentBits =  Math.log2(wordSize);
    }

    // old test const uncompressed = '010100100000000000000000000011111111111111111111111111111110101';
    let visualizer;
    if (settings.compressionMethod === "bbc"){
        visualizer = new bbcVis(canvasId, compressedContentId, stepDescriptionId, inputBitstring);
    }
    else{
        visualizer = new wahVis(canvasId, compressedContentId, stepDescriptionId, states, wordSize, litSize, numSegments, inputBitstring, dirtySegmentBits);
    }

    animationControls.setClickAction(visualizer);

    if (redrawCanvas != null) {
        darkModeToggle.removeEventListener('click', redrawCanvas); 
    }
    redrawCanvas = visualizer.redrawCanvas.bind(visualizer);
    darkModeToggle.addEventListener('click', redrawCanvas);
}


function removeSpaces(input) {
    if (input) input = input = input.replace(/[^01]/g, '');
    return input;
}

function addSpacesToInput(input, settings) {
    switch(settings.compressionMethod) {
        case 'bbc':
            input = input.match(/.{1,8}/g)?.join(' ') || input;
            break;
        case 'wah':
        case 'val':
        case 'plwah':
            input = input.match(new RegExp(`.{1,${settings.wordSize-1}}`, 'g'))?.join(' ') 
                || input;
            break;
    }
    return input;
}

function addSpacesToOutput(compressedString, settings) {
    let output = compressedString;
    switch (settings.compressionMethod) {
        case 'bbc':
            output = output.match(/.{1,8}/g)?.join(' ') || output; // Regex optional
            break;
        case 'wah':
        case 'plwah':
        case 'val':
            output = output.match(new RegExp(`.{1,${settings.wordSize}}`, 'g'))?.join(' ') || output;
            break;
    }
    return output;
}

function initInputField() {
    // set up input event
    inputField.addEventListener('input', event => {
        // ensure only 1 and 0 are entered
        event.target.value = event.target.value.replace(/[^01]/g, '');
        localStorage.setItem('inputBitstring', event.target.value);
        const input = removeSpaces(inputField.value);
        const settings = animSettings.getSettings();
        updateOutputField(removeSpaces(input), settings);
        initAnimation(removeSpaces(input), settings);
        inputField.value = addSpacesToInput(input, settings);
    });

    // load cached input
    const savedInputData = localStorage.getItem('inputBitstring');
    if (savedInputData !== null) {
        inputField.value = savedInputData
    }
    else {
        inputField.value = "";
    }
 
    // add spaces
    inputField.value = addSpacesToInput(removeSpaces(inputField.value), animSettings.getSettings());
}

function updateOutputField(input, settings) {
    let compressedString = compress(input, settings, false);
    outputField.value = addSpacesToOutput(compressedString, settings);
}

function onSettingChange() {
    const settings = animSettings.getSettings();
    let input = removeSpaces(inputField.value);
    updateOutputField(input, settings);
    initAnimation(input, settings);
    inputField.value = addSpacesToInput(removeSpaces(inputField.value), settings);
}



let animSettings = new AnimSettingsManager(onSettingChange);
initInputField();
onSettingChange();

import { getValSegmentLength } from '../compression/val.js';
import { simplifyString, decimalToBinary, drawArrow, insertSpaceEveryNChars, updateStartIndices, easeInOutQuad } from './helperFunctions.js';
import { numberToPlaceString } from '../visualization_common.js';

class wahVis {
    constructor(canvasId, compressedContentId, stepDescriptionId, states, wordSize, litSize, numSegments, uncompressed, dirtySegmentBits) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.compressedContentElement = document.getElementById(compressedContentId);

        this.stepDescriptionElement = document.getElementById(stepDescriptionId);
        this.states = updateStartIndices(states, litSize);

        this.wordSize = wordSize;
        this.litSize = litSize;
        this.numSegments = numSegments;
        this.dirtySegmentBits = dirtySegmentBits;
        this.segmentLength = getValSegmentLength(wordSize, numSegments);

        this.currentStateIndex = 0;
        this.currRunShown = states[this.currentStateIndex].runs;

        this.uncompressed = insertSpaceEveryNChars(uncompressed, litSize);

        // Canvas setup
        const canvasWidth = 600;
        const canvasHeight = 300;
        const dpr = 1.5;
        this.canvas.width = canvasWidth * dpr;
        this.canvas.height = canvasHeight * dpr;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        this.ctx.scale(dpr, dpr);

        // set the text color based on if we are in dark mode
        this.textColor = getComputedStyle(document.body)
                            .getPropertyValue('--text')
                            .trim();

        // Initial draw
        this.drawCanvas(this.currentStateIndex);
        this.updateCompressedSoFar();
    }

    redrawCanvas() {
        this.textColor = getComputedStyle(document.body)
                            .getPropertyValue('--text')
                            .trim();
        this.drawCanvas(this.currentStateIndex);
    }

    drawCanvas(stateIndex, transition = 0, curr_run = this.states[stateIndex].runs) {
        this.updateDescription(stateIndex, curr_run);

        const state = this.states[stateIndex];

        const ctx = this.ctx;
        const canvasWidth = 600;
        const canvasHeight = 300;
        
        // clears the screen
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
        // font nees to be set up here for calculations
        ctx.font = `30px monospace`;
        ctx.fillStyle = this.textColor;
    
        
        const uncompressedDigitWidth = ctx.measureText("0").width;
        const start_point = - (transition * (this.litSize + 1) * uncompressedDigitWidth);

        // Calculate the number of digits that can fit in the canvas width
        const canFit = Math.ceil(canvasWidth / uncompressedDigitWidth);
        let current_uncompressed;
    
        
        // get the highlight in the middle
        const highlightStartDigit = Math.floor(Math.floor(canvasWidth/uncompressedDigitWidth)/2) - Math.floor(this.litSize / 2)
        let highlightWidth = this.litSize * uncompressedDigitWidth;
        let highlightStart = highlightStartDigit  * uncompressedDigitWidth;
        
        let uncompressedStartIndex = state.startIndex;
        uncompressedStartIndex += curr_run === 0 ? 0 : (curr_run - 1) * this.litSize + (curr_run - 1);
        // first if we dont have enough digits before start then fill with spaces
        if (state.runs > 1 && curr_run == state.runs) {    // here we simplify the runs displayed
    
            // the simplifyString function turns a bunch of runs into 11..11
            let simplifiedString = simplifyString(state.runType, this.litSize);


            const new_start = state.startIndex + this.litSize * state.runs +state.runs - 1 ;

            current_uncompressed = simplifiedString + this.uncompressed.substring(new_start, new_start + canFit);
        } else {
            
            current_uncompressed = this.uncompressed.substring(uncompressedStartIndex, uncompressedStartIndex + canFit + this.litSize);
        }

        // get the functional start index
        const startIndex = (state.runs > 1 && curr_run == state.runs) ? state.startIndex : uncompressedStartIndex;

        // generate fill string to fill up space upto highlight
        
        let fillString;
        // we dont have enough in uncompressed before
        if (startIndex < highlightStartDigit){
            const spaces_needed = highlightStartDigit - startIndex;
            fillString = " ".repeat(spaces_needed) + this.uncompressed.substring(0, startIndex)
        } else { // fill with chars before the start index
            fillString = this.uncompressed.substring(startIndex - highlightStartDigit, startIndex)
        }

        current_uncompressed = fillString + current_uncompressed



        ctx.fillText(current_uncompressed, start_point, 60);
    
        // Highlight around current step
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(highlightStart, 30, highlightWidth, 40);
        
        let top_text;
        if(state.dirtyPos){
            top_text = `Dirty Bit Location: ${state.dirtyPos}`
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(highlightStart + (state.dirtyPos-1) * uncompressedDigitWidth, 30, uncompressedDigitWidth, 40);
        }else if (state.runs >0){
            top_text = `${curr_run} runs of ${state.runType}'s`
        } else{
            top_text = 'Literal'
        }
        
        // Subtext
        ctx.font = `22px Arial`;
        ctx.fillStyle = this.textColor;
        
        ctx.fillText(top_text, 20, 100);
    
        // Compressed Display

        // consts for positioning stuff

        // Get font size for the compresssed text
        let compressedFontSize;
        let compresedH;
        switch (this.wordSize) {
            case 8:
            compressedFontSize = 90;
            compresedH = 200;
            break;
            case 16:
            compressedFontSize = 60;
            compresedH = 190;
            break;
            case 32:
            compressedFontSize = 30;
            compresedH = 180;
            break;
            default:
            compressedFontSize = 20; // Default value if wordSize is not 8, 16, or 32
        }

           //vertical position of main compressed text
        const gap = 3;                      //gap between underlines of difference sections
        const runsTextSize = 25;

        const underlineH = compresedH + 10
        const textH = 270

        

        const runColor = "red";
        const runTypeColor = "blue";
        const dirtyBitColor = "green"
        const litColor = this.textColor
        

        //generate the compressed bit for micro steps
        let compressed = this.makeCompressedForMicroStep(stateIndex, curr_run);
    
        //main compressed bit area
        ctx.font = `bold ${compressedFontSize}px monospace`;
        ctx.fillStyle = this.textColor;
        ctx.fillText(compressed, 0, compresedH);
    
        // these calculations need to happen after the font size is set.
        const compressedWidth = ctx.measureText(compressed).width;
        const bitWidth = compressedWidth / compressed.length;
        
        const segmentIndex = stateIndex % this.numSegments;
        const segmentWidth = this.segmentLength * bitWidth;
        const dirtySegmentWidth =  this.dirtySegmentBits * bitWidth;
        const headerOffset = segmentIndex * bitWidth;
        const segmentOffset = segmentIndex * segmentWidth + this.numSegments * bitWidth ;
        const dirtyBitOffset = this.dirtySegmentBits !=0 ? 100 : 0;


        if (state.runs > 0 || state.dirtyPos)  {
            // Underline first bit
            ctx.strokeStyle = runColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(headerOffset + gap, underlineH);
            ctx.lineTo(headerOffset + bitWidth - gap, underlineH);
            ctx.stroke();
            ctx.font = `bold ${runsTextSize}px Arial`;
            ctx.fillStyle = runColor;
            
            const firstBitText = "run";
            ctx.fillText(firstBitText, gap, textH);

            //  draw arrow
            const middleFirstText = ctx.measureText(firstBitText).width / 2;
            

            drawArrow(ctx, gap + middleFirstText, textH-15, headerOffset + bitWidth/2, underlineH+5, 10);
    
            // Underline second bit
            ctx.strokeStyle = runTypeColor;
            ctx.fillStyle = runTypeColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(segmentOffset + gap, underlineH);
            ctx.lineTo(segmentOffset + bitWidth - gap, underlineH);
            ctx.stroke();

            const secondBitText = state.dirtyPos ? `of ${ this.states[stateIndex-1].runType}'s` :`of ${state.runType}'s`;

            ctx.fillText(secondBitText, 60, textH);

            const middleSecondText = ctx.measureText(secondBitText).width / 2;

            drawArrow(ctx, 60 + middleSecondText, textH - 20, segmentOffset + bitWidth/2 - gap, underlineH+5, 10);

            
            if(this.dirtySegmentBits){
                ctx.strokeStyle = dirtyBitColor;
                ctx.fillStyle = dirtyBitColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(segmentOffset + bitWidth + gap , underlineH);
                ctx.lineTo(segmentOffset + dirtySegmentWidth + bitWidth - gap, underlineH);
                ctx.stroke();

                const dirtyBitText = `dirty bit location`;
                ctx.fillText(dirtyBitText, 140, textH);
                
                const middleDirtyBitText = ctx.measureText(dirtyBitText).width / 2;
                drawArrow(ctx, 140 + middleDirtyBitText, textH-20, segmentOffset + bitWidth+ dirtySegmentWidth/2 , underlineH+5, 10);
            }

            // Underline rest of the string
            ctx.strokeStyle = litColor;
            ctx.fillStyle = litColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(segmentOffset + bitWidth + dirtySegmentWidth + gap, underlineH);
            ctx.lineTo(segmentOffset + segmentWidth - gap, underlineH);
            ctx.stroke();

            const runs = state.dirtyPos ? this.states[stateIndex - 1].runs : curr_run;
            const restText = `${runs} ${runs === 1 ? 'time' : 'times'}`;
            ctx.fillText(restText, 260+dirtyBitOffset, textH);

            const middleRestText = ctx.measureText(restText).width / 2;
            drawArrow(ctx, 260 + middleRestText + dirtyBitOffset, textH-20, segmentOffset + bitWidth +dirtySegmentWidth+ (segmentWidth -dirtySegmentWidth - bitWidth) / 2, underlineH+5, 10);
    
        } else {
            // Literal
            ctx.strokeStyle = litColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(segmentOffset + gap, underlineH);
            ctx.lineTo(segmentOffset + segmentWidth - gap, underlineH);
            ctx.stroke();
            ctx.font = `bold ${runsTextSize}px Arial`;
            ctx.fillStyle = litColor;
            ctx.fillText(`literal`, segmentOffset + gap * 2, underlineH + 30);
        }
    
        // Add small text in the bottom right that says current word we are on
        ctx.font = `bold 20px Arial`;
        ctx.fillStyle = this.textColor;
        const numDirtySegments = this.states.slice(0, this.currentStateIndex+1).filter(x => x.dirtyPos).length; 
        ctx.fillText(`word : ${Math.ceil((this.currentStateIndex + 1) / this.numSegments) - numDirtySegments}`, canvasWidth - 100, canvasHeight - 10);
    }

    updateDescription(stateIndex, curr_run) {
        const state = this.states[stateIndex];
        const currentSegmentIndex = stateIndex % this.numSegments;

        let segmentDescription = "";

        if (this.numSegments != 1) {
            const place = numberToPlaceString(currentSegmentIndex + 1);
            segmentDescription = ` in the ${place} segment`;

            if (currentSegmentIndex == 0) {
                segmentDescription += " of a new word";
            } else {
                segmentDescription += " of the same word";
            }
        }

        let runDescription = "";

        if (state.runs != curr_run) {
            runDescription = `${curr_run} out of ${state.runs}`;
        } else {
            runDescription = `${state.runs}`;
        }

        if (state.dirtyPos){
            this.stepDescriptionElement.innerText = `Adding dirty bit location ${state.dirtyPos} to the compressed output${segmentDescription}.`;
        }
        else if (state.runs === 0) {
            this.stepDescriptionElement.innerText = `Adding a literal to the compressed output${segmentDescription}.`;
        }else {
            this.stepDescriptionElement.innerText = `Compressing ${runDescription} run${state.runs > 1 ? "s" : ""} of ${state.runType}s${segmentDescription}.`;
        }
    }

    makeCompressedForMicroStep(stateIndex, curr_run) {
        const state = this.states[stateIndex];

        if (state.runs == 0) {
            return state.compressed;
        }

        const currentSegmentIndex = stateIndex % this.numSegments;

        const segmentStart = this.numSegments + this.litSize * currentSegmentIndex; 

        const prefix = state.compressed.slice(0, segmentStart + 1);
        const runCount = decimalToBinary(curr_run, this.litSize - 1);
        const postfix = state.compressed.slice(segmentStart + this.litSize);

        return prefix + runCount + postfix;
    }
    
    isIndexIncludedInCompressed(index) {
        return (this.states[index].dirtyPos) ? false : (index % this.numSegments == this.numSegments - 1);
    }

    updateCompressedSoFar(lastElement = false) {
        // Initialize compressedSoFar if not already done
        if (this.compressedSoFar === undefined) {
            this.compressedSoFar = "";
            this.prevStateIndex = 0;
        }
    
        // Determine the number of states to consider
        const numOfStates = lastElement ? this.currentStateIndex + 1 : this.currentStateIndex;
    
        if (numOfStates > this.prevStateIndex) {
            // Moving forward, append new compressed code
            for (let i = this.prevStateIndex; i < numOfStates; i++) {
                if (this.isIndexIncludedInCompressed(i)) {
                    this.compressedSoFar += this.states[i].compressed + " ";
                }
            }
        } else if (numOfStates < this.prevStateIndex) {
            // Moving backward, remove compressed code
            for (let i = numOfStates; i < this.prevStateIndex; i++) {
                if (this.isIndexIncludedInCompressed(i)) {
                    const lengthToRemove = this.states[i].compressed.length + 1;
                    this.compressedSoFar = this.compressedSoFar.slice(0, -lengthToRemove);
                }
            }
        }
    
        // Update previous state index
        this.prevStateIndex = numOfStates;
    
        // Update the compressed content display
        this.compressedContentElement.innerText = this.compressedSoFar;
    }

    // transition to the next compressed word or to the end of current one
    transitionNext() {
        const fromStateIndex = this.currentStateIndex;
        const fromState = this.states[fromStateIndex];
        const fromRun = this.currRunShown;
        
        // if we are on the last state, and showing all the runs.
        if (this.currentStateIndex >= this.states.length - 1 && this.currRunShown == fromState.runs) {
            this.updateCompressedSoFar(true);
            return;
        }
        let totalMicroSteps = 1;
        let targetStateIndex = this.currentStateIndex;
        let targetRun = this.currRunShown;

        // If currently on a literal and the next state is a run, micro step through to the end of that run
        if (fromState.runs === 0 && this.currentStateIndex < this.states.length - 1 && this.states[this.currentStateIndex + 1].runs > 0) {
            const nextState = this.states[this.currentStateIndex + 1];
            totalMicroSteps = nextState.runs;
            targetStateIndex = this.currentStateIndex + 1;
            targetRun = nextState.runs;
        }

        // if we are in the middle of a run state
        else if (this.currRunShown != fromState.runs) { 
            totalMicroSteps = fromState.runs - this.currRunShown;
            targetRun = fromState.runs;

        // if we are at the end of a state
        } else if (this.currentStateIndex < this.states.length - 1) {
            const nextState = this.states[this.currentStateIndex + 1];
            if (nextState.runs > 0) { // next state is also a run
                totalMicroSteps = nextState.runs;
            }
            targetStateIndex++;
            targetRun = this.states[targetStateIndex].runs;
        }

        requestAnimationFrame(this.animate(fromStateIndex, fromRun, performance.now(), totalMicroSteps, targetStateIndex, targetRun).bind(this));
    }

    // transition to the next micro step eg.. one more run of current word
    transitionMicro() {
        const fromStateIndex = this.currentStateIndex;
        const fromState = this.states[fromStateIndex];
        const fromRun = this.currRunShown;

        // if we are at the last state already
        if (this.currentStateIndex >= this.states.length - 1 && this.currRunShown >= fromState.runs) {
            this.updateCompressedSoFar(true);
            return;
        }

        //if we are coming from a literal or end of run
        if (fromState.runs === 0 || this.currRunShown === fromState.runs) {
            this.currentStateIndex++;
            if (this.states[this.currentStateIndex].runs == 0){
                //current state is a literal
                this.currRunShown = 0;
            } else {
                //current state is a run
                this.currRunShown = 1;
            }
            
        } else { // otherwise just increment the run shown
            this.currRunShown++;
        }

        requestAnimationFrame(this.animate(fromStateIndex, fromRun, performance.now(), 1, this.currentStateIndex, this.currRunShown).bind(this));
    }

    // if we are in the middle of a state, or at the end we step back to the beginning
    stepBack() {    
        const fromState = this.states[this.currentStateIndex];
        const fromRun = this.currRunShown;

        if ((this.currentStateIndex === 0 && fromState.runs === 0) || (this.currentStateIndex === 0 && fromRun === 1)) {
            return; // we are at the first step
        }

        // if the state was a literal or we were on the first run
        if (fromState.runs === 0 || fromRun === 1) {
            this.currentStateIndex--;
            this.currRunShown = this.states[this.currentStateIndex].runs;
        } else {
            this.currRunShown = 1;
        }

        this.drawCanvas(this.currentStateIndex, 0, this.currRunShown);
        this.updateCompressedSoFar();
    }

    // reset to the beginning
    reset() {
        
        this.currentStateIndex = 0;
        this.currRunShown = this.states[this.currentStateIndex].runs;
        this.compressedContentElement.innerText = '';
        this.drawCanvas(this.currentStateIndex);
        this.updateCompressedSoFar();
    }

    // animate between states.
    animate(fromStateIndex, fromRun, startTime, totalMicroSteps, targetStateIndex, targetRun) {
        return (currentTime) => {
            const elapsed = currentTime - startTime;
            const duration = 700 + (totalMicroSteps - 1) * 50; // Base duration of 700ms, plus 50ms for each additional micro step
            const progress = Math.min(elapsed / duration, 1);

            const easedProgress = easeInOutQuad(progress);

            const microStepProgress = easedProgress * totalMicroSteps;
            const currentMicroStep = Math.floor(microStepProgress);
            const microStepFraction = microStepProgress - currentMicroStep;

            let stateIndex = fromStateIndex;
            let run = fromRun + currentMicroStep;

            // Adjust stateIndex and run if transitioning to the next state
            while (stateIndex < this.states.length && run > this.states[stateIndex].runs) {
                run -= this.states[stateIndex].runs;
                stateIndex++;
            }

            // Ensure stateIndex does not exceed the length of states array
            if (stateIndex >= this.states.length) {
                stateIndex = this.states.length - 1;
                run = this.states[stateIndex].runs;
            }

            this.drawCanvas(stateIndex, microStepFraction, run);

            if (progress < 1) {
                requestAnimationFrame(this.animate(fromStateIndex, fromRun, startTime, totalMicroSteps, targetStateIndex, targetRun).bind(this));
            } else {
                this.currentStateIndex = targetStateIndex;
                this.currRunShown = targetRun;
                this.drawCanvas(this.currentStateIndex, 0, this.currRunShown);
                this.updateCompressedSoFar();
            }
        };
    }
}

export default wahVis;

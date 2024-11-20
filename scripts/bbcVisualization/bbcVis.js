import { bbcCompress } from "../compression/raw_compression/bbc.js";

// Easing function (ease-in-out)
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

class bbcVis {
    constructor(canvasId, compressedContentId, uncompressed) {
        // Get canvas and context
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Get the output compressed content element
        this.outputText = document.getElementById(compressedContentId);

        // Get uncompressed bits and states
        this.uncompressed = uncompressed.match(/.{1,8}/g) || uncompressed;
        this.states = bbcCompress(uncompressed, true);
        console.log(this.states)
        
        // Keep track of the current state and step
        this.currentStateIndex = 0;
        this.stateStep = 1;

        // Canvas setup
        const canvasWidth = 600;
        const canvasHeight = 300;
        const dpr = 1.5;
        this.canvas.width = canvasWidth * dpr;
        this.canvas.height = canvasHeight * dpr;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        this.ctx.scale(dpr, dpr);

        // Initial draw
        this.drawCanvas(this.states[0]);
    }

    drawCanvas(state, transition = 0, curr_run = 1) {
        
        // Get context, clear canvas
        const ctx = this.ctx;
        const canvasWidth = 600;
        const canvasHeight = 300;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Uncompressed Bits Display
        {   
            // Configure font and get bit width
            ctx.font = `30px monospace`;
            ctx.fillStyle = 'black';
            const bitWidth = ctx.measureText("0").width;

            // Dynamic start point based on transition (animation)
            const start_point = 5 - (transition * 9 * bitWidth);

            // If at the end of run counting, compress the run bytes
            let current_uncompressed;
            if (state.runs > 1 && curr_run == state.runs) {
                current_uncompressed = "00....00 " + this.uncompressed.slice(state.startChunk + curr_run).join(" ");
            } 
            // Otherwise, display current word and future words, joined by spaces
            else {
                current_uncompressed = this.uncompressed.slice(state.startChunk + curr_run - 1).join(" ");
            }
            ctx.fillText(current_uncompressed, start_point, 60);
        
            // Highlight around current step
            let highlightWidth = 8 * bitWidth;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(5, 30, highlightWidth, 40);

            // If we're in a special word, highlight the dirty bit
            if(curr_run > state.runs && state.special){
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                let dbLoc = this.uncompressed[state.startChunk + curr_run - 1].indexOf("1");
                ctx.fillRect(5 + (dbLoc) * bitWidth, 30, bitWidth, 40);
            }
        }

        // Subtext (beneath uncompressed bits)
        {
            // Configure font and display text
            ctx.font = `22px Arial`;
            ctx.fillStyle = 'black';

            // Display the number of runs (default)
            let runCount = curr_run + Math.floor(transition);
            let top_text = `${runCount} run${runCount > 1 ? 's' : ''} of 0's`;
            
            // If we're not in a run...
            if (curr_run > state.runs) {

                // If we're in a special word, display the dirty bit location
                if (state.special && curr_run == state.runs + 1) {
                    let word = this.uncompressed[state.startChunk + curr_run - 1];
                    top_text = `Dirty Bit Location: ${word.indexOf(1)}`;
                }

                // Otherwise, display the number of literals
                else {
                    top_text = `Number of literals: ${curr_run - state.runs + Math.floor(transition)}`;
                }
            }

            // Display the text
            ctx.fillText(top_text, 20, 100);
        }
    
        // Compressed Test Display
        {   
            let compressed;
            if (curr_run > state.runs && state.special) {
                compressed = state.encodedChunk.split(" ")[0];
            }
            else{
                compressed = Math.min(curr_run + Math.floor(transition), 7).toString(2).padStart(3, '0') + "0";
                
                if (curr_run > state.runs){
                    compressed += Math.min(curr_run - state.runs + Math.floor(transition), 15).toString(2).padStart(4, '0');
                }
                else{
                    compressed += "0000";
                }
            }
        
            ctx.font = `bold 110px monospace`;
            ctx.fillStyle = 'black';
            ctx.fillText(compressed, 0, 230);
        }

        const compressedWidth = ctx.measureText("00000000").width;
        const bitWidth = compressedWidth / 8;
        const gap = 5;

        // Header bit
        // Underline first bit
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(gap, 240);
        ctx.lineTo(3 * bitWidth - gap, 240);
        ctx.stroke();
        ctx.font = `bold 20px Arial`;
        ctx.fillStyle = '#FF69B4';
        let runCount = curr_run + Math.floor(transition);
        ctx.fillText(`${runCount <= 6 ? Math.min(runCount, state.runs) : '6+'} runs of 0`, bitWidth + gap, 270);

        if (curr_run > state.runs && state.special) {
            // Underline second bit
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(3 * bitWidth + gap, 240);
            ctx.lineTo(4 * bitWidth - gap, 240);
            ctx.stroke();
            ctx.fillStyle = 'blue';
            ctx.fillText(`spec?`, gap + bitWidth * 3, 270);
            
            // Underline rest of the string
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bitWidth * 4 + gap, 240);
            ctx.lineTo(compressedWidth - gap, 240);
            ctx.stroke();
            ctx.fillStyle = 'green';
            ctx.fillText(`DB location/ # of literals`, 4 * bitWidth + gap * 2, 270);
    
        }
        else if (curr_run > state.runs && !state.special) {
            // Literal
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bitWidth*3 + gap, 240);
            ctx.lineTo(compressedWidth - gap, 240);
            ctx.stroke();
            ctx.fillStyle = 'green';
            let litCount = curr_run - state.runs + Math.floor(transition)
            ctx.fillText(`${litCount} literal${litCount > 1 ? 's' : ''}`, 3 * bitWidth + gap * 2, 270);
        }
    
        // Add small text in the bottom right
        ctx.font = `bold 15px Arial`;
        ctx.fillStyle = 'black';
        ctx.fillText(`word : ${this.currentStateIndex + 1}`, canvasWidth - 100, canvasHeight - 10);
    }
    

    updateCompressedSoFar(lastElement = false) {
        let compressedSoFar = [];
        // this is the number of states we go through we we are on the last element print all states.
        const numOfStates = lastElement ? this.currentStateIndex + 1 : this.currentStateIndex; 
        for (let i = 0; i < numOfStates; i++) {
            compressedSoFar.push(this.states[i].encodedChunk);
        }
        this.outputText.innerText = compressedSoFar.join(" ");
    }

    // transition to the next compressed word or to the end of current one
    transitionNext() {
        let currState = this.states[this.currentStateIndex];
        let currStep = this.stateStep;
        const numSteps = currState.endChunk - currState.startChunk;

        // If we're counting runs, skip to the end of the run
        if (currStep < currState.runs) {
            // Set the state step to the end of the runs
            this.stateStep = currState.runs;
            
            // Animate the transition from the current state to the end of the runs
            requestAnimationFrame(this.animate(currState, currStep, performance.now(), currState.runs-currStep).bind(this));
            return;
        }

        // If we're at the end of runs, move to the next step
        if (currStep == currState.runs) {
            this.stateStep += 1;
            requestAnimationFrame(this.animate(currState, currStep, performance.now()).bind(this));
            return;
        }

        // If we're at the end of the last state, we are done
        if (this.currentStateIndex >= this.states.length - 1 && this.stateStep >= numSteps) {
            this.updateCompressedSoFar(true);
            return;
        }

        // If we're at the end of the current state, move to the next state
        if (this.stateStep >= numSteps) {
            currState = this.states[++this.currentStateIndex];
            currStep = 0;
            this.stateStep = 1;
            requestAnimationFrame(this.animate(currState, currStep, performance.now()).bind(this));
        }

        // If we're in the middle of a state, step to the next state
        else{
            // Set the state step to the end of the runs
            this.stateStep = numSteps;
            
            // Animate the transition from the current state to the end of the runs
            requestAnimationFrame(this.animate(currState, currStep, performance.now(), numSteps-currStep).bind(this));
            return;
        }    
    }

    // transition to the next micro step eg.. one more run of current word
    transitionMicro() {
        let fromState = this.states[this.currentStateIndex];
        let fromStep = this.stateStep;
        const numSteps = fromState.endChunk - fromState.startChunk;
        
        // If we are at the end of the last state, we are done
        if (this.currentStateIndex >= this.states.length - 1 && this.stateStep >= numSteps) {
            this.updateCompressedSoFar(true);
            return;
        }

        // If we are at the end of the current state, we move to the next state
        if (this.stateStep == numSteps) {
            fromState = this.states[++this.currentStateIndex];
            
            // Step 0 means transitioning into next chunk
            fromStep = 0; 
            this.stateStep = 1;
        } 
        
        // If we are in the middle of a state, we step to the next step
        else {
            this.stateStep++;
        }

        requestAnimationFrame(this.animate(fromState, fromStep, performance.now()).bind(this));
    }

    // if we are in the middle of a state, or at the end we step back to the beginning
    stepBack() {    
        const fromState = this.states[this.currentStateIndex];
        const fromRun = this.stateStep;

        if ((this.currentStateIndex === 0 && fromState.runs === 0) || (this.currentStateIndex === 0 && fromRun === 1)) {
            return; // we are at the first step
        }

        // if the state was a literal or we were on the first run
        if (fromState.runs === 0 || fromRun === 1) {
            this.currentStateIndex--;
            this.stateStep = this.states[this.currentStateIndex].runs;
        } else {
            this.stateStep = 1;
        }

        this.drawCanvas(this.states[this.currentStateIndex], 0, this.stateStep);
        this.updateCompressedSoFar();
    }

    // reset to the beginning
    reset() {
        
        this.currentStateIndex = 0;
        this.stateStep = 1;
        // document.getElementById('nextButton').disabled = false;
        // document.getElementById('microButton').disabled = false;
        this.outputText.innerText = '';
        this.drawCanvas(this.states[this.currentStateIndex]);
        this.updateCompressedSoFar();
    }

    // animate between states.
    animate(fromState, fromRun, startTime, distance = 1) {
        return (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 750, 1);

            const easedProgress = easeInOutQuad(progress) * distance;
            
            this.drawCanvas(fromState, easedProgress, fromRun);

            if (progress < 1) {
                requestAnimationFrame(this.animate(fromState, fromRun, startTime, distance).bind(this));
            } else {
                this.drawCanvas(this.states[this.currentStateIndex], 0, this.stateStep);
                this.updateCompressedSoFar();
            }
        };
    }
}

export default bbcVis;
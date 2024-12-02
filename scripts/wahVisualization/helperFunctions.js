export const simplifyString = (runType, litSize) => {
    const halfSize = Math.floor(litSize / 2);
    const start = Math.floor((litSize - halfSize) / 2);
    const end = start + halfSize;
    
    return (
        runType.repeat(start) + 
        '.'.repeat(halfSize) + 
        runType.repeat(litSize - end)
    );
};

 // this function takes decimal and size
// gives back a binary representation filled with 0's on the left so we always have a result of size
export const decimalToBinary = (decimal, size) => {
    // Convert the decimal number to a binary string
    let binaryString = decimal.toString(2);
    // Pad the binary string with leading 0's to match the size
    while (binaryString.length < size) {
        binaryString = '0' + binaryString;
    }
    // If the binary string exceeds the word, trim it to fit
    if (binaryString.length > size) {
        binaryString = binaryString.slice(-size);
    }

    return binaryString;
};


export const drawArrow = (ctx, fromX, fromY, toX, toY, headLength = 10) => {
    // Calculate the angle of the line
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI/6),
        toY - headLength * Math.sin(angle - Math.PI/6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI/6),
        toY - headLength * Math.sin(angle + Math.PI/6)
    );
    ctx.stroke();
}


export const insertSpaceEveryNChars = (inputString, digit) => {
    let result = '';
    for (let i = 0; i < inputString.length; i++) {
        result += inputString[i];
        if ((i + 1) % digit === 0 && i !== inputString.length - 1) {
            result += ' ';
        }
    }
    return result;
};


export const updateStartIndices = (states, litSize) => {
    let adjustedIndex = 0; // Tracks the adjusted start index including spaces

    for (let i = 0; i < states.length; i++) {
        const state = states[i];
        const { runs, runType, startIndex } = state;

        // Calculate the number of characters in the current state's uncompressed chunk
        const uncompressedLength = runs === 0 ? litSize : litSize * runs;

        // Calculate spaces added by `insertSpaceEveryNChars`
        const spacesAdded = Math.floor(uncompressedLength / litSize); // Spaces per group of litSize digits

        // Update the state's startIndex
        state.startIndex = adjustedIndex;

      
        adjustedIndex += uncompressedLength + spacesAdded;
        
    }

    return states;
};


export const easeInOutQuad = (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};
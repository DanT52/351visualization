import { bitsToString, getTypedArray, getParse, getCast, wordAsString } from "./common.js";



const getPlwahCompression = (numRuns, runOf, chunkarr, wordSize, compressed, index, numPositionBits, dirtyBitLoc=0 ) => {
    if (numRuns != 0) {
        let header = 1 << (wordSize - 1)
        if (runOf == 1) {
            header |= 1 << (wordSize - 2)
        }
        if (dirtyBitLoc !=0){
            header |= (dirtyBitLoc << (wordSize - numPositionBits-2))
        }

        numRuns |= header
        compressed[index] = numRuns
    }
    else { //literal
        compressed[index] = chunkarr
    }

}

const getState  =  (runs, runOf, index, comp) =>{
    return ({
        runs:  runs,
        runType:  runOf,
        startIndex:  index,
        compressed:  comp
    })
}

const isDirty = (byte) =>{
    return byte != 0 && Math.log2(byte) == Math.floor(Math.log2(byte));
}

const asUnsigned = (num, wordSize) => typeof num === "bigint" ? BigInt.asUintN(wordSize, num) : num >>> 0;

export const plwahCompress = (string, wordSize, returnStates=false) => {
    let numChunks = Math.ceil(string.length / (wordSize - 1));
    let index = 0;

    let compressed = getTypedArray(wordSize, numChunks);
    const parse = getParse(wordSize, wordSize - 1);
    
    let numPositionBits = Math.log2(wordSize);
    let runOnes = 0;
    let runZeros = 0;
    let chunkSize = wordSize - 1;
    let onesNum = (1 >>> 0 << chunkSize) - 1;
    let maxRunSize = (1 << wordSize - numPositionBits - 2)-1 ;
    let lastchunkflg = 0;
    
    let states = [];
    let currentStartIndex = 0;
    let dirtyBitLoc=0;

    for (let i = 0; i < string.length; i += chunkSize) {
        let chunkStr = string.slice(i, i + chunkSize);
        let chunk = parse(chunkStr);
        if (i + chunkSize > string.length) {
            lastchunkflg = 1;
        }

        if (chunk == 0 && lastchunkflg == 0) {
            if (runOnes > 0) { //RUN OF 1's ended, run of 0's started
                getPlwahCompression(runOnes, 1, null, wordSize, compressed, index++, numPositionBits );
                if (returnStates) {
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')) )
                }
                runOnes = 0;
                currentStartIndex = i;
            }
            if (runZeros == 0) {
                currentStartIndex = i;
            }
            runZeros++;  //"RUN OF 0's
            if (runZeros >= maxRunSize) {
                let nextChunk = parse(string.slice(i+chunkSize, i+chunkSize+chunkSize))
                if(isDirty(nextChunk)){
                    dirtyBitLoc = wordSize - Math.log2(nextChunk) - 1;
                    i=i+chunkSize
                }
                getPlwahCompression(runZeros, 0, null, wordSize, compressed, index++, numPositionBits, dirtyBitLoc);
                if (returnStates) {
                    states.push(getState(Number(runZeros), '0', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
                    if (dirtyBitLoc){
                        states.push({runs: 0, runType: '',  compressed:asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0') , dirtyPos: dirtyBitLoc})
                    }
                }
                runZeros = (0);
                currentStartIndex = i + chunkSize;
                dirtyBitLoc =0
            }
        } else if ((chunk ^ onesNum) == 0 && lastchunkflg == 0) {//RUN OF 1's
            if (runZeros > 0) {
                getPlwahCompression(runZeros, 0, null, wordSize, compressed, index++, numPositionBits );
                if (returnStates) {
                    states.push(getState(Number(runZeros), '0', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
                    if (dirtyBitLoc){
                        states.push({runs: 0, runType: '',  compressed:asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0') , dirtyPos: dirtyBitLoc})
                    }
                }
                runZeros = (0);
                currentStartIndex = i;
            }
            if (runOnes == 0) {
                currentStartIndex = i;
            }
            runOnes++;
            if (runOnes >= maxRunSize) { //RUN OF 1's ended
                let nextChunk = parse(string.slice(i+chunkSize, i+chunkSize+chunkSize))
                if(isDirty(nextChunk^onesNum)){
                    dirtyBitLoc = wordSize - Math.log2(nextChunk^onesNum) - 1;
                    i=i+chunkSize
                }
                getPlwahCompression(runOnes, 1, null, wordSize, compressed, index++, numPositionBits,dirtyBitLoc );
                if (returnStates) {
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0'),dirtyBitLoc))
                    if (dirtyBitLoc){
                        states.push({runs: 0, runType: '',  compressed:asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0') , dirtyPos: dirtyBitLoc})
                    }
                }
                runOnes = (0);
                currentStartIndex = i + chunkSize;
            }
        } else {
            if (runOnes > 0) {//encode run of 1s first
                if(isDirty(chunk^onesNum)){//check if dirty bit 
                    dirtyBitLoc = wordSize - Math.log2(chunk^onesNum) - 1;
                }
                getPlwahCompression(runOnes, 1, null, wordSize, compressed, index++, numPositionBits, dirtyBitLoc );
                if (returnStates) {
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')), dirtyBitLoc)
                    if (dirtyBitLoc){
                        states.push({runs: 0, runType: '',  compressed:asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0') , dirtyPos: dirtyBitLoc})
                    }
                }
                runOnes = (0);
            } else if (runZeros > 0) {//encode run of 0s first
                if(isDirty(chunk)){
                    dirtyBitLoc = wordSize - Math.log2(chunk) - 1;
                }
                getPlwahCompression(runZeros, 0, null, wordSize, compressed, index++, numPositionBits, dirtyBitLoc );
                if (returnStates) {
                    states.push(getState(Number(runZeros), '0', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0'),dirtyBitLoc))
                    if (dirtyBitLoc){
                        states.push({runs: 0, runType: '',  compressed:asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0') , dirtyPos: dirtyBitLoc})
                    }
                }
                runZeros = (0);
            }
            // encode Literal
            if(dirtyBitLoc==0){
                getPlwahCompression(0, 0, chunk, wordSize, compressed, index++, numPositionBits );
                if (returnStates) {
                    states.push(getState(Number(0), '', i,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
                }
            }
            dirtyBitLoc=0
            currentStartIndex = i + chunkSize;
        }
    }

    if (runOnes > 0) {//encode run of 1"
        getPlwahCompression(runOnes, 1, null, wordSize, compressed, index++, numPositionBits, );
        if (returnStates) {
            states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
        }
    } else if (runZeros > 0) {//encode run of 0
        getPlwahCompression(runZeros, 0, null, wordSize, compressed, index++, numPositionBits, );
        if (returnStates) {
            states.push(getState(Number(runZeros), '0', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
        }
    }

    return returnStates ? states : {
        compressed: compressed,
        length: index,
        str: bitsToString(compressed, index, wordSize),
    };
}


// // let test = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000'
// let test='00000000000000000000000000000000000000000000000000000001'
// // let test='00000000000000000000000000000000000000000000000000100000'

// let result = plwahCompress(test, 8, true);
//  result = plwahCompress(test, 16, true);
//  result = plwahCompress(test, 32, true);
//  result = plwahCompress(test, 64, true);
// console.log(result)

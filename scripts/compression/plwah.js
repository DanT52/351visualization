const getTypedArray = (wordSize, numChunks) => {
    switch (wordSize) {
        case 8:
            return new Uint8Array(numChunks); // 1 byte per chunk
        case 16:
            return new Uint16Array(numChunks); // 2 bytes per chunk
        case 32:
            return new Uint32Array(numChunks); // 4 bytes per chunk
        case 64:
            return new BigInt64Array(numChunks); // 8 bytes per chunk
        default:
            throw new Error("Unsupported word size. Choose 8, 16, 32, or 64.");
    }
}

const printByte = (chunk, wordSize) => {
    console.log(asUnsigned(chunk).toString(2).padStart(wordSize, '0'))
}

const bitsToString = (bits, length, wordSize) => {
    const asUnsigned = (num) => typeof num === "bigint" ? BigInt.asUintN(64, num) : num;
    return Array.from(bits).slice(0, length).map(
        num => asUnsigned(num).toString(2).padStart(wordSize, '0')
    ).join('');
}

const getParse = (wordSize, scanLength) => wordSize > 32 ?
    (str) => BigInt(("0b" + str)) << BigInt(scanLength - str.length) :
    (str) => parseInt(str, 2) << (scanLength - str.length);


const getPlwahCompression = (numRuns, runOf, chunkarr, wordSize, compressed, index, numPositionBits, dirtyBitLoc=0 ) => {
    if (numRuns != 0) {
        // console.log("--------------------")
        let header = 1 << (wordSize - 1)
        if (runOf == 1) {
            header |= 1 << (wordSize - 2)
        }
        if (dirtyBitLoc !=0){
            // printByte(dirtyBitLoc,3)
            // printByte((dirtyBitLoc << (wordSize - numPositionBits-2)), wordSize)
            header |= (dirtyBitLoc << (wordSize - numPositionBits-2))
        }

        numRuns |= header
        // console.log("compressed" , asUnsigned(numRuns).toString(2).padStart(wordSize, '0'))
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

    // console.log(wordSize, numPositionBits, wordSize-numPositionBits, '->', maxRunSize.toString(2), '=', maxRunSize)

    for (let i = 0; i < string.length; i += chunkSize) {
        let chunkStr = string.slice(i, i + chunkSize);
        let chunk = parse(chunkStr);
        if (i + chunkSize > string.length) {
            lastchunkflg = 1;
        }

        if (chunk == 0 && lastchunkflg == 0) {
            if (runOnes > 0) { //RUN OF 1's ended, run of 0's started
                getPlwahCompression(runOnes, 1, null, wordSize, compressed, index++, numPositionBits, );
                if (returnStates) {
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
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
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
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
                    states.push(getState(Number(runOnes), '1', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
                }
                runOnes = (0);
            } else if (runZeros > 0) {//encode run of 0s first
                if(isDirty(chunk)){
                    dirtyBitLoc = wordSize - Math.log2(chunk) - 1;
                    console.log("Dirty bit ->", chunk.toString(2).padStart(wordSize, '0'), '->',  dirtyBitLoc,'==',  dirtyBitLoc.toString(2).padStart(5, '0'))
                }
                getPlwahCompression(runZeros, 0, null, wordSize, compressed, index++, numPositionBits, dirtyBitLoc );
                if (returnStates) {
                    states.push(getState(Number(runZeros), '0', currentStartIndex,asUnsigned(compressed[index - 1], wordSize).toString(2).padStart(wordSize, '0')))
                }
                runZeros = (0);
            }
            // encode Literal
            if(dirtyBitLoc==0){
                getPlwahCompression(0, 0, chunk, wordSize, compressed, index++, numPositionBits, );
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


// let ws=8

// // // let animals_small_col0 = "1000110000001001010010000010100000101000000111000100000000000000000000001001000000111011000001100000000001101001000000011001000001010001100101000001000100010000100000100111000000000001000000010000001000100001011010010000010000001000101000010001010000110000010000010110000001000000000000000001101000110000001101000000100100100000000000000001010011000111000000000010000001010000100010010000000001010100100000001100001000001000000010000011001000010100011100001000010000000000011000101000100011010101100000011000000001001000010100000000000000001000010000010001010010001000000001010011000010000000000010000001100001000100000100000000000000110000001100100000111000101001000000001000111000111000000000000001110001001001001000000011001000111010001100000100101000000000100110010010000000000100010010010001100010110110000110110000000000000100000111000000101110000010000000100100000000001010000000000100111001111000100100001000001101000000000010011101000000000010100100001011010001110000000000000010010000000100";
// // let test = "1000110000001001010010000010100000101000000111000100000000000000000000001001000000111011000001100000000001101001000000011001000001010001100101000001000100010000100000100111000000000001000000010000001000100001011010010000010000001000101000010001010000110000010000010110000001000000000000000001101000110000001101000000100100100000000000000001010011000111000000000010000001010000100010010000000001010100100000001100001000001000000010000011001000010100011100001000010000000000011000101000100011010101100000011000000001001000010100000000000000001000010000010001010010001000000001010011000010000000000010000001100001000100000100000000000000110000001100100000111000101001000000001000111000111000000000000001110001001001001000000011001000111010001100000100101000000000100110010010000000000100010010010001100010110110000110110000000000000100000111000000101110000010000000100100000000001010000000000100111001111000100100001000001101000000000010011101000000000010100100001011010001110000000000000010010000000100";
// // let test ='00000000000000000000000000000000000000000000000000100000000000000000000'
// // let test ='11111111111000000000000101011111111111111111111111111111001011'

// // let test ="1000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001"

// // let test ='1000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001'
// // let test = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000'
// let test='00000000000000000000000000000000000000000000000000000001'
// // let test='00000000000000000000000000000000000000000000000000100000'

// // test = test.split('').map(bit => bit === '1' ? '0' : '1').join('');

// // console.log(flipped);
// let result = plwahCompress(test, 8, true);
//  result = plwahCompress(test, 16, true);
//  result = plwahCompress(test, 32, true);
//  result = plwahCompress(test, 64, true);
// // // console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
// console.log(result)

import { bitsToString, getTypedArray, getParse, getCast, wordAsString } from "./common.js";

const getWahCompression = (numRuns, runOf, chunkarr, wordSize, compressed, index, cast) => {
    if (numRuns != 0) {
        let header = cast(1) << cast(wordSize - 1)

        if (runOf == 1) {
            header |= cast(1) << cast(wordSize - 2)
        }

        numRuns |= header
        compressed[index] = numRuns
    }
    else { //literal
        compressed[index] = chunkarr
    }

}

export const wahCompress = (string, wordSize, returnStates = false) => {
    let numChunks = Math.ceil(string.length / (wordSize - 1));
    let index = 0;

    let compressed = getTypedArray(wordSize, numChunks);
    const parse = getParse(wordSize, wordSize - 1);
    const cast = getCast(wordSize);

    let runOnes = cast(0);
    let runZeros = cast(0);
    let chunkSize = wordSize - 1;
    let onesNum = (cast(1 >>> 0) << cast(chunkSize)) - cast(1);
    let maxRunSize = (cast(1) << cast(wordSize - 2)) - cast(1);
    let lastchunkflg = 0;

    let states = [];
    let currentStartIndex = 0;

    for (let i = 0; i < string.length; i += chunkSize) {
        let chunkStr = string.slice(i, i + chunkSize);
        let chunk = parse(chunkStr);
        if (i + chunkSize > string.length) {
            lastchunkflg = 1;
        }

        if (chunk == 0 && lastchunkflg == 0) {
            if (runOnes > 0) { //RUN OF 1's ended, run of 0's started
                getWahCompression(runOnes, 1, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runOnes),
                        runType: '1',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runOnes = cast(0);
                currentStartIndex = i;
            }
            if (runZeros == 0) {
                currentStartIndex = i;
            }
            runZeros++;  //"RUN OF 0's
            if (runZeros >= maxRunSize) {
                getWahCompression(runZeros, 0, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runZeros),
                        runType: '0',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runZeros = cast(0);
                currentStartIndex = i + chunkSize;
            }
        } else if ((chunk ^ onesNum) == 0 && lastchunkflg == 0) {//RUN OF 1's
            if (runZeros > 0) {
                getWahCompression(runZeros, 0, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runZeros),
                        runType: '0',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runZeros = cast(0);
                currentStartIndex = i;
            }
            if (runOnes == 0) {
                currentStartIndex = i;
            }
            runOnes++;
            if (runOnes >= maxRunSize) { //RUN OF 1's ended
                getWahCompression(runOnes, 1, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runOnes),
                        runType: '1',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runOnes = cast(0);
                currentStartIndex = i + chunkSize;
            }
        } else {
            if (runOnes > 0) {//encode run of 1s first
                getWahCompression(runOnes, 1, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runOnes),
                        runType: '1',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runOnes = cast(0);
            } else if (runZeros > 0) {//encode run of 0s first
                getWahCompression(runZeros, 0, null, wordSize, compressed, index++, cast);
                if (returnStates) {
                    states.push({
                        runs: Number(runZeros),
                        runType: '0',
                        startIndex: currentStartIndex,
                        compressed: wordAsString(compressed[index - 1], wordSize),
                    });
                }
                runZeros = cast(0);
            }
            // encode Literal
            getWahCompression(0, 0, chunk, wordSize, compressed, index++, cast);
            if (returnStates) {
                states.push({
                    runs: 0,
                    runType: '',
                    startIndex: i,
                    compressed: wordAsString(compressed[index - 1], wordSize),
                });
            }
            currentStartIndex = i + chunkSize;
        }
    }

    if (runOnes > 0) {//encode run of 1"
        getWahCompression(runOnes, 1, null, wordSize, compressed, index++, cast);
        if (returnStates) {
            states.push({
                runs: Number(runOnes),
                runType: '1',
                startIndex: currentStartIndex,
                compressed: wordAsString(compressed[index - 1], wordSize),
            });
        }
    } else if (runZeros > 0) {//encode run of 0
        getWahCompression(runZeros, 0, null, wordSize, compressed, index++, cast);
        if (returnStates) {
            states.push({
                runs: Number(runZeros),
                runType: '0',
                startIndex: currentStartIndex,
                compressed: wordAsString(compressed[index - 1], wordSize),
            });
        }
    }

    return returnStates ? states : {
        compressed: compressed,
        length: index,
        str: bitsToString(compressed, index, wordSize),
    };
}

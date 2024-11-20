import { bitsToString, getTypedArray, getParse, getCast, wordAsString } from "./common.js";

export const getValSegmentLength = (wordSize, segmentCount) => {
    const scanLength = (wordSize - segmentCount) / segmentCount;
    console.assert(scanLength == (scanLength | 0), "Word size does not divide cleanly by segment count!");
    console.assert(scanLength > 1, "Segment size is too small!");

    return scanLength;
}

export const valCompress = (index, wordSize, segmentCount, returnStates = false) => {
    const scanLength = getValSegmentLength(wordSize, segmentCount);

    const allSegmentsLength = segmentCount * scanLength;

    const states = [];
    const output = getTypedArray(wordSize, Math.ceil(index.length / allSegmentsLength));
    const cast = getCast(wordSize);
    const parse = getParse(wordSize, scanLength);

    const maxValue = (cast(1) << cast(scanLength)) - cast(1);
    const maxRunLength = (cast(1) << cast(scanLength - 1)) - cast(1);

    let defaultWord = cast(0);

    for (let i = 0; i < segmentCount; i++) {
        defaultWord |= cast(1) << cast(wordSize - i - 1);
    }

    let outputIndex = 0;
    let isInRun = false;
    let runLength = 0;
    let runType = 0;
    let i = 0;
    let startIndex = 0;

    let pendingWord = defaultWord;
    let pendingCount = 0;

    const outputRun = () => {
        ++pendingCount;
        pendingWord |= ((cast(runType) << cast(scanLength - 1)) | cast(runLength)) << cast((segmentCount - pendingCount) * scanLength);

        if (returnStates) {
            states.push({
                runs: runLength,
                runType: runType == 0 ? '0' : '1',
                startIndex,
                compressed: wordAsString(pendingWord, wordSize),
            });
        }

        startIndex = i;

        flushPendingSegments();
    }

    const flushPendingSegments = (isForced) => {
        if (pendingCount == segmentCount || (pendingCount > 0 && isForced)) {
            output[outputIndex] = pendingWord;
            ++outputIndex;

            pendingCount = 0;
            pendingWord = defaultWord;
        }
    }

    const handleRun = (currentType) => {
        if (isInRun) {
            if (runType != currentType || runLength == maxRunLength) {
                outputRun();
                startIndex -= scanLength;
                runLength = 1;
                runType = currentType;
            } else {
                ++runLength;
            }
        } else {
            isInRun = true;
            runLength = 1;
            runType = currentType;
        }
    }

    while (i < index.length) {
        let chunkLength = Math.min(scanLength, index.length - i);
        let isEndingBits = chunkLength < scanLength;
        let nextBits = parse(index.slice(i, i + chunkLength));

        i += scanLength;

        if (!isEndingBits && nextBits == maxValue) {
            // Found all 1s.
            handleRun(1);
        } else if (!isEndingBits && nextBits == 0) {
            // Found all 0s.
            handleRun(0);
        } else {
            // Found a literal.
            if (isInRun) {
                outputRun();
                startIndex -= scanLength;
                runLength = 0;
                runType = 0;
                isInRun = false;
            }

            ++pendingCount;
            pendingWord &= ~(cast(1) << cast(wordSize - pendingCount));
            pendingWord |= nextBits << cast((segmentCount - pendingCount) * scanLength);

            if (returnStates) {
                states.push({
                    runs: 0,
                    runType: '0',
                    startIndex,
                    compressed: wordAsString(pendingWord, wordSize),
                });
            }

            startIndex = i;

            flushPendingSegments();
        }
    }

    if (isInRun) {
        outputRun();
    }

    flushPendingSegments(true);

    return returnStates ? states : {
        compressed: output,
        length: outputIndex,
        str: bitsToString(output, outputIndex, wordSize),
    };
}

// Helps when testing valCompress.
export const valDecompress = (compressed, wordSize, segmentCount, outputLength) => {
    const scanLength = getValSegmentLength(wordSize, segmentCount);
    const cast = getCast(wordSize);

    const maxValue = (cast(1) << cast(scanLength)) - cast(1);
    const runLengthMask = (cast(1) << cast(scanLength - 1)) - cast(1);

    const index = [];

    for (let wordI = 0; wordI < compressed.length; ++wordI) {
        const word = compressed.compressed[wordI];

        for (let segmentI = 0; segmentI < segmentCount; ++segmentI) {
            const headerBit = (word >> cast(wordSize - 1 - segmentI)) & cast(1);
            const segment = (word >> cast(scanLength * (segmentCount - 1 - segmentI))) & cast(maxValue);

            if (headerBit == 0) {
                // Found a literal.
                index.push(segment);
                continue;
            }

            // Found a run.
            const typeBit = (segment >> cast(scanLength - 1)) & cast(1);
            const runLength = segment & cast(runLengthMask);
            const runValue = typeBit == 1 ? maxValue : 0;

            for (let runI = 0; runI < runLength; ++runI) {
                index.push(runValue);
            }
        }
    }

    return {
        compressed: index,
        length: index.length,
        str: bitsToString(index, index.length, getValSegmentLength(wordSize, segmentCount))
            .slice(0, outputLength),
    };
}
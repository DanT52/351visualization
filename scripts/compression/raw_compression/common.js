export const asUnsigned = (num) => typeof num === "bigint" ?
    BigInt.asUintN(64, num) :
    num >>> 0 /* Cast to unsigned, important for 32 bit words */;

export const wordAsString = (num, wordSize) => asUnsigned(num).toString(2).padStart(wordSize, '0');

export const bitsToString = (bits, length, wordSize) => {
    return Array.from(bits).slice(0, length).map((num) => wordAsString(num, wordSize)).join('');
}

export const getTypedArray = (wordSize, numChunks) => {
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

export const getParse = (wordSize, scanLength) => wordSize > 32 ?
    (str) => BigInt(("0b" + str)) << BigInt(scanLength - str.length) :
    (str) => parseInt(str, 2) << (scanLength - str.length);

export const getCast = (wordSize) => wordSize > 32 ?
    BigInt :
    (x) => x;
import * as fs from 'fs';
import { bbcCompress } from './bbc.js';
import { wahCompress } from './wah.js';
import { valCompress, valDecompress } from './val.js';
import { plwahCompress } from './plwah.js'

const diffStrings = (expected, actual) => {
    const seekBefore = 20;
    const seekAfter = 20;
    const viewStr = (str, startIndex) => {
        let before = str.substring(
                Math.max(0, startIndex-seekBefore), 
                startIndex
        );
        if (startIndex - seekBefore > 0) before = "..." + before;
        before = before.padStart(seekBefore+3, ' ');
        let after = str.substring(
            startIndex, 
            Math.min(str.length-1, startIndex+seekAfter)
        ) + (str.length-1 > startIndex+seekAfter ? "..." : "" );
        return before + after;
    }
    const zipLen = Math.min(expected.length, actual.length);

    for (let i = 0; i < zipLen; i++) {
        if (expected[i] != actual[i]) {
            console.log(`\nstrings differ at ${i}/${zipLen}: expected[${i}] = ${expected[i]}, actual[${i}] = ${actual[i]}`);
            console.log("expected: " + viewStr(expected, i));
            console.log("actual:   " + viewStr(actual, i));
            console.log("          " + " ".repeat(seekBefore+3) + "^");
            return false;
        }
    }

    if (expected.length != actual.length) {
        if (expected.length < actual.length) {
            console.log("Actual str longer than expected str! (but agree up to that point.)");
            console.log("actual.length = " + actual.length + ", expected.length = " + expected.length);
            console.log("expected: " + viewStr(expected, expected.length-1));
            console.log("actual:   " + viewStr(actual, expected.length-1));
            console.log("          " + " ".repeat(seekBefore+3) + "^");
        }
        else {
            console.log("Actual str shorter than expected str! (but agree up to that point.)");
            console.log("actual.length = " + actual.length + ", expected.length = " + expected.length);
            console.log("expected: " + viewStr(expected, actual.length-1));
            console.log("actual:   " + viewStr(actual, actual.length-1));
            console.log("          " + " ".repeat(seekBefore+3) + "^");
        }
        return false;
    }
    return true;
}

const getColumns = (input) => {
    const rows = input.trim().split(/\r?\n/);
    const numCols = rows[0].length;
    const columns = Array.from({length: numCols}, () => '');
    for (let row of rows) {
        for (let i = 0; i < numCols; i++) {
            columns[i] += row[i];
        }
    }
    return columns;
}

const testCompressionAlg = (compressionAlg, inputFile, expectedOutputFile) => {
    const inputFileStr = fs.readFileSync(inputFile, 'utf8');
    const expectedOutputFileStr = fs.readFileSync(expectedOutputFile, 'utf8');
    const expectedOutputFileRows = expectedOutputFileStr.split(/\r?\n/);
    const compressedCols = getColumns(inputFileStr).map(col => compressionAlg(col));
    for (let i = 0; i < compressedCols.length; i++) {
        if (!diffStrings(expectedOutputFileRows[i], compressedCols[i])) {
            console.log("\n" + expectedOutputFile + `: failed to compress column ${i} correctly`);
            return false; 
        }
    }
    console.log(expectedOutputFile + ": passed all columns");
    return true;
}

const testBBC = () => {
    const bbcTestFiles = [
        ['data/animals', 'data/animals_BBC_8'],
        ['data/animals_sorted', 'data/animals_sorted_BBC_8'],
    ];
    console.log("\nTesting BBC...");
    for (const [inputFile, expectedOutputFile] of bbcTestFiles) {
        if (!testCompressionAlg(bbcCompress, inputFile, expectedOutputFile)) 
            return;
    }
}

const testWAH = () => {
    const wahTestFiles = [
        // ['data/animals', 'data/animals_WAH_4', 4],
        ['data/animals', 'data/animals_WAH_8', 8],
        ['data/animals', 'data/animals_WAH_16', 16],
        ['data/animals', 'data/animals_WAH_32', 32],
        ['data/animals', 'data/animals_WAH_64', 64],
        // ['data/animals_sorted', 'data/animals_sorted_WAH_4', 4],
        ['data/animals_sorted', 'data/animals_sorted_WAH_8', 8],
        ['data/animals_sorted', 'data/animals_sorted_WAH_16', 16],
        ['data/animals_sorted', 'data/animals_sorted_WAH_32', 32],
        ['data/animals_sorted', 'data/animals_sorted_WAH_64', 64],
    ];
    console.log("\nTesting WAH...");
    for (const [inputFile, expectedOutputFile, wordSize] of wahTestFiles) {
        const wahCompressWordSize = (index) => wahCompress(index, wordSize).str;
        if (!testCompressionAlg(wahCompressWordSize, inputFile, expectedOutputFile)) 
            return;
    }
}

const testVAL = () => {
    const valManualTests = [
        // input, expectedOutput, wordSize, segementLength, testName
        ["", "", 16, 2, "empty string"],
        ["1010001" + "1".repeat(7*2), "01"+"1010001"+"1000010", 16, 2, "literal + 2 runs of 1s"],
        ["1".repeat(7*2) + "1010001", "10"+"1000010"+"1010001", 16, 2, "2 runs of 1s + literal"],
        ["1010001" + "1".repeat(7*32), "01"+"1010001"+"1100000", 16, 2, "literal + 32 runs of 1s"],
        ["1".repeat(7*32) + "1010001", "10"+"1100000"+"1010001", 16, 2, "32 runs of 1s + literal"],
        ["1010001" + "0".repeat(7*2), "01"+"1010001"+"0000010", 16, 2, "literal + 2 runs of 0s"],
        ["0".repeat(7*2) + "1010001", "10"+"0000010"+"1010001", 16, 2, "2 runs of 0s + literal"],
        ["1010001" + "0".repeat(7*32), "01"+"1010001"+"0100000", 16, 2, "literal + 32 runs of 0s"],
        ["0".repeat(7*32) + "1010001", "10"+"0100000"+"1010001", 16, 2, "32 runs of 0s + literal"],
        ["1010001".repeat(16), ("00"+"1010001".repeat(2)).repeat(8), 16, 2, "16 literals"],
        ["1010001".repeat(100000), ("00"+"1010001".repeat(2)).repeat(50000), 16, 2, "100000 literals"],
        ["1".repeat(7*3), "11"+"1000011"+"0000000", 16, 2, "3 runs of 1s"], // equivalently, the correct answer could be "11" + "1000011" + "1000000"
        ["1".repeat(7*1) + "0".repeat(7*1), "11"+"1000001"+"0000001", 16, 2, "1 run of 1s + 1 run of 0s"],
        ["1".repeat(7*16) + "0".repeat(7*16), "11"+"1010000"+"0010000", 16, 2, "16 runs of 1s + 16 runs of 0s"],
        [   
            "1010001".repeat(16) + "0".repeat(7*32), 
            ("00"+"1010001".repeat(2)).repeat(8) + "11"+"0100000"+"0000000", 
            16,
            2,
            "16 literals + 32 runs of 0s"
        ],
        [("1".repeat(7) + "0".repeat(7)).repeat(1000), ("11"+"1000001"+"0000001").repeat(1000), 16, 2, "alternating runs"]
    ]
    const valTestFiles = [
        ['data/animals', 32, 2],
        ['data/animals', 64, 2],
    ];
    console.log("\nTesting VAL...");
    let manualTestInc = 0;
    for (const [input, expectedOutput, wordSize, segementCount, testName] of valManualTests) {
        manualTestInc++;
        const compressed = valCompress(input, wordSize, segementCount);
        if (!diffStrings(expectedOutput, compressed.str)) {
            console.log(`\n failed manual test ${manualTestInc}: ${testName}.`);
            return;
        }
        console.log(`passed manual test ${manualTestInc}: ${testName}`);
    }
    for (const [inputFile, wordSize, segmentCount] of valTestFiles) {
        let colNum = 0;
        for (let col of getColumns(fs.readFileSync(inputFile, 'utf8'))) {
            colNum++;
            const compressed = valCompress(col, wordSize, segmentCount);
            const decompressed = valDecompress(compressed, wordSize, segmentCount, col.length);
            if (!diffStrings(col, decompressed.str)) {
                console.log("\n" + inputFile + ` (${wordSize}): failed to compress column ${colNum} correctly`);
                return;
            }
        }
        console.log(inputFile + ": passed all columns");
    }
}

const testPLWAH= () =>{
    const plwahTests = [
        ["", "", 16, 2, "empty string"],
        ['0'.repeat(7*7) + '000100', '10100111', 8, '8 - max run 0s + dirty bit'],
        ['1'.repeat(7*7) + '1110111', '11100111', 8, '8 -max run 1s + dirty bit'],
        ['0'.repeat(7*7) + '000110', '1000011100001100', 8, '8 - max run 0s + literal'],
        ['0'.repeat(7*5) + '0000100', '10101101', 8, '8 - 5 runs + dirty'],
        ['0'.repeat(7*5) + '1110001', '1000010101110001', 8, '8 - 5 runs + literal'],

        // ['0'.repeat(15*1023) + '000000010000000', '1010001111111111', 16, '16 - max run 0s + dirty bit'],
        // ['1'.repeat(15*1023) + '111111101111111', '1110001111111111', 16, '16 - max run 1s + dirty bit'],
        // ['1'.repeat(15*511) + '0' + '1'.repeat(14), '1100010111111111', 16, '16 - 511 run 1s + dirty bit'],

        // ['1'.repeat(31*2) + '0' + '1'.repeat(30), '1100001' + '0'.repeat(23) + '10', 32, '32 - 2 run 1s + dirty bit'],
        // ['1'.repeat(31*2) + '0'.repeat(31), '1100000' + '0'.repeat(23) + '10' + '10', 32, '32 - 2 run 1s + run 0'],
        
        // ['1'.repeat(63*2) + '0'.repeat(31), '1100000' + '0'.repeat(23) + '10' + '10', 32, '32 - 511 run 1s + dirty bit'],
        
        ['1'.repeat(7)  + '0' + '1'.repeat(6),  '11'+'001'      + '0'.repeat(3)  + '1', 8, '8 - run of 1s'],
        ['1'.repeat(15) + '0' + '1'.repeat(14), '11'+'0001'     + '0'.repeat(9)  + '1', 16, '16 - run of 1s'],
        ['1'.repeat(31) + '0' + '1'.repeat(30), '11'+'00001'    + '0'.repeat(25) + '1', 32, '32 - run of 1s'],
        ['1'.repeat(63) + '0' + '1'.repeat(62), '11'+'000001'   + '0'.repeat(56) + '1', 64, '64 - run of 1s'],
    ]
    let manualTestInc =0
    for (const [input, expectedOutput, wordSize, testName] of plwahTests) {
        manualTestInc++;
        const compressed = plwahCompress(input, wordSize);
        if (!diffStrings(expectedOutput, compressed.str)) {
            console.log(`\n failed manual test ${manualTestInc}: ${testName}.`);
            return;
        }
        console.log(`passed manual test ${manualTestInc}: ${testName}`);
    }
    // for (const [inputFile, wordSize, segmentCount] of valTestFiles) {
    //     let colNum = 0;
    //     for (let col of getColumns(fs.readFileSync(inputFile, 'utf8'))) {
    //         colNum++;
    //         const compressed = valCompress(col, wordSize, segmentCount);
    //         const decompressed = valDecompress(compressed, wordSize, segmentCount, col.length);
    //         if (!diffStrings(col, decompressed.str)) {
    //             console.log("\n" + inputFile + ` (${wordSize}): failed to compress column ${colNum} correctly`);
    //             return;
    //         }
    //     }
    //     console.log(inputFile + ": passed all columns");
    // }
}


testPLWAH();
testBBC();
testWAH();
testVAL();

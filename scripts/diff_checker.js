// TODO:
// Make the output container a scrollable element so that the page isn't super long.
// Add line numbers to the scrollable element
// Jump to the first line that is different
// Show indices of the characters in detailed comparison.
// Automatically show the detailed diff of the first diff

document.getElementById('compare-btn').addEventListener('click', function() {
    // remove whitespace
    var text1 = document.getElementById('text1').value.replace(/\s+/g, ''); 
    var text2 = document.getElementById('text2').value.replace(/\s+/g, '');
    var text_matches = true // stores whether or not the text matches
    if (text1 != text2) {
        text_matches = false
    }
    // get word size from drop-down 
    var chunkSize = parseInt(document.getElementById('word-size').value) || 8;
    // split the input into chunks
    var chunks1 = splitIntoChunks(text1, chunkSize);
    var chunks2 = splitIntoChunks(text2, chunkSize);
    // get the total # of chunks
    var maxChunks = Math.max(chunks1.length, chunks2.length);
    // lines container will store the diff'd lines
    var linesContainer = document.createElement('div');
    linesContainer.classList.add('lines-container');
    // If the text matches in both containers then leave the function early
    if (text_matches){
        var text_matches_element = document.createElement('h3');
        text_matches_element.textContent = "Your input is correct!"
        linesContainer.appendChild(text_matches_element)
        var resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '';
        resultDiv.appendChild(linesContainer);
        return
    }

    // create output labels
    var headersDiv = document.createElement('div');
    headersDiv.classList.add('line');
    var header1 = document.createElement('h3');
    header1.classList.add('chunk1')
    header1.textContent = 'Your input';
    var header2 = document.createElement('h3');
    header1.classList.add('chunk2')
    header2.textContent = 'Correct output';
    headersDiv.appendChild(header1);
    headersDiv.appendChild(header2);
    linesContainer.appendChild(headersDiv);

    for (var i = 0; i < maxChunks; i++) { // loop through every chunk
        var chunk1 = chunks1[i] || ''; // if we ran out of chunks then use empty string
        var chunk2 = chunks2[i] || '';

        // create a line container
        var lineDiv = document.createElement('div');
        lineDiv.classList.add('line');

        // create spans for chunk1 and chunk2
        var word1 = document.createElement('span');
        word1.textContent = chunk1;
        word1.classList.add('chunk1');
        var word2 = document.createElement('span');
        word2.textContent = chunk2;
        word2.classList.add('chunk2');

        // append spans to lineDiv
        lineDiv.appendChild(word1);
        lineDiv.appendChild(word2);

        // Check if chunks are different
        if (chunk1 !== chunk2) {
            lineDiv.classList.add('diff');
            // Make line clickable
            lineDiv.style.cursor = 'pointer';
            // the two chunks are stored within the lineDiv's for later use
            lineDiv.dataset.chunk1 = chunk1;
            lineDiv.dataset.chunk2 = chunk2;
            // add event listener to display detailed difference in a line
            lineDiv.addEventListener('click', function() {
                showLineDiff(this.dataset.chunk1, this.dataset.chunk2)
            })
        }

        // Append the lineDiv to linesContainer
        linesContainer.appendChild(lineDiv);
    }

    var resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    resultDiv.appendChild(linesContainer);
});

function splitIntoChunks(str, chunkSize) {
    var chunks = [];
    for (var i = 0; i < str.length; i += chunkSize) {
        chunks.push(str.substr(i, chunkSize));
    }
    return chunks;
}

function showLineDiff(c1, c2) {
    // empty the detail container
    var existingDetail = document.getElementById('detail-container');
    if (existingDetail) {
        existingDetail.parentNode.removeChild(existingDetail);
    }

    // Create a detailed diff container
    var detailContainer = document.createElement('div');
    detailContainer.classList.add('detail-container');
    detailContainer.id = 'detail-container';

    // Create divs for the two lines
    var display1 = document.createElement('div');
    display1.classList.add('detail-line');
    var display2 = document.createElement('div');
    display2.classList.add('detail-line');

    // Get the maximum length of the two chunks
    var maxLength = Math.max(c1.length, c2.length);

    // build the two spans based on whether individual characters match or not
    for (var j = 0; j < maxLength; j++) {
        var char1 = c1.charAt(j) || ' '; // if char doesn't exist just use space
        var char2 = c2.charAt(j) || ' ';

        var spanChar1 = document.createElement('span');
        var spanChar2 = document.createElement('span');

        if (char1 === char2) {
            spanChar1.textContent = char1;
            spanChar2.textContent = char2;
        } else { // if chars are different then highlight them
            spanChar1.textContent = char1;
            spanChar1.classList.add('highlight');
            spanChar2.textContent = char2;
            spanChar2.classList.add('highlight');
        }

        display1.appendChild(spanChar1);
        display2.appendChild(spanChar2);
    }

    // Add labels or headings if desired
    var detailHeader1 = document.createElement('h4');
    detailHeader1.textContent = 'Your input';
    var detailHeader2 = document.createElement('h4');
    detailHeader2.textContent = 'Correct output';

    detailContainer.appendChild(detailHeader1);
    detailContainer.appendChild(display1);
    detailContainer.appendChild(detailHeader2);
    detailContainer.appendChild(display2);

    // Append the detailContainer below the original containers
    var resultDiv = document.getElementById('result');
    resultDiv.appendChild(detailContainer);

    // Scroll to the detail container
    detailContainer.scrollIntoView({ behavior: 'smooth' });
}
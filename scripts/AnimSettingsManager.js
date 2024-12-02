const ANIM_CONFIG = {
    DEFAULT_SETTINGS: {
        compressionMethod: 'wah',
        wordSize: 8,
        numSegments: 2,
    },
    WORD_SIZE_SEGMENTS: {
        '8': ['1', '2'],
        '16': ['1', '2', '4'],
        '32': ['1', '2', '4', '8'],
        '64': ['1', '2', '4', '8', '16'],
    },
};

export class AnimSettingsManager {
    constructor(updateFunction) {
        this.rows = document.querySelectorAll(".selection-row");
        this.wordSizeRow = document.querySelector("#wordSizeSelector");
        this.numSegmentRow = document.querySelector("#segmentCountSelector");
        this.wahButton = document.querySelector("#wahButton");
        this.valButton = document.querySelector("#valButton");
        this.bbcButton = document.querySelector("#bbcButton");
        this.plwahButton = document.querySelector("#plwahButton");
        this.updateFunction = typeof updateFunction === 'function' ? updateFunction : () => {};

        this.init();
    }

    init() {
        this.initButtonHighlighting();
        this.initCompressionRow();	
        this.initWordSizeRow();
        this.initNumSegmentRow();
        this.restoreSelections();
    }

    initButtonHighlighting() {
        this.rows.forEach(row => {
            row.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    this.clearRowSelections(row);
                    button.classList.add('active');
                });
            })
        });
    }

    initCompressionRow() {
        const toggleWordSizeButtons = document.querySelectorAll('#wordSize16Button, #wordSize32Button, ' 
                                                                + '#wordSize64Button');
        const segmentButtons = this.numSegmentRow.querySelectorAll('.btn');

        const compressionButtonClickAction = (type) => {
            let settings = this.getSettings();
            toggleWordSizeButtons.forEach(button => {
                button.style.display = (type == 'bbc') ? 'none' : 'flex';
            });
            if (type == 'val') {
                segmentButtons.forEach(button => {
                    button.style.display = 'none';
                });
                const wordSize = settings.wordSize.toString();
                if (ANIM_CONFIG.WORD_SIZE_SEGMENTS[wordSize]) {
                    ANIM_CONFIG.WORD_SIZE_SEGMENTS[wordSize].forEach(segmentCount => {
                        const btn = [...segmentButtons].find(b => b.textContent == segmentCount);
                        if (btn) {
                            btn.style.display = 'flex';
                        }
                    });
                }
                // Set numSegments to 2 and select the button
                settings.numSegments = 2;
                this.selectButton(this.numSegmentRow, 2);
            } else {
                segmentButtons.forEach(button => {
                    button.style.display = 'none';
                });
            }
            settings.compressionMethod = type;
            // Remove 'active' class from all compression buttons
            this.wahButton.classList.remove('active');
            this.valButton.classList.remove('active');
            this.bbcButton.classList.remove('active');
            this.plwahButton.classList.remove('active');
            // Add 'active' class to the clicked button
            const clickedButton = document.querySelector(`#${type}Button`);
            if (clickedButton) {
                clickedButton.classList.add('active');
            }
            this.saveSettings(settings);
            this.updateFunction();
        }

        this.wahButton.addEventListener("click", () => {
            compressionButtonClickAction('wah');
        });
        this.valButton.addEventListener("click", () => {
            compressionButtonClickAction('val');
        });
        this.bbcButton.addEventListener("click", () => {
            compressionButtonClickAction('bbc');
        });
        this.plwahButton.addEventListener("click", () => {
            compressionButtonClickAction('plwah');
        });
    }

    initWordSizeRow() {
        const wordSizeButtonClickAction = (wsBtn) => {
            const wordSize = wsBtn.textContent;
            let settings = this.getSettings();
            settings.wordSize = parseInt(wordSize);
            if (settings.compressionMethod == 'val') {
                this.numSegmentRow.querySelectorAll('.btn').forEach(button => {
                    button.classList.remove('active');
                    button.style.display = 'none';
                });
                ANIM_CONFIG.WORD_SIZE_SEGMENTS[wordSize].forEach(segmentCount => {
                    const btn = [...this.numSegmentRow.querySelectorAll('.btn')]
                        .find(b => b.textContent == segmentCount);
                    if (btn) {
                        btn.style.display = 'flex';
                    }
                });
                // Set numSegments to 2 and select the button
                settings.numSegments = 2;
                this.selectButton(this.numSegmentRow, settings.numSegments);
            }
            this.saveSettings(settings);
            this.updateFunction();
        }

        this.wordSizeRow.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => wordSizeButtonClickAction(btn));
        });
    }

    initNumSegmentRow() {
        this.numSegmentRow.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                let settings = this.getSettings();
                settings.numSegments = parseInt(btn.textContent);
                this.saveSettings(settings);
                this.updateFunction();
            });
        });
    }

    clearRowSelections(row) {
        row.querySelectorAll('button').forEach(button => button.classList.remove('active'));
    }

    selectButton(row, buttonValue) {
        row.querySelectorAll('button').forEach(button => button.classList.remove('active'));
        const button = [...row.querySelectorAll('button')].find(b => b.textContent == buttonValue);
        if (button) {
            button.classList.add('active');
        }
    }

    getSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('animSettings'));
        if (savedSettings) {
            return savedSettings;
        } else {
            return ANIM_CONFIG.DEFAULT_SETTINGS;
        }
    }

    saveSettings(settings) {
        localStorage.setItem('animSettings', JSON.stringify(settings));
    }

    restoreSelections() {
        // Remove 'active' class from all compression buttons
        this.wahButton.classList.remove('active');
        this.valButton.classList.remove('active');
        this.bbcButton.classList.remove('active');
        this.plwahButton.classList.remove('selected');

        // Restore compression method selection
        const compressionMethod = this.getSettings().compressionMethod;
        const compressionButton = document.querySelector(`#${compressionMethod}Button`);
        if (compressionButton) {
            compressionButton.classList.add('active');
        }

        // Adjust word size and segment buttons visibility based on compression method
        const toggleWordSizeButtons = document.querySelectorAll('#wordSize16Button, #wordSize32Button, #wordSize64Button');
        const segmentButtons = this.numSegmentRow.querySelectorAll('.btn');

        if (compressionMethod === 'bbc') {
            toggleWordSizeButtons.forEach(button => {
                button.style.display = 'none';
            });
            segmentButtons.forEach(button => {
                button.style.display = 'none';
            });
        } else if (compressionMethod === 'val') {
            toggleWordSizeButtons.forEach(button => {
                button.style.display = 'flex';
            });
            segmentButtons.forEach(button => {
                button.style.display = 'none';
            });
            const wordSize = this.getSettings().wordSize.toString();
            if (ANIM_CONFIG.WORD_SIZE_SEGMENTS[wordSize]) {
                ANIM_CONFIG.WORD_SIZE_SEGMENTS[wordSize].forEach(segmentCount => {
                    const btn = [...segmentButtons].find(b => b.textContent == segmentCount);
                    if (btn) {
                        btn.style.display = 'flex';
                    }
                });
            }
            // Ensure numSegments is active
            this.selectButton(this.numSegmentRow, this.getSettings().numSegments);
        } else if (compressionMethod === 'wah') {
            toggleWordSizeButtons.forEach(button => {
                button.style.display = 'flex';
            });
            segmentButtons.forEach(button => {
                button.style.display = 'none';
            });
        }

        // Restore word size selection
        this.clearRowSelections(this.wordSizeRow);
        this.selectButton(this.wordSizeRow, this.getSettings().wordSize);

        // Restore number of segments selection
        this.clearRowSelections(this.numSegmentRow);
        this.selectButton(this.numSegmentRow, this.getSettings().numSegments);
    }
}

const compressionSettings = {
    compressionMethod: 'wah',
    wordSize: 8,
    numSegments: 2
};

export const getStoredCompressionSettings = () => {
    const savedSettings = JSON.parse(localStorage.getItem('compressionSettings'));

    if (savedSettings) {
        return savedSettings;
    } else {
        return compressionSettings;
    }
};
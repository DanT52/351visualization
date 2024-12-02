export const numberToPlaceString = (x) => {
    if (x >= 11 && x <= 19) {
        return `${x}th`;
    }

    switch (x % 10) {
        case 1: return `${x}st`;
        case 2: return `${x}nd`;
        case 3: return `${x}rd`;
        default: return `${x}th`;
    }
};
export function formatNumber(num: number): string {
    if (num < 1000) {
        // For small numbers, just show integer or maybe 1 decimal if < 10?
        // Let's stick to integer for consistency with previous behavior, 
        // but maybe 2 decimals for money?
        // The previous code used toLocaleString() which usually does 3 decimal places for thousands but 
        // for small numbers it depends.
        // Let's just return toLocaleString for < 1000 to keep it simple, or just standard formatting.
        // Actually, for consistency with "1.23k", we might want decimals.
        // But if I have 10 rubberbands, "10.00" looks weird. "10" is better.
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(2).replace(/\.00$/, '');
    }

    const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    let suffixNum = Math.floor(Math.log10(num) / 3);

    let shortValue = num / Math.pow(1000, suffixNum);

    // Check if rounding pushes it to the next level (e.g. 999.99k -> 1000.00k -> 1.00M)
    if (parseFloat(shortValue.toFixed(2)) >= 1000 && suffixNum < suffixes.length - 1) {
        shortValue /= 1000;
        suffixNum++;
    }

    if (suffixNum >= suffixes.length) {
        return num.toExponential(2);
    }

    return shortValue.toFixed(2) + suffixes[suffixNum];
}

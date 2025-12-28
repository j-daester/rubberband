export function formatNumber(num: number, suffixes: string[] = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']): string {
    if (num < 1000) {
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(2).replace(/\.00$/, '');
    }

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

    // Floor to 2 decimal places
    const floored = Math.floor(shortValue * 100) / 100;
    return floored.toFixed(2) + suffixes[suffixNum];
}

export function formatMoney(num: number, suffixes?: string[]): string {
    if (num < 1000) {
        return num.toFixed(2) + 'ⓒ';
    }

    return formatNumber(num, suffixes) + 'ⓒ';
}

export function formatWeight(num: number, suffixes: string[] = ['t', 'kt', 'Mt', 'Gt', 'Tt', 'Pt', 'Et', 'Zt', 'Yt']): string {
    if (num < 1000) {
        return Math.floor(num) + ' g';
    }
    if (num < 1000000) {
        return (num / 1000).toFixed(2) + ' kg';
    }

    // For tonnes and above, we start dividing by 1,000,000
    // 1,000,000 g = 1 t
    return formatNumber(num / 1000000, suffixes);
}

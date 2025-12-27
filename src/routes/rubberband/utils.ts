export function formatNumber(num: number): string {
    if (num < 1000) {
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

    // Floor to 2 decimal places
    const floored = Math.floor(shortValue * 100) / 100;
    return floored.toFixed(2) + suffixes[suffixNum];
}

export function formatMoney(num: number): string {
    const formattedNum = formatNumber(num);
    // Ensure two decimal places if it's a small number, as per request for currency
    // The user requested xxx.xxⓒ. 
    // formatNumber logic:
    // < 1000: integer or 2 decimals (stripped of .00)
    // >= 1000: 2 decimals + suffix.

    // We want to verify if formatNumber returns something like "100" we might want "100.00".
    // But formatNumber removes .00.
    // Let's rely on formatNumber for now, but append the suffix.
    // If exact xxx.xx format is strict for all numbers, we might need to adjust.
    // User said "use the format xxx.xxⓒ for the currency". This implies 2 decimals always? "xxx.xx".
    // Let's force decimals for money.

    if (num < 1000) {
        return num.toFixed(2) + 'ⓒ';
    }

    // For large numbers, formatNumber returns e.g. "1.23M".
    // This has decimals.
    // If it returns "100k", does formatNumber do that? 
    // formatNumber does `floored.toFixed(2) + suffix`. So yes, "100.00k".
    // Wait, line 32 in utils.ts: `return floored.toFixed(2) + suffixes[suffixNum];`.
    // It seems formatNumber ALREADY enforces 2 decimals for large numbers.
    // So only for < 1000 we need to be careful.

    // Let's just reimplement a simple check here or reuse logic.
    // But better to not duplicate too much.

    // Let's trust formatNumber BUT for < 1000 we manually do toFixed(2).
    if (num < 1000) {
        return num.toFixed(2) + 'ⓒ';
    }

    return formatNumber(num) + 'ⓒ';
}

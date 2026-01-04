export function formatNumber(num: number, suffixes: string[] = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']): string {
    if (num === Infinity) return '∞';
    if (Number.isNaN(num)) return 'NaN';
    if (!Number.isFinite(num)) {
        return '0' + suffixes[0];
    }
    if (num < 0) {
        return '-' + formatNumber(-num, suffixes);
    }
    if (num < 1000) {
        const val = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.00$/, '');
        return val + suffixes[0];
    }

    let suffixNum = Math.floor(Math.log10(num) / 3);

    // If number is too large for suffixes, use scientific notation
    if (suffixNum >= suffixes.length) {
        return num.toExponential(2);
    }

    let shortValue = num / Math.pow(1000, suffixNum);

    // Check if rounding pushes it to the next level (e.g. 999.99k -> 1000.00k -> 1.00M)
    if (parseFloat(shortValue.toFixed(2)) >= 1000 && suffixNum < suffixes.length - 1) {
        shortValue /= 1000;
        suffixNum++;
    }

    // Floor to 2 decimal places
    const floored = Math.floor(shortValue * 100) / 100;
    return floored.toFixed(2) + suffixes[suffixNum];
}

export function formatMoney(num: number, suffixes?: string[]): string {
    if (Math.abs(num) < 1000) {
        return num.toFixed(2) + '🪙';
    }

    return formatNumber(num, suffixes) + '🪙';
}

export function formatWeight(num: number): string {
    // User requested "Gramm" as unit.
    // We will use standard metric prefixes for grams: g, kg, Mg, Gg, Tg, Pg, Eg, Zg, Yg
    const suffixes = ['g', 'kg', 'Mg', 'Gg', 'Tg', 'Pg', 'Eg', 'Zg', 'Yg'];
    return formatNumber(num, suffixes);
}

export function formatVolume(num: number): string {
    // User requested "Liter" as unit.
    const suffixes = ['l', 'kl', 'Ml', 'Gl', 'Tl', 'Pl', 'El', 'Zl', 'Yl'];
    return formatNumber(num, suffixes);
}

export function formatArea(num: number): string {
    const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    return formatNumber(num, suffixes) + ' m²';
}

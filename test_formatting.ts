import { formatNumber } from './src/routes/rubberband/utils';

const testCases = [
    { input: 1999.99, expected: "1.99k" },
    { input: 2000, expected: "2k" },
    { input: 1234567, expected: "1.23M" },
    { input: 10, expected: "10" },
    { input: 1.234, expected: "1.23" },
    { input: 0.999, expected: "0.99" },
    { input: 1000.001, expected: "1.00k" },
    { input: 999.999, expected: "999.99" }
];

console.log("Running formatNumber tests...");
let failed = false;

testCases.forEach(({ input, expected }) => {
    const result = formatNumber(input);
    if (result !== expected) {
        console.error(`FAILED: Input ${input}. Expected "${expected}", got "${result}"`);
        failed = true;
    } else {
        console.log(`PASSED: Input ${input} -> "${result}"`);
    }
});

if (failed) {
    console.error("Some tests failed.");
    process.exit(1);
} else {
    console.log("All tests passed.");
}

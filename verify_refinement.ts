import { Game } from './src/routes/rubberband/game';
import { GAME_CONSTANTS } from './src/routes/rubberband/parameters';

const game = new Game();
// Cheat money
game.money = 1000000;

console.log("=== Refined Verification Start ===");

// 1. Initial State Limit
console.log("--- Initial Limit ---");
const initialLimit = game.maxRubber;
console.log(`Initial Max Rubber (Expect ${GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION}):`, initialLimit);
if (initialLimit === GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION) {
    console.log("PASS: Initial max rubber correct");
} else {
    console.log("FAIL: Initial max rubber incorrect");
}

// 2. Manual Buy Clamping
console.log("\n--- Manual Buy Clamping ---");
// Try to buy 1000 rubber (far exceeding limit)
const buyResult = game.buyRubber(1000);
console.log("Attempted buy 1000 rubber. Result:", buyResult);
console.log("Rubber Amount:", game.rubber);

if (game.rubber === initialLimit) {
    console.log("PASS: Rubber clamped to limit");
} else {
    console.log("FAIL: Rubber NOT clamped to limit");
}

// 3. Auto Buy Clamping
console.log("\n--- Auto Buy Clamping ---");
game.rubber = 0; // Reset rubber
game.buyerHired = true;
game.buyerThreshold = 10000; // Auto buy wants 10k
console.log("Buyer Threshold set to:", game.buyerThreshold);

game.tick(); // Trigger auto buy

console.log("Rubber after tick (Auto Buy):", game.rubber);
if (game.rubber <= initialLimit) {
    console.log("PASS: Auto buy respected limit");
} else {
    console.log("FAIL: Auto buy exceeded limit");
}

// 4. Dynamic Limit with Plantation
console.log("\n--- Dynamic Limit ---");
// Unlock plantations
game.totalRubberbandsSold = 10000;
const plantationName = "Rubbertree Plantation";
game.buyPlantation(plantationName, 1);
console.log("Bought 1 Plantation. Production:", game.plantationProductionRate);

const newLimit = game.maxRubber;
const expectedLimit = GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION + 10; // 10 is output
console.log(`New Max Rubber (Expect ${expectedLimit}):`, newLimit);

if (newLimit === expectedLimit) {
    console.log("PASS: Max rubber increased dynamically");
} else {
    console.log("FAIL: Max rubber did not update correctly");
}

// Test buying up to new limit
game.rubber = 0;
game.buyRubber(1000);
console.log("Rubber after huge buy with plantation:", game.rubber);
if (game.rubber === newLimit) {
    console.log("PASS: Buy clamped to new dynamic limit");
} else {
    console.log("FAIL: Buy did not respect new dynamic limit");
}

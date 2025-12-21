
import { Game } from './game';

const game = new Game();
// Default marketing level is 1. Base value is 1.5.

console.log("Marketing Level:", game.marketingLevel);

const prices = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];

console.log("Price | Demand (Exponential)");
console.log("----------------------------");

for (const price of prices) {
    game.setRubberbandPrice(price);
    // Directly access the getter
    const demand = game.demand;
    console.log(`${price.toFixed(1).padEnd(5)} | ${demand}`);
}

// Test with higher marketing level
game.marketingLevel = 5;
console.log("\nMarketing Level: 5");
console.log("Price | Demand (Exponential)");
console.log("----------------------------");
for (const price of prices) {
    game.setRubberbandPrice(price);
    const demand = game.demand;
    console.log(`${price.toFixed(1).padEnd(5)} | ${demand}`);
}

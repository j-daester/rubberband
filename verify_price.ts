
import { Game } from './src/routes/rubberband/game';

const game = new Game();

console.log('Initial State:');
console.log(`Price: ${game.rubberbandPrice}`);
console.log(`Marketing Level: ${game.marketingLevel}`);
console.log(`Demand: ${game.demand}`);

// Expected demand: floor(3^1 / 1.0 * 10) = 30
if (game.demand !== 30) {
    console.error(`FAIL: Expected demand 30, got ${game.demand}`);
    process.exit(1);
}

console.log('\nSetting Price to 0.5...');
game.setRubberbandPrice(0.5);
console.log(`Price: ${game.rubberbandPrice}`);
console.log(`Demand: ${game.demand}`);

// Expected demand: floor(3^1 / 0.5 * 10) = floor(3 / 0.5 * 10) = 60
if (game.demand !== 60) {
    console.error(`FAIL: Expected demand 60, got ${game.demand}`);
    process.exit(1);
}

console.log('\nSetting Price to 2.0...');
game.setRubberbandPrice(2.0);
console.log(`Price: ${game.rubberbandPrice}`);
console.log(`Demand: ${game.demand}`);

// Expected demand: floor(3^1 / 2.0 * 10) = floor(3 / 2 * 10) = 15
if (game.demand !== 15) {
    console.error(`FAIL: Expected demand 15, got ${game.demand}`);
    process.exit(1);
}

console.log('\nTesting Sales...');
game.rubberbands = 100;
game.money = 0;
game.setRubberbandPrice(1.0); // Demand 30
game.tick();

console.log(`Rubberbands: ${game.rubberbands}`);
console.log(`Money: ${game.money}`);

// Should sell 30 (demand)
// Remaining: 70
// Money: 30 * 1.0 = 30
if (game.rubberbands !== 70) {
    console.error(`FAIL: Expected 70 rubberbands, got ${game.rubberbands}`);
    process.exit(1);
}
if (game.money !== 30) {
    console.error(`FAIL: Expected 30 money, got ${game.money}`);
    process.exit(1);
}

console.log('\nTesting Sales with Price 2.0...');
game.rubberbands = 100;
game.money = 0;
game.setRubberbandPrice(2.0); // Demand 15
game.tick();

console.log(`Rubberbands: ${game.rubberbands}`);
console.log(`Money: ${game.money}`);

// Should sell 15 (demand)
// Remaining: 85
// Money: 15 * 2.0 = 30
if (game.rubberbands !== 85) {
    console.error(`FAIL: Expected 85 rubberbands, got ${game.rubberbands}`);
    process.exit(1);
}
if (game.money !== 30) {
    console.error(`FAIL: Expected 30 money, got ${game.money}`);
    process.exit(1);
}

console.log('\nALL TESTS PASSED');

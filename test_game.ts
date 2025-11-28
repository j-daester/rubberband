import { Game } from './src/routes/rubberband/game';

console.log('Testing Game class JSON serialization...');

// 1. Test default initialization
const game1 = new Game();
console.log('Default Game initialized.');
if (game1.money !== 100) console.error('FAIL: Initial money should be 100');

// 2. Test JSON serialization
game1.money = 500;
game1.rubberbands = 200;
const jsonString = game1.toString();
console.log('Serialized JSON:', jsonString);

if (!jsonString.startsWith('{')) console.error('FAIL: Serialized string should start with {');

// 3. Test JSON deserialization
const game2 = new Game(jsonString);
console.log('Deserialized Game initialized.');

if (game2.money !== 500) console.error(`FAIL: Money should be 500, got ${game2.money}`);
if (game2.rubberbands !== 200) console.error(`FAIL: Rubberbands should be 200, got ${game2.rubberbands}`);

console.log('Tests completed.');

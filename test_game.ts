import { Game } from './src/routes/rubberband/game';

const game = new Game();
game.money = 10000; // Give lots of money

console.log('Initial money:', game.money);
console.log('Initial Bander 100:', game.machines['Bander 100']);

const bought1 = game.buyMachine('Bander 100');
console.log('Bought 1:', bought1);
console.log('Bander 100 count:', game.machines['Bander 100']);

const bought2 = game.buyMachine('Bander 100');
console.log('Bought 2:', bought2);
console.log('Bander 100 count:', game.machines['Bander 100']);

const bought3 = game.buyMachine('Bander 100');
console.log('Bought 3:', bought3);
console.log('Bander 100 count:', game.machines['Bander 100']);

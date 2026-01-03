import { Game } from './game';
import { researchList } from './parameters';

const game = new Game();
// Cheat money
game.money = 10000;

console.log("Initial researched:", game.researched);

// Helper to simulate UI visibility logic
function isResearchVisible(game: Game, research: any) {
    if (!research.precondition_research) return true;
    return game.researched.includes(research.precondition_research);
}

// Check visibility before buying
console.log("\nBefore buying Basic Manufacturing:");
researchList.forEach(r => {
    if (isResearchVisible(game, r)) {
        console.log(`- [Visible] ${r.name} (${r.id})`);
    } else {
        // console.log(`- [Hidden] ${r.name}`);
    }
});

// Buy Basic Manufacturing
console.log("\nBuying Basic Manufacturing...");
const success = game.buyResearch('basic_manufacturing');
console.log("Purchase success:", success);
console.log("Researched:", game.researched);

// Check visibility after buying
console.log("\nAfter buying Basic Manufacturing:");
researchList.forEach(r => {
    if (isResearchVisible(game, r)) {
        console.log(`- [Visible] ${r.name} (${r.id})`);
    } else {
        console.log(`- [Hidden] ${r.name} (Requires: ${r.precondition_research})`);
    }
});

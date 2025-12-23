import { machineTypes, productionLines, plantationTypes, researchList, GAME_CONSTANTS, getCost, getMaxAffordable, type PlantationType, type ResearchType } from './parameters';

export type MachineName = typeof machineTypes[number]['name'];

export interface GameState {
	money: number;
	rubberbands: number;
	rubber: number;
	machines: Record<string, number>;
	purchasedMachines: Record<string, number>;
	totalRubberbandsSold: number;
	buyerHired: boolean;
	buyerThreshold: number;
	rubberPrice: number;
	rubberbandPrice: number;
	tickCount: number;
	marketingLevel: number;
	machineProductionLines: Record<string, number>;
	plantations: Record<string, number>;
	purchasedPlantations: Record<string, number>;
	researched: string[];
	gameOver: boolean;
}

export class Game {
	money!: number;
	rubberbands!: number;
	rubber!: number;
	machines!: Record<string, number>;
	purchasedMachines!: Record<string, number>;
	totalRubberbandsSold!: number;
	buyerHired!: boolean;
	buyerThreshold!: number;
	rubberPrice!: number;
	rubberbandPrice!: number;
	tickCount!: number;
	marketingLevel!: number;
	machineProductionLines!: Record<string, number>;
	plantations!: Record<string, number>;
	purchasedPlantations!: Record<string, number>;
	researched!: string[];
	gameOver!: boolean;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 */
	constructor(serialized: string | undefined = undefined) {
		if (serialized) {
			try {
				const data = JSON.parse(serialized) as GameState;
				this.money = data.money || GAME_CONSTANTS.INITIAL_MONEY;
				this.rubberbands = data.rubberbands || 0;
				this.rubber = data.rubber || 0;
				this.machines = data.machines || {};
				this.totalRubberbandsSold = data.totalRubberbandsSold || 0;
				this.buyerHired = data.buyerHired || false;
				this.buyerThreshold = data.buyerThreshold || 0;
				this.rubberPrice = data.rubberPrice || GAME_CONSTANTS.INITIAL_RUBBER_PRICE;
				this.rubberbandPrice = data.rubberbandPrice || GAME_CONSTANTS.INITIAL_RUBBERBAND_PRICE;
				this.tickCount = data.tickCount || 0;
				this.marketingLevel = data.marketingLevel || GAME_CONSTANTS.INITIAL_MARKETING_LEVEL;
				this.machineProductionLines = data.machineProductionLines || {};
				this.plantations = data.plantations || {};
				this.purchasedMachines = data.purchasedMachines || { ...this.machines };
				this.purchasedPlantations = data.purchasedPlantations || { ...this.plantations };
				this.researched = data.researched || [];
				this.gameOver = data.gameOver || false;
				// Migration from old save if needed
				if ((data as any).machineProductionLineCount && !this.machineProductionLines["Bander 100 Line"]) {
					this.machineProductionLines["Bander 100 Line"] = (data as any).machineProductionLineCount;
				}
				// Migration from previous refactor (machine name keys to production line name keys)
				for (const line of productionLines) {
					if (this.machineProductionLines[line.machine] && !this.machineProductionLines[line.name]) {
						this.machineProductionLines[line.name] = this.machineProductionLines[line.machine];
						delete this.machineProductionLines[line.machine];
					}
				}
				// Migration for typo fix "Syntetic" -> "Synthetic"
				if (this.plantations["Syntetic Rubber Factory"]) {
					this.plantations["Synthetic Rubber Factory"] = (this.plantations["Synthetic Rubber Factory"] || 0) + this.plantations["Syntetic Rubber Factory"];
					delete this.plantations["Syntetic Rubber Factory"];
				}
			} catch (e) {
				console.error('Failed to parse save game', e);
				this.reset();
			}
		} else {
			this.reset();
		}
	}

	reset() {
		this.money = GAME_CONSTANTS.INITIAL_MONEY;
		this.rubberbands = 0;
		this.rubber = 0;
		this.totalRubberbandsSold = 0;
		this.machines = {};

		for (const machine of machineTypes) {
			this.machines[machine.name] = 0;
		}
		this.purchasedMachines = { ...this.machines };
		this.buyerHired = false;
		this.buyerThreshold = 0;
		this.rubberPrice = GAME_CONSTANTS.INITIAL_RUBBER_PRICE;
		this.rubberbandPrice = GAME_CONSTANTS.INITIAL_RUBBERBAND_PRICE;
		this.marketingLevel = GAME_CONSTANTS.INITIAL_MARKETING_LEVEL;
		this.tickCount = 0;
		this.tickCount = 0;
		this.machineProductionLines = {};
		this.plantations = {};
		this.purchasedPlantations = {};
		this.researched = [];
		this.gameOver = false;
	}

	getMachineOutputPerUnit(machineName: string) {
		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return 0;

		let output = machine.output;
		if (this.researched.includes('robotics')) {
			output *= 2;
		}
		return output;
	}

	get productionRate() {
		let rate = 0;
		for (const machine of machineTypes) {
			rate += (this.machines[machine.name] || 0) * this.getMachineOutputPerUnit(machine.name);
		}
		return rate;
	}

	get level() {
		const thresholdLvl2 = GAME_CONSTANTS.LEVEL_REQ_BASE - GAME_CONSTANTS.LEVEL_REQ_OFFSET;
		if (this.totalRubberbandsSold < thresholdLvl2) return 1;
		return 2 + Math.floor(Math.log((this.totalRubberbandsSold + GAME_CONSTANTS.LEVEL_REQ_OFFSET) / GAME_CONSTANTS.LEVEL_REQ_BASE) / Math.log(GAME_CONSTANTS.LEVEL_DIFFICULTY_FACTOR));
	}

	get nextLevelRequirement() {
		return Math.floor(GAME_CONSTANTS.LEVEL_REQ_BASE * Math.pow(GAME_CONSTANTS.LEVEL_DIFFICULTY_FACTOR, this.level - 1) - GAME_CONSTANTS.LEVEL_REQ_OFFSET);
	}

	get demand() {
		let basevalue = 1.1;
		if (this.researched.includes('online_marketing')) {
			basevalue *= 2;
		}
		if (this.researched.includes('hyperpersonalisation')) {
			basevalue *= 2;
		}
		if (this.researched.includes('brainwashing')) {
			basevalue *= 2;
		}
		if (this.researched.includes('hypnosis')) {
			basevalue *= 2;
		}
		if (this.researched.includes('mind_control')) {
			basevalue *= 2;
		}
		// Exponential demand curve: Demand ~ e^(-price)
		// Calibrated with constant 30 to match previous values at reasonable prices (e.g., price ~1.0)
		let demand = Math.floor(Math.pow(this.marketingLevel, basevalue) * 30 * Math.exp(-this.rubberbandPrice));
		return demand;
	}

	get marketingCost() {
		return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(1.5, this.marketingLevel);
	}

	get maintenanceCost() {
		let cost = 0;
		for (const machine of machineTypes) {
			cost += (this.machines[machine.name] || 0) * machine.maintenance_cost;
		}
		for (const plantation of plantationTypes) {
			cost += (this.plantations[plantation.name] || 0) * plantation.maintenance_cost;
		}
		return cost;
	}

	tick() {
		if (this.gameOver) return;

		if (this.level >= 100) {
			this.gameOver = true;
			return;
		}

		this.tickCount++;

		this.updateMarket();
		this.produceResources();
		this.produceRubberFromPlantations();
		this.produceMachines();
		this.handleAutoBuy();
		this.handleAutoSell();

		this.money -= this.maintenanceCost;
	}

	private produceMachines() {
		for (const line of productionLines) {
			const count = this.machineProductionLines[line.name] || 0;
			if (count > 0) {
				const amount = count * line.output;
				if (line.product_type === 'plantation') {
					this.plantations[line.machine] = (this.plantations[line.machine] || 0) + amount;
				} else {
					this.machines[line.machine] = (this.machines[line.machine] || 0) + amount;
				}

			}
		}
	}

	getPlantationOutputPerUnit(plantationName: string) {
		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return 0;

		let output = plantation.output;
		if (this.researched.includes('rubber_recycling')) {
			output *= 2;
		}
		if (this.researched.includes('robotics')) {
			output *= 5;
		}
		return output;
	}

	get plantationProductionRate() {
		let rate = 0;
		for (const plantation of plantationTypes) {
			rate += (this.plantations[plantation.name] || 0) * this.getPlantationOutputPerUnit(plantation.name);
		}
		return rate;
	}

	get rubberShortage() {
		const production = this.productionRate;
		const plantation = this.plantationProductionRate;
		const autoBuyCapacity = this.buyerHired ? GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION : 0;

		return production > (plantation + Math.min(autoBuyCapacity, this.buyerThreshold));
	}

	get maxRubber() {
		return GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION + this.plantationProductionRate;
	}

	private produceRubberFromPlantations() {
		const production = this.plantationProductionRate;
		if (production > 0) {
			this.rubber += production;
		}
	}

	private updateMarket() {
		if (this.tickCount % GAME_CONSTANTS.PRICE_FLUCTUATION_INTERVAL === 0) {
			// Fluctuate price +/- 5%
			this.rubberPrice *= 0.95 + Math.random() * 0.1;
			// Clamp price
			if (this.rubberPrice < GAME_CONSTANTS.MIN_RUBBER_PRICE) this.rubberPrice = GAME_CONSTANTS.MIN_RUBBER_PRICE;
			if (this.rubberPrice > GAME_CONSTANTS.MAX_RUBBER_PRICE) this.rubberPrice = GAME_CONSTANTS.MAX_RUBBER_PRICE;
		}
	}

	private produceResources() {
		const production = this.productionRate;
		if (this.rubber >= production) {
			this.rubber -= production;
			this.rubberbands += production;
		} else {
			// Produce as much as we can with remaining rubber
			this.rubberbands += this.rubber;
			this.rubber = 0;
		}
	}

	private handleAutoBuy() {
		if (this.buyerHired && this.rubber < this.buyerThreshold) {
			const needed = this.buyerThreshold - this.rubber;
			// Limit buying speed to MAX_RUBBER_NO_PRODUCTION per tick
			const buyAmount = Math.min(needed, GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION);

			if (buyAmount > 0) {
				this.buyRubber(buyAmount);
			}
		}
	}

	private handleAutoSell() {
		// Auto sell based on demand
		const sellAmount = Math.min(this.rubberbands, this.demand);
		if (sellAmount > 0) {
			this.sellRubberbands(sellAmount);
		}
	}

	makeRubberband(amount: number = 1) {
		if (this.gameOver) return;
		if (this.rubber >= amount) {
			this.rubber -= amount;
			this.rubberbands += amount;
		}
	}

	buyRubber(amount: number) {
		if (this.gameOver) return false;

		const limit = this.maxRubber;
		if (this.rubber >= limit) return false;

		// Clamp amount to not exceed limit
		let amountToBuy = amount;
		if (this.rubber + amountToBuy > limit) {
			amountToBuy = limit - this.rubber;
		}

		if (amountToBuy <= 0) return false;

		const cost = amountToBuy * this.rubberPrice;
		if (this.money >= cost) {
			this.money -= cost;
			this.rubber += amountToBuy;
			return true;
		}
		return false;
	}

	getMachineCost(machineName: string, amount: number, currentCount?: number) {
		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.purchasedMachines[machineName] || 0);
		return getCost(machine, amount, count);
	}

	getMaxAffordable(machineName: string, currentMoney?: number, currentCount?: number) {
		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return 0;

		const count = currentCount !== undefined ? currentCount : (this.purchasedMachines[machineName] || 0);
		const money = currentMoney !== undefined ? currentMoney : this.money;

		return getMaxAffordable(machine, money, count);
	}

	isBeingProduced(itemName: string) {
		for (const line of productionLines) {
			if (line.machine === itemName && (this.machineProductionLines[line.name] || 0) > 0) {
				return true;
			}
		}
		return false;
	}

	buyMachine(machineName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(machineName)) return false;

		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return false;

		if (this.level < machine.unlock_level) return false;

		const cost = this.getMachineCost(machineName, amount);

		if (this.money >= cost) {
			this.money -= cost;
			this.machines[machineName] = (this.machines[machineName] || 0) + amount;
			this.purchasedMachines[machineName] = (this.purchasedMachines[machineName] || 0) + amount;
			return true;
		}

		return false;
	}

	sellRubberbands(amount: number) {
		if (this.gameOver) return false;
		if (this.rubberbands >= amount) {
			this.rubberbands -= amount;
			this.money += amount * this.rubberbandPrice;
			this.totalRubberbandsSold += amount;
			return true;
		}
		return false;
	}

	hireBuyer() {
		if (this.gameOver) return false;
		if (this.level >= GAME_CONSTANTS.BUYER_UNLOCK_LEVEL && !this.buyerHired && this.money >= GAME_CONSTANTS.BUYER_COST) {
			this.money -= GAME_CONSTANTS.BUYER_COST;
			this.buyerHired = true;
			return true;
		}
		return false;
	}

	setBuyerThreshold(amount: number) {
		this.buyerThreshold = amount;
	}

	buyMarketing() {
		if (this.gameOver) return false;
		const cost = this.marketingCost;
		if (this.money >= cost) {
			this.money -= cost;
			this.marketingLevel++;
			return true;
		}
		return false;
	}

	getMachineProductionLineCost(lineName: string, amount: number, currentCount?: number) {
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.machineProductionLines[lineName] || 0);
		return getCost(line, amount, count);
	}

	getMaxAffordableProductionLine(lineName: string, currentMoney?: number, currentCount?: number) {
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return 0;

		const count = currentCount !== undefined ? currentCount : (this.machineProductionLines[lineName] || 0);
		const money = currentMoney !== undefined ? currentMoney : this.money;

		return getMaxAffordable(line, money, count);
	}

	buyMachineProductionLine(lineName: string, amount: number = 1) {
		if (this.gameOver) return false;
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return false;

		if (this.level < line.unlock_level) return false;

		const cost = this.getMachineProductionLineCost(lineName, amount);
		if (this.money >= cost) {
			this.money -= cost;
			this.machineProductionLines[lineName] = (this.machineProductionLines[lineName] || 0) + amount;
			return true;
		}
		return false;
	}

	getPlantationCost(plantationName: string, amount: number, currentCount?: number) {
		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.purchasedPlantations[plantationName] || 0);
		return getCost(plantation, amount, count);
	}

	getMaxAffordablePlantation(plantationName: string, currentMoney?: number, currentCount?: number) {
		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return 0;

		const count = currentCount !== undefined ? currentCount : (this.purchasedPlantations[plantationName] || 0);
		const money = currentMoney !== undefined ? currentMoney : this.money;

		return getMaxAffordable(plantation, money, count);
	}

	buyPlantation(plantationName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(plantationName)) return false;

		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return false;

		if (this.level < plantation.unlock_level) return false;

		const cost = this.getPlantationCost(plantationName, amount);
		if (this.money >= cost) {
			this.money -= cost;
			this.plantations[plantationName] = (this.plantations[plantationName] || 0) + amount;
			this.purchasedPlantations[plantationName] = (this.purchasedPlantations[plantationName] || 0) + amount;
			return true;
		}
		return false;
	}

	sellMachine(machineName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(machineName)) return false;

		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return false;

		const currentCount = this.machines[machineName] || 0;
		if (currentCount < amount) return false;

		// Calculate refund: 50% of the cost of the LAST 'amount' machines
		// The cost to buy the *existing* PRODUCED machines... wait.
		// If we are selling, we are reducing the count. The user wants the price to be "frozen" during production.
		// But sell is disabled during production. So "frozen price" is only for READ purposes during production.
		// When selling, we are OUT of production.
		// So we need to calculate refund based on PURCHASED count, because we only sell purchased machines (conceptually we sell any, but price scales on purchased).
		// Wait, if I have 100 machines (1 purchased, 99 produced).
		// Price is at level 1. I sell 1.
		// Refund should probably be based on level 1.
		// If I sell 1, purchased count goes to 0. Price drops to level 0.

		const purchasedCount = this.purchasedMachines[machineName] || 0;
		// Refund is based on purchased count logic?
		// "price continues to grow from the frozen price onwards for each bought machine afterwards"
		// If I sell, price should shrink.
		// Standard game logic: selling gives 50% of what it would cost to buy them back.
		// Cost to buy back is based on PURCHASED count.

		// We need to figure out how much refund.
		// getCost uses purchasedMachines count now.
		// So `getCost(machine, amount, purchasedCount - amount)` is the cost of the last `amount` purchased machines.
		// But what if I sell more than I purchased? e.g. Sell produced machines?
		// The prompt doesn't explicitly say what happens to produced machines price-wise.
		// But since price ONLY scales with manual purchases, produced machines effectively have "0 cost" impact on price.
		// So we shouldn't get refund for produced machines? Or we get refund based on current price?
		// Use case: I buy 1 machine (cost 100). Produced 10 machines. Total 11.
		// Sell 1. Refund 50. Total 10. Purchased 0.
		// Sell 1 again. Refund 50? Or 0?
		// If I sell a produced machine, I probably shouldn't get money back as if I bought it?
		// "Sell ... at half their purchase price". Produced machines have 0 purchase price.
		// So I only get refund if I decrement `purchased` count?
		// Let's assume yes. Refund is only for purchased items.

		const sellAmountFromPurchased = Math.min(amount, purchasedCount);

		let refund = 0;
		if (sellAmountFromPurchased > 0) {
			refund = Math.floor(0.5 * getCost(machine, sellAmountFromPurchased, purchasedCount - sellAmountFromPurchased));
			this.purchasedMachines[machineName] = purchasedCount - sellAmountFromPurchased;
		}

		this.machines[machineName] = currentCount - amount;
		this.money += refund;
		return true;
	}

	sellMachineProductionLine(lineName: string, amount: number = 1) {
		if (this.gameOver) return false;
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return false;

		const currentCount = this.machineProductionLines[lineName] || 0;
		if (currentCount < amount) return false;

		const refund = Math.floor(0.5 * getCost(line, amount, currentCount - amount));

		this.machineProductionLines[lineName] = currentCount - amount;
		this.money += refund;
		return true;
	}

	sellPlantation(plantationName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(plantationName)) return false;

		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return false;

		const currentCount = this.plantations[plantationName] || 0;
		if (currentCount < amount) return false;

		const purchasedCount = this.purchasedPlantations[plantationName] || 0;
		const sellAmountFromPurchased = Math.min(amount, purchasedCount);

		let refund = 0;
		if (sellAmountFromPurchased > 0) {
			refund = Math.floor(0.5 * getCost(plantation, sellAmountFromPurchased, purchasedCount - sellAmountFromPurchased));
			this.purchasedPlantations[plantationName] = purchasedCount - sellAmountFromPurchased;
		}

		this.plantations[plantationName] = currentCount - amount;
		this.money += refund;
		return true;
	}

	setRubberbandPrice(price: number) {
		this.rubberbandPrice = price;
		if (this.rubberbandPrice < GAME_CONSTANTS.MIN_RUBBERBAND_PRICE) this.rubberbandPrice = GAME_CONSTANTS.MIN_RUBBERBAND_PRICE;
	}

	buyResearch(researchId: string) {
		if (this.gameOver) return false;
		if (this.researched.includes(researchId)) return false;

		const research = researchList.find(r => r.id === researchId);
		if (!research) return false;

		if (this.level < research.unlock_level) return false;

		if (this.money >= research.cost) {
			this.money -= research.cost;
			this.researched.push(researchId);
			return true;
		}
		return false;
	}

	isPlantationUnlocked(plantation: PlantationType) {
		if (plantation.required_research) {
			return this.researched.includes(plantation.required_research);
		}
		return this.level >= plantation.unlock_level;
	}

	toJSON(): GameState {
		return {
			money: this.money,
			rubberbands: this.rubberbands,
			rubber: this.rubber,
			machines: this.machines,
			purchasedMachines: this.purchasedMachines,
			totalRubberbandsSold: this.totalRubberbandsSold,
			buyerHired: this.buyerHired,
			buyerThreshold: this.buyerThreshold,
			rubberPrice: this.rubberPrice,
			rubberbandPrice: this.rubberbandPrice,
			tickCount: this.tickCount,
			marketingLevel: this.marketingLevel,
			machineProductionLines: this.machineProductionLines,
			plantations: this.plantations,
			purchasedPlantations: this.purchasedPlantations,
			researched: this.researched,
			gameOver: this.gameOver
		};
	}

	/**
	 * Serialize game state
	 */
	toString() {
		return JSON.stringify(this.toJSON());
	}
}

import { machineTypes, productionLines, plantationTypes, GAME_CONSTANTS } from './parameters';

export type MachineName = typeof machineTypes[number]['name'];

export interface GameState {
	money: number;
	rubberbands: number;
	rubber: number;
	machines: Record<string, number>;
	totalRubberbandsSold: number;
	buyerHired: boolean;
	buyerThreshold: number;
	rubberPrice: number;
	rubberbandPrice: number;
	tickCount: number;
	marketingLevel: number;
	machineProductionLines: Record<string, number>;
	plantations: Record<string, number>;
	gameOver: boolean;
}

export class Game {
	money!: number;
	rubberbands!: number;
	rubber!: number;
	machines!: Record<string, number>;
	totalRubberbandsSold!: number;
	buyerHired!: boolean;
	buyerThreshold!: number;
	rubberPrice!: number;
	rubberbandPrice!: number;
	tickCount!: number;
	marketingLevel!: number;
	machineProductionLines!: Record<string, number>;
	plantations!: Record<string, number>;
	gameOver!: boolean;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 */
	constructor(serialized: string | undefined = undefined) {
		if (serialized) {
			try {
				const data = JSON.parse(serialized) as GameState;
				this.money = data.money;
				this.rubberbands = data.rubberbands;
				this.rubber = data.rubber;
				this.machines = data.machines;
				this.totalRubberbandsSold = data.totalRubberbandsSold;
				this.buyerHired = data.buyerHired;
				this.buyerThreshold = data.buyerThreshold;
				this.rubberPrice = data.rubberPrice;
				this.rubberbandPrice = data.rubberbandPrice;
				this.tickCount = data.tickCount;
				this.marketingLevel = data.marketingLevel;
				this.machineProductionLines = data.machineProductionLines || {};
				this.plantations = data.plantations || {};
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
		this.buyerHired = false;
		this.buyerThreshold = 0;
		this.rubberPrice = GAME_CONSTANTS.INITIAL_RUBBER_PRICE;
		this.rubberbandPrice = GAME_CONSTANTS.INITIAL_RUBBERBAND_PRICE;
		this.marketingLevel = GAME_CONSTANTS.INITIAL_MARKETING_LEVEL;
		this.tickCount = 0;
		this.tickCount = 0;
		this.machineProductionLines = {};
		this.plantations = {};
		this.gameOver = false;
	}

	get productionRate() {
		let rate = 0;
		for (const machine of machineTypes) {
			rate += (this.machines[machine.name] || 0) * machine.output;
		}
		return rate;
	}

	get level() {
		if (this.totalRubberbandsSold < 100) return 1;
		return 2 + Math.floor(Math.log(this.totalRubberbandsSold / 100) / Math.log(GAME_CONSTANTS.LEVEL_DIFFICULTY_FACTOR));
	}

	get nextLevelRequirement() {
		return Math.floor(100 * Math.pow(GAME_CONSTANTS.LEVEL_DIFFICULTY_FACTOR, this.level - 1));
	}

	get demand() {
		return Math.floor(Math.pow(3, this.marketingLevel) / this.rubberbandPrice * 10);
	}

	get marketingCost() {
		return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(2, this.marketingLevel);
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
				this.machines[line.machine] = (this.machines[line.machine] || 0) + amount;
			}
		}
	}

	get plantationProductionRate() {
		let rate = 0;
		for (const plantation of plantationTypes) {
			rate += (this.plantations[plantation.name] || 0) * plantation.output;
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

		const count = currentCount !== undefined ? currentCount : (this.machines[machineName] || 0);
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		if (r === 1) {
			return a * amount;
		}

		return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
	}

	getMaxAffordable(machineName: string, currentMoney?: number, currentCount?: number) {
		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return 0;

		const count = currentCount !== undefined ? currentCount : (this.machines[machineName] || 0);
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		const money = currentMoney !== undefined ? currentMoney : this.money;

		if (money < a) return 0;

		if (r === 1) {
			return Math.floor(this.money / a);
		}

		const n = Math.floor(Math.log(1 + this.money * (r - 1) / a) / Math.log(r));
		return n;
	}

	buyMachine(machineName: string, amount: number = 1) {
		if (this.gameOver) return false;
		const machine = machineTypes.find(m => m.name === machineName);
		if (!machine) return false;

		if (this.level < machine.unlock_level) return false;

		const cost = this.getMachineCost(machineName, amount);

		if (this.money >= cost) {
			this.money -= cost;
			this.machines[machineName] = (this.machines[machineName] || 0) + amount;
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
		const r = line.cost_factor;
		const a = Math.floor(line.initial_cost * Math.pow(r, count));

		if (r === 1) {
			return a * amount;
		}

		return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
	}

	getMaxAffordableProductionLine(lineName: string, currentMoney?: number, currentCount?: number) {
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return 0;

		const count = currentCount !== undefined ? currentCount : (this.machineProductionLines[lineName] || 0);
		const r = line.cost_factor;
		const a = Math.floor(line.initial_cost * Math.pow(r, count));

		const money = currentMoney !== undefined ? currentMoney : this.money;

		if (money < a) return 0;

		if (r === 1) {
			return Math.floor(money / a);
		}

		const n = Math.floor(Math.log(1 + money * (r - 1) / a) / Math.log(r));
		return n;
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

		const count = currentCount !== undefined ? currentCount : (this.plantations[plantationName] || 0);
		const r = plantation.cost_factor;
		const a = Math.floor(plantation.initial_cost * Math.pow(r, count));

		if (r === 1) {
			return a * amount;
		}

		return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
	}

	getMaxAffordablePlantation(plantationName: string, currentMoney?: number, currentCount?: number) {
		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return 0;

		const count = currentCount !== undefined ? currentCount : (this.plantations[plantationName] || 0);
		const r = plantation.cost_factor;
		const a = Math.floor(plantation.initial_cost * Math.pow(r, count));

		const money = currentMoney !== undefined ? currentMoney : this.money;

		if (money < a) return 0;

		if (r === 1) {
			return Math.floor(money / a);
		}

		const n = Math.floor(Math.log(1 + money * (r - 1) / a) / Math.log(r));
		return n;
	}

	buyPlantation(plantationName: string, amount: number = 1) {
		if (this.gameOver) return false;
		const plantation = plantationTypes.find(p => p.name === plantationName);
		if (!plantation) return false;

		if (this.level < plantation.unlock_level) return false;

		const cost = this.getPlantationCost(plantationName, amount);
		if (this.money >= cost) {
			this.money -= cost;
			this.plantations[plantationName] = (this.plantations[plantationName] || 0) + amount;
			return true;
		}
		return false;
	}

	setRubberbandPrice(price: number) {
		this.rubberbandPrice = price;
		if (this.rubberbandPrice < GAME_CONSTANTS.MIN_RUBBERBAND_PRICE) this.rubberbandPrice = GAME_CONSTANTS.MIN_RUBBERBAND_PRICE;
	}

	toJSON(): GameState {
		return {
			money: this.money,
			rubberbands: this.rubberbands,
			rubber: this.rubber,
			machines: this.machines,
			totalRubberbandsSold: this.totalRubberbandsSold,
			buyerHired: this.buyerHired,
			buyerThreshold: this.buyerThreshold,
			rubberPrice: this.rubberPrice,
			rubberbandPrice: this.rubberbandPrice,
			tickCount: this.tickCount,
			marketingLevel: this.marketingLevel,
			machineProductionLines: this.machineProductionLines,
			plantations: this.plantations,
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

import { machine_types, production_lines, GAME_CONSTANTS } from './parameters';

export type MachineName = typeof machine_types[number]['name'];

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
				// Migration from old save if needed
				if ((data as any).machineProductionLineCount && !this.machineProductionLines["Bander 100 Line"]) {
					this.machineProductionLines["Bander 100 Line"] = (data as any).machineProductionLineCount;
				}
				// Migration from previous refactor (machine name keys to production line name keys)
				for (const line of production_lines) {
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

		for (const machine of machine_types) {
			this.machines[machine.name] = 0;
		}
		this.buyerHired = false;
		this.buyerThreshold = 0;
		this.rubberPrice = GAME_CONSTANTS.INITIAL_RUBBER_PRICE;
		this.rubberbandPrice = GAME_CONSTANTS.INITIAL_RUBBERBAND_PRICE;
		this.marketingLevel = GAME_CONSTANTS.INITIAL_MARKETING_LEVEL;
		this.tickCount = 0;
		this.machineProductionLines = {};
	}

	get productionRate() {
		let rate = 0;
		for (const machine of machine_types) {
			rate += (this.machines[machine.name] || 0) * machine.output;
		}
		return rate;
	}

	get level() {
		return 1 + Math.floor(Math.sqrt(this.totalRubberbandsSold / 100));
	}

	get demand() {
		return Math.floor(Math.pow(3, this.marketingLevel) / this.rubberbandPrice * 10);
	}

	get marketingCost() {
		return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(2, this.marketingLevel);
	}

	tick() {
		this.tickCount++;

		this.updateMarket();
		this.produceResources();
		this.produceMachines();
		this.handleAutoBuy();
		this.handleAutoSell();
	}

	private produceMachines() {
		for (const line of production_lines) {
			const count = this.machineProductionLines[line.name] || 0;
			if (count > 0) {
				const amount = count * line.output;
				this.machines[line.machine] = (this.machines[line.machine] || 0) + amount;
			}
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
			this.buyRubber(this.buyerThreshold);
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
		if (this.rubber >= amount) {
			this.rubber -= amount;
			this.rubberbands += amount;
		}
	}

	buyRubber(amount: number) {
		const cost = amount * this.rubberPrice;
		if (this.money >= cost) {
			this.money -= cost;
			this.rubber += amount;
			return true;
		}
		return false;
	}

	getMachineCost(machineName: string, amount: number, currentCount?: number) {
		const machine = machine_types.find(m => m.name === machineName);
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
		const machine = machine_types.find(m => m.name === machineName);
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
		const machine = machine_types.find(m => m.name === machineName);
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
		if (this.rubberbands >= amount) {
			this.rubberbands -= amount;
			this.money += amount * this.rubberbandPrice;
			this.totalRubberbandsSold += amount;
			return true;
		}
		return false;
	}

	hireBuyer() {
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
		const cost = this.marketingCost;
		if (this.money >= cost) {
			this.money -= cost;
			this.marketingLevel++;
			return true;
		}
		return false;
	}

	getMachineProductionLineCost(lineName: string, currentCount?: number) {
		const line = production_lines.find(l => l.name === lineName);
		if (!line) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.machineProductionLines[lineName] || 0);
		return Math.floor(line.initial_cost * Math.pow(line.cost_factor, count));
	}

	buyMachineProductionLine(lineName: string) {
		const line = production_lines.find(l => l.name === lineName);
		if (!line) return false;

		if (this.level < line.unlock_level) return false;

		const cost = this.getMachineProductionLineCost(lineName);
		if (this.money >= cost) {
			this.money -= cost;
			this.machineProductionLines[lineName] = (this.machineProductionLines[lineName] || 0) + 1;
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
			machineProductionLines: this.machineProductionLines
		};
	}

	/**
	 * Serialize game state
	 */
	toString() {
		return JSON.stringify(this.toJSON());
	}
}

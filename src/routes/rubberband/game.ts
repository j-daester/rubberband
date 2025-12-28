import { machineTypes, productionLines, rubberSources, researchList, GAME_CONSTANTS, getCost, getMaxAffordable, type RubberSource, type ResearchType, type MachineType, type ProductionLine } from './parameters';

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
	lastMarketingUpdateTick: number;
	machineProductionLines: Record<string, number>;
	rubberSources: Record<string, number>;
	purchasedRubberSources: Record<string, number>;
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
	lastMarketingUpdateTick!: number;
	machineProductionLines!: Record<string, number>;
	rubberSources!: Record<string, number>;
	purchasedRubberSources!: Record<string, number>;
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
				this.lastMarketingUpdateTick = data.lastMarketingUpdateTick || this.tickCount;
				this.machineProductionLines = data.machineProductionLines || {};
				this.rubberSources = data.rubberSources || (data as any).plantations || {};
				this.purchasedMachines = data.purchasedMachines || { ...this.machines };
				this.purchasedRubberSources = data.purchasedRubberSources || (data as any).purchasedPlantations || { ...this.rubberSources };
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
				if (this.rubberSources["Syntetic Rubber Factory"]) {
					this.rubberSources["Synthetic Rubber Factory"] = (this.rubberSources["Synthetic Rubber Factory"] || 0) + this.rubberSources["Syntetic Rubber Factory"];
					delete this.rubberSources["Syntetic Rubber Factory"];
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
		this.lastMarketingUpdateTick = 0;
		this.tickCount = 0;
		this.tickCount = 0;
		this.machineProductionLines = {};
		this.rubberSources = {};
		this.purchasedRubberSources = {};
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
		for (const source of rubberSources) {
			cost += (this.rubberSources[source.name] || 0) * source.maintenance_cost;
		}
		return cost;
	}

	get marketingDecayInterval() {
		return GAME_CONSTANTS.MARKETING_DECAY_INTERVAL * this.marketingLevel;
	}

	tick() {
		if (this.gameOver) return;

		if (this.level >= 100) {
			this.gameOver = true;
			return;
		}

		this.tickCount++;

		if (!this.researched.includes('automated_ai_marketing')) {
			if (this.tickCount - this.lastMarketingUpdateTick >= this.marketingDecayInterval) {
				if (this.marketingLevel > 1) {
					this.marketingLevel--;
				}
				this.lastMarketingUpdateTick = this.tickCount;
			}
		}

		this.updateMarket();
		this.produceResources();
		this.produceRubberFromSources();
		this.produceMachines();
		this.handleAutoBuy();
		this.handleAutoSell();


		const invCost = this.inventoryCost;
		if (this.money >= invCost) {
			this.money -= invCost;
		} else {
			// If not enough money, we might want to force sell or just debt?
			// For now, let's just go into debt or stop deducting?
			// Usually idle games allow 0 or negative, or just stop operations.
			// Let's allow negative money for maintenance/inventory costs to pressure player.
			this.money -= invCost;
		}
		this.money -= this.maintenanceCost;
	}

	get inventoryCost() {
		const rubberExcess = Math.max(0, this.rubber - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBER);
		const bandExcess = Math.max(0, this.rubberbands - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBERBANDS);

		let cost = 0;
		if (rubberExcess > 0) {
			cost += 0.001 * Math.pow(rubberExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBER, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);
		}
		if (bandExcess > 0) {
			cost += 0.001 * Math.pow(bandExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBERBANDS, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);
		}
		return cost;
	}

	private produceMachines() {
		for (const line of productionLines) {
			const count = this.machineProductionLines[line.name] || 0;
			if (count > 0) {
				const amount = count * line.output;
				if (line.product_type === 'rubber_source') {
					this.rubberSources[line.machine] = (this.rubberSources[line.machine] || 0) + amount;
				} else {
					this.machines[line.machine] = (this.machines[line.machine] || 0) + amount;
				}

			}
		}
	}

	getRubberSourceOutputPerUnit(sourceName: string) {
		const source = rubberSources.find(p => p.name === sourceName);
		if (!source) return 0;

		let output = source.output;
		if (this.researched.includes('rubber_recycling')) {
			output *= 2;
		}
		if (this.researched.includes('robotics')) {
			output *= 5;
		}
		return output;
	}

	get rubberProductionRate() {
		let rate = 0;
		for (const source of rubberSources) {
			rate += (this.rubberSources[source.name] || 0) * this.getRubberSourceOutputPerUnit(source.name);
		}
		return rate;
	}

	get rubberShortage() {
		const production = this.productionRate;
		const sourceProduction = this.rubberProductionRate;
		const autoBuyCapacity = this.buyerHired ? GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION : 0;

		return production > (sourceProduction + Math.min(autoBuyCapacity, this.buyerThreshold));
	}

	get maxRubber() {
		return GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION + this.rubberProductionRate;
	}

	private produceRubberFromSources() {
		const production = this.rubberProductionRate;
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
		const ratio = this.researched.includes('optimize_production') ? 1 : 2;
		if (this.rubber >= amount * ratio) {
			this.rubber -= amount * ratio;
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

		if (machine.allow_manual_purchase === false) return false;
		if (!this.isMachineUnlocked(machine)) return false;

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
			this.lastMarketingUpdateTick = this.tickCount;
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

		if (!this.isProductionLineUnlocked(line)) return false;

		const cost = this.getMachineProductionLineCost(lineName, amount);
		if (this.money >= cost) {
			this.money -= cost;
			this.machineProductionLines[lineName] = (this.machineProductionLines[lineName] || 0) + amount;
			return true;
		}
		return false;
	}

	getRubberSourceCost(sourceName: string, amount: number, currentCount?: number) {
		const source = rubberSources.find(p => p.name === sourceName);
		if (!source) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.purchasedRubberSources[sourceName] || 0);
		return getCost(source, amount, count);
	}

	getMaxAffordableRubberSource(sourceName: string, currentMoney?: number, currentCount?: number) {
		const source = rubberSources.find(p => p.name === sourceName);
		if (!source) return 0;

		const count = currentCount !== undefined ? currentCount : (this.purchasedRubberSources[sourceName] || 0);
		const money = currentMoney !== undefined ? currentMoney : this.money;

		return getMaxAffordable(source, money, count);
	}

	buyRubberSource(sourceName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(sourceName)) return false;

		const source = rubberSources.find(p => p.name === sourceName);
		if (!source) return false;

		if (source.allow_manual_purchase === false) return false;
		if (!this.isRubberSourceUnlocked(source)) return false;

		const cost = this.getRubberSourceCost(sourceName, amount);
		if (this.money >= cost) {
			this.money -= cost;
			this.rubberSources[sourceName] = (this.rubberSources[sourceName] || 0) + amount;
			this.purchasedRubberSources[sourceName] = (this.purchasedRubberSources[sourceName] || 0) + amount;
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

	sellRubberSource(sourceName: string, amount: number = 1) {
		if (this.gameOver) return false;
		if (this.isBeingProduced(sourceName)) return false;

		const source = rubberSources.find(p => p.name === sourceName);
		if (!source) return false;

		const currentCount = this.rubberSources[sourceName] || 0;
		if (currentCount < amount) return false;

		const purchasedCount = this.purchasedRubberSources[sourceName] || 0;
		const sellAmountFromPurchased = Math.min(amount, purchasedCount);

		let refund = 0;
		if (sellAmountFromPurchased > 0) {
			refund = Math.floor(0.5 * getCost(source, sellAmountFromPurchased, purchasedCount - sellAmountFromPurchased));
			this.purchasedRubberSources[sourceName] = purchasedCount - sellAmountFromPurchased;
		}

		this.rubberSources[sourceName] = currentCount - amount;
		this.money += refund;
		return true;
	}

	setRubberbandPrice(price: number) {
		this.rubberbandPrice = price;
		if (this.rubberbandPrice < GAME_CONSTANTS.MIN_RUBBERBAND_PRICE) this.rubberbandPrice = GAME_CONSTANTS.MIN_RUBBERBAND_PRICE;
	}

	isMachineUnlocked(machine: MachineType) {
		if (machine.required_research) {
			return this.researched.includes(machine.required_research);
		}
		return this.level >= machine.unlock_level;
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

	isProductionLineUnlocked(line: ProductionLine) {
		if (line.required_research) {
			return this.researched.includes(line.required_research);
		}
		return this.level >= line.unlock_level;
	}

	isRubberSourceUnlocked(source: RubberSource) {
		if (source.required_research) {
			return this.researched.includes(source.required_research);
		}
		return this.level >= source.unlock_level;
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
			lastMarketingUpdateTick: this.lastMarketingUpdateTick,
			machineProductionLines: this.machineProductionLines,
			rubberSources: this.rubberSources,
			purchasedRubberSources: this.purchasedRubberSources,
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

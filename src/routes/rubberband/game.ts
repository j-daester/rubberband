import { machineTypes, productionLines, rubberSources, researchList, GAME_CONSTANTS, getCost, getMaxAffordable, type PurchasableItem, type RubberSource, type ResearchType, type MachineType, type ProductionLine } from './parameters';

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
	gameStartTime: number;
	totalRubberProduced: number;
	totalNanoSwarmsProduced: number;
	consumedResources: number;
	upgrades: Record<string, boolean>;
	gameOver: boolean;
	netIncome: number;
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
	upgrades!: Record<string, boolean>;
	gameOver!: boolean;
	gameStartTime!: number;
	totalRubberProduced!: number;
	totalNanoSwarmsProduced!: number;
	consumedResources!: number;
	netIncome!: number;

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
				this.upgrades = data.upgrades || {};
				this.gameOver = data.gameOver || false;
				this.gameStartTime = data.gameStartTime || Date.now();
				this.totalRubberProduced = data.totalRubberProduced || 0;
				this.totalNanoSwarmsProduced = data.totalNanoSwarmsProduced || 0;
				this.consumedResources = data.consumedResources || 0;
				this.netIncome = data.netIncome || 0;

				// Migration from old save if needed
				if ((data as any).consumedOil || (data as any).consumedEarthResources) {
					this.consumedResources = ((data as any).consumedOil || 0) + ((data as any).consumedEarthResources || 0);
				}

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
		this.machineProductionLines = {};
		this.rubberSources = {};
		this.purchasedRubberSources = {};
		this.researched = [];
		this.upgrades = {};
		this.gameOver = false;
		this.gameStartTime = Date.now();
		this.totalRubberProduced = 0;
		this.totalNanoSwarmsProduced = 0;
		this.consumedResources = 0;
		this.netIncome = 0;
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
		// Level system removed, return fixed value or null if needed, but better to remove usage.
		// Kept as 1 for compatibility if strictly needed by UI, but goal is to remove.
		return 1;
	}

	get nextLevelRequirement() {
		return Infinity;
	}

	calculateDemand(price: number): number {
		let basevalue = 1.2;
		let priceSensitivity = 1.0;

		// Marketing effectiveness (base value)
		if (this.researched.includes('painless_marketing') || this.researched.includes('basic_marketing')) {
			// Basic marketing logic handled by unlock, but maybe boost?
			// The original logic checked online_marketing.
		}

		if (this.researched.includes('online_marketing')) {
			basevalue += 0.8;
		}
		if (this.researched.includes('hyperpersonalisation')) {
			basevalue += 1;
		}

		// Price sensitivity (flattening the curve)
		if (this.researched.includes('automated_ai_marketing')) {
			priceSensitivity *= 1.2;
			basevalue *= 1.2;
		}

		if (this.researched.includes('hypnosis')) {
			priceSensitivity *= 2;
			basevalue *= 1.2;
		}
		if (this.researched.includes('mind_control')) {
			priceSensitivity *= 100;
			basevalue *= 100;
		}

		// Exponential demand curve with price sensitivity
		// Demand ~ e^(-price / sensitivity)
		return Math.floor(Math.pow(this.marketingLevel, basevalue) * 100 * Math.exp(-price / priceSensitivity));
	}

	get demand() {
		return this.calculateDemand(this.rubberbandPrice);
	}

	get marketingCost() {
		return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(1.2, this.marketingLevel);
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

		const startMoney = this.money;

		if (this.consumedResources >= GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT) {
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

		this.netIncome = this.money - startMoney;
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

		if (this.researched.includes('interplanetary_logistics')) {
			cost *= GAME_CONSTANTS.INTERPLANETARY_LOGISTICS_STORAGE_COST_FACTOR;
		}

		return cost;
	}

	get income() {
		const rubberAvailable = this.rubber + this.rubberProductionRate;
		const bandsProduced = Math.min(this.productionRate, rubberAvailable);
		const bandsAvailable = this.rubberbands + bandsProduced;
		const sold = Math.min(bandsAvailable, this.demand);
		return sold * this.rubberbandPrice;
	}

	get profit() {
		return this.income - this.maintenanceCost - this.inventoryCost;
	}

	getProductionLineOutputPerUnit(lineName: string) {
		const line = productionLines.find(l => l.name === lineName);
		if (!line) return 0;

		const nanoSwarms = this.machines["Nano-Swarms"] || 0;
		// Additive bonus: +0.01 per swarm for most, but reduced for Nanobot Factory
		let bonus = Math.floor(nanoSwarms * 0.1);
		if (lineName === "Nanobot Factory") {
			bonus = Math.floor(nanoSwarms * 0.1);
		}
		return line.output + bonus;
	}

	get resourceLimit() {
		if (this.researched.includes('interplanetary_logistics')) {
			return GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT;
		}
		if (this.researched.includes('molecular_transformation')) {
			return GAME_CONSTANTS.EARTH_RESOURCE_LIMIT;
		}
		return GAME_CONSTANTS.OIL_RESERVES_LIMIT;
	}

	get consumedOil() {
		return this.consumedResources;
	}

	get consumedEarthResources() {
		return this.consumedResources;
	}

	get resourceUnitName() {
		if (this.researched.includes('interplanetary_logistics')) {
			return "Universe Resources";
		}
		if (this.researched.includes('molecular_transformation')) {
			return "Earth Resources";
		}
		return "Oil (l)";
	}

	private produceMachines() {
		const nanoSwarms = this.machines["Nano-Swarms"] || 0;
		const outputPerUnit = Math.floor(0.1 * nanoSwarms);
		const outputPerUnitForNanobots = Math.floor(0.01 * nanoSwarms);

		const generalResourceLimit = this.resourceLimit;

		for (const line of productionLines) {
			const count = this.machineProductionLines[line.name] || 0;
			if (count > 0) {
				const boost = line.name === "Nanobot Factory" ? outputPerUnitForNanobots : outputPerUnit;
				let maxProduction = Math.floor(count * (line.output + boost));

				// Determine resource cost per unit
				let unitResourceCost = GAME_CONSTANTS.RESOURCE_COST_MACHINE;
				if (line.machine === "Nano-Swarms") {
					unitResourceCost = GAME_CONSTANTS.RESOURCE_COST_NANO_SWARM;
				}

				// Check resource limit
				const remainingResources = Math.max(0, generalResourceLimit - this.consumedResources);
				const maxAllowed = Math.floor(remainingResources / unitResourceCost);

				if (maxProduction > maxAllowed) {
					maxProduction = maxAllowed;
				}

				const amount = maxProduction;

				if (amount > 0) {
					// Consume resources
					this.consumedResources += amount * unitResourceCost;

					if (line.product_type === 'rubber_source') {
						this.rubberSources[line.machine] = (this.rubberSources[line.machine] || 0) + amount;
					} else {
						this.machines[line.machine] = (this.machines[line.machine] || 0) + amount;
						if (line.machine === "Nano-Swarms") {
							this.totalNanoSwarmsProduced += amount;
						}
					}
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
		const generalResourceLimit = this.resourceLimit;

		for (const source of rubberSources) {
			const count = this.rubberSources[source.name] || 0;
			if (count > 0) {
				const output = this.getRubberSourceOutputPerUnit(source.name);
				let amount = count * output;

				// Special handling for Synthetic Rubber Factory consuming resources
				if (source.name === "Synthetic Rubber Factory") {
					const remainingResources = Math.max(0, generalResourceLimit - this.consumedResources);
					// Cost is 0.01 per unit
					const maxProduction = Math.floor(remainingResources / GAME_CONSTANTS.RESOURCE_COST_SYNTHETIC_RUBBER);

					if (amount > maxProduction) {
						amount = maxProduction;
					}

					if (amount > 0) {
						this.consumedResources += amount * GAME_CONSTANTS.RESOURCE_COST_SYNTHETIC_RUBBER;
					}
				}

				if (amount > 0) {
					this.rubber += amount;
					this.totalRubberProduced += amount;
				}
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
			const needed = this.buyerThreshold - this.rubber;
			// Limit buying speed to MAX_RUBBER_NO_PRODUCTION per tick
			const buyAmount = Math.min(needed, GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION);

			if (buyAmount > 0) {
				// 10% commission for auto buyer
				this.buyRubber(buyAmount, 1.1);
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

	buyRubber(amount: number, priceMultiplier: number = 1) {
		if (this.gameOver) return false;

		const limit = this.maxRubber;
		if (this.rubber >= limit) return false;

		// Clamp amount to not exceed limit
		let amountToBuy = amount;
		if (this.rubber + amountToBuy > limit) {
			amountToBuy = limit - this.rubber;
		}

		if (!this.researched.includes('interplanetary_logistics')) {
			const remaining = Math.max(0, GAME_CONSTANTS.EARTH_RESOURCE_LIMIT - this.totalRubberProduced);
			if (amountToBuy > remaining) {
				amountToBuy = remaining;
			}
		}

		if (amountToBuy <= 0) return false;

		const cost = amountToBuy * this.rubberPrice * priceMultiplier;
		if (this.money >= cost) {
			this.money -= cost;
			this.rubber += amountToBuy;
			this.totalRubberProduced += amountToBuy;
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
		// Check research now instead of level
		if (this.researched.includes(GAME_CONSTANTS.BUYER_UNLOCK_RESEARCH) && !this.buyerHired && this.money >= GAME_CONSTANTS.BUYER_COST) {
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
		// Check research precondition (basic_marketing)
		if (!this.researched.includes(GAME_CONSTANTS.MARKETING_UNLOCK_RESEARCH)) return false;

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

		const purchasedCount = this.purchasedMachines[machineName] || 0;

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
		if (machine.precondition_research) {
			return this.researched.includes(machine.precondition_research);
		}
		// If no precondition, it's unlocked by default (like Bander was level 2, now requires Basic Manufacturing)
		return true;
	}

	buyResearch(researchId: string) {
		if (this.gameOver) return false;
		if (this.researched.includes(researchId)) return false;

		const research = researchList.find(r => r.id === researchId);
		if (!research) return false;

		if (research.precondition_research && !this.researched.includes(research.precondition_research)) return false;

		if (this.money >= research.cost) {
			this.money -= research.cost;
			this.researched.push(researchId);
			return true;
		}
		return false;
	}

	isProductionLineUnlocked(line: ProductionLine) {
		if (line.precondition_research) {
			return this.researched.includes(line.precondition_research);
		}
		return true;
	}

	isItemVisible(item: PurchasableItem): boolean {
		// 1. Must be unlocked
		if (item.required_research) {
			const reqs = Array.isArray(item.required_research) ? item.required_research : [item.required_research];
			if (!reqs.every(r => this.researched.includes(r))) return false;
		} else if (item.precondition_research && !this.researched.includes(item.precondition_research)) {
			return false;
		}

		// 2. If it has been upgraded FROM (it is the base), hide if upgraded
		if (this.upgrades[item.name]) return false;

		// 3. If it is an upgrade TO (it is the upgraded version), hide if base NOT upgraded
		if (item.upgraded_from && !this.upgrades[item.upgraded_from]) return false;

		return true;
	}

	getUpgradeCost(item: PurchasableItem): number {
		if (!item.upgrade_definition) return Infinity;

		let unitCount = 0;
		// Check type of item
		if (machineTypes.some(m => m.name === item.name)) {
			// Machine
			unitCount = this.machines[item.name] || 0;
		} else if (productionLines.some(p => p.name === item.name)) {
			// Production Line
			unitCount = this.machineProductionLines[item.name] || 0;
			// Specific logic for Factory Line -> Source count
			const pItem = item as ProductionLine;
			if (pItem.product_type === 'rubber_source') {
				unitCount += this.rubberSources[pItem.machine] || 0;
			}
		}

		return item.upgrade_definition.project_cost + (item.upgrade_definition.unit_cost * unitCount);
	}

	upgradeItem(itemName: string) {
		if (this.gameOver) return false;

		// Find item in machines or productionLines
		let item: PurchasableItem | undefined = machineTypes.find(m => m.name === itemName);
		let type = 'machine';
		if (!item) {
			item = productionLines.find(p => p.name === itemName);
			type = 'productionLine';
		}

		if (!item || !item.upgrade_definition) return false;

		const cost = this.getUpgradeCost(item);
		if (this.money < cost) return false;

		// Check for synchronized production line upgrade
		let linkedLine: ProductionLine | undefined;
		let lineUpgradeCost = 0;
		if (type === 'machine') {
			linkedLine = productionLines.find(p => p.machine === item!.name);
			if (linkedLine && linkedLine.upgrade_definition) {
				// Check if the target line is unlocked (or if the upgrade logic allows it)
				// Generally if we can upgrade the machine, we probably can upgrade the line if we have the money
				// But we should verify affordablity separately
				lineUpgradeCost = this.getUpgradeCost(linkedLine);
			}
		}

		// Execute upgrade
		// If we found a linked line and can afford BOTH, do both.
		if (linkedLine && this.money >= cost + lineUpgradeCost) {
			this.money -= (cost + lineUpgradeCost);
			this.upgrades[itemName] = true;
			this.upgrades[linkedLine.name] = true;

			// Perform Machine Transfer
			const targetName = item.upgrade_definition.target;
			const count = this.machines[itemName] || 0;
			const purchased = this.purchasedMachines[itemName] || 0;

			this.machines[targetName] = (this.machines[targetName] || 0) + count;
			this.purchasedMachines[targetName] = (this.purchasedMachines[targetName] || 0) + purchased;
			this.machines[itemName] = 0;
			this.purchasedMachines[itemName] = 0;

			// Perform Line Transfer
			const lineTargetName = linkedLine.upgrade_definition!.target;
			const lineCount = this.machineProductionLines[linkedLine.name] || 0;

			this.machineProductionLines[lineTargetName] = (this.machineProductionLines[lineTargetName] || 0) + lineCount;
			this.machineProductionLines[linkedLine.name] = 0;

			return true;
		}

		// Default fallback: Upgrade only the item (either it's a line, or we can't afford the sync)
		this.money -= cost;
		this.upgrades[itemName] = true;

		const targetName = item.upgrade_definition.target;

		if (type === 'machine') {
			const count = this.machines[itemName] || 0;
			const purchased = this.purchasedMachines[itemName] || 0;

			// Transfer to new type
			this.machines[targetName] = (this.machines[targetName] || 0) + count;
			this.purchasedMachines[targetName] = (this.purchasedMachines[targetName] || 0) + purchased;

			// Clear old
			this.machines[itemName] = 0;
			this.purchasedMachines[itemName] = 0;

		} else if (type === 'productionLine') {
			const pItem = item as ProductionLine;
			const count = this.machineProductionLines[itemName] || 0;

			// Transfer Line count
			this.machineProductionLines[targetName] = (this.machineProductionLines[targetName] || 0) + count;
			this.machineProductionLines[itemName] = 0;

			// Special handling for Factory Line -> Upgrade Sources too
			if (pItem.product_type === 'rubber_source') {
				const sourceName = pItem.machine;
				// Need to find the target source name from the target line?
				// The target line is defined in parameters. 
				const targetLine = productionLines.find(p => p.name === targetName);
				if (targetLine && targetLine.product_type === 'rubber_source') {
					const targetSourceName = targetLine.machine;

					const sourceCount = this.rubberSources[sourceName] || 0;
					const purchasedSource = this.purchasedRubberSources[sourceName] || 0;

					this.rubberSources[targetSourceName] = (this.rubberSources[targetSourceName] || 0) + sourceCount;
					this.purchasedRubberSources[targetSourceName] = (this.purchasedRubberSources[targetSourceName] || 0) + purchasedSource;

					this.rubberSources[sourceName] = 0;
					this.purchasedRubberSources[sourceName] = 0;
				}
			}
		}

		return true;
	}

	isRubberSourceUnlocked(source: RubberSource) {
		if (source.precondition_research) {
			return this.researched.includes(source.precondition_research);
		}
		return true;
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
			upgrades: this.upgrades,
			gameOver: this.gameOver,
			gameStartTime: this.gameStartTime,
			totalRubberProduced: this.totalRubberProduced,
			totalNanoSwarmsProduced: this.totalNanoSwarmsProduced,
			consumedResources: this.consumedResources,
			netIncome: this.netIncome
		};
	}

	/**
	 * Serialize game state
	 */
	toString() {
		return JSON.stringify(this.toJSON());
	}
}

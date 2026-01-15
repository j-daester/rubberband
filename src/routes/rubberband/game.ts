import { producerFamilies, researchList, GAME_CONSTANTS, getCost, getMaxAffordable, type ProducerFamily, type Producer, type ResearchType, type ResearchEffect } from './parameters';

// NanoAllocation Removed
export interface NanoAllocation {
	rubber_machines: number; // 0.0 - 1.0 (Percentage of swarms allocated)
	bander_machines: number; // 0.0 - 1.0
	nanobots: number; // 0.0 - 1.0
}

export interface GameState {
	money: number;
	rubberbands: number;
	rubber: number;
	producers: Record<string, number[]>;
	purchasedProducers: Record<string, number[]>;
	totalRubberbandsSold: number;
	buyerHired: boolean;
	buyerThreshold: number;
	rubberPrice: number;
	rubberbandPrice: number;
	tickCount: number;
	marketingLevel: number;
	lastMarketingUpdateTick: number;
	researched: string[];
	gameStartTime: number;
	totalRubberProduced: number;
	totalNanoSwarmsProduced: number;
	consumedResources: number;
	gameOver: boolean;
	netIncome: number;
	nanoSwarmCount: number;
	nanobotFactoryCount: number;
	nanoAllocation: NanoAllocation;
}

export class Game {
	money!: number;
	rubberbands!: number;
	rubber!: number;

	producers!: Record<string, number[]>;
	purchasedProducers!: Record<string, number[]>;

	totalRubberbandsSold!: number;
	buyerHired!: boolean;
	buyerThreshold!: number;
	rubberPrice!: number;
	rubberbandPrice!: number;
	tickCount!: number;
	marketingLevel!: number;
	lastMarketingUpdateTick!: number;
	researched!: string[];
	gameOver!: boolean;
	gameStartTime!: number;
	totalRubberProduced!: number;
	totalNanoSwarmsProduced!: number;
	consumedResources!: number;
	nanoSwarmCount!: number;
	nanobotFactoryCount!: number;
	nanoAllocation!: NanoAllocation;

	// Runtime Stats for UI
	private _rubberProductionRate: number = 0;
	private _machineProductionRate: number = 0; // Rubberbands
	private _theoreticalRubberConsumptionRate: number = 0; // How much rubber factories WANT to eat

	private lastPriceUpdateTick: number = 0;

	// Nano Swarm Logic
	private currentNanoBoosts: Map<string, number> = new Map(); // Key: "familyId:tierIndex", Value: Flat Amount Boost


	constructor(serialized: string | undefined = undefined) {
		this.reset();
		if (serialized) {
			try {
				const data = JSON.parse(serialized) as GameState;
				this.money = data.money;
				this.rubberbands = data.rubberbands;
				this.rubber = data.rubber;
				this.nanoSwarmCount = data.nanoSwarmCount || 0;
				this.nanobotFactoryCount = data.nanobotFactoryCount || 0;
				this.nanoAllocation = data.nanoAllocation || { rubber_machines: 0.33, bander_machines: 0.33, nanobots: 0.34 };

				const raw = data as any;
				this.producers = raw.producers || raw.entities || {};
				this.purchasedProducers = raw.purchasedProducers || raw.purchasedEntities || {};

				this.totalRubberbandsSold = data.totalRubberbandsSold;
				this.buyerHired = data.buyerHired;
				this.buyerThreshold = data.buyerThreshold;
				this.rubberPrice = data.rubberPrice;
				this.rubberbandPrice = data.rubberbandPrice;
				this.tickCount = data.tickCount;
				this.marketingLevel = data.marketingLevel;
				this.lastMarketingUpdateTick = data.lastMarketingUpdateTick;
				this.researched = data.researched || [];
				this.gameOver = data.gameOver;
				this.gameStartTime = data.gameStartTime;
				this.totalRubberProduced = data.totalRubberProduced;
				this.totalNanoSwarmsProduced = data.totalNanoSwarmsProduced;
				this.consumedResources = data.consumedResources;

				// Migration for Nano Refactor
				if (this.producers['nanoswarm'] && this.producers['nanoswarm'][0] > 0) {
					this.nanoSwarmCount += this.producers['nanoswarm'][0];
					this.producers['nanoswarm'][0] = 0; // Clear legacy
				}
				if (this.producers['nanobot_factory'] && this.producers['nanobot_factory'][0] > 0) {
					this.nanobotFactoryCount += this.producers['nanobot_factory'][0];
					this.producers['nanobot_factory'][0] = 0; // Clear legacy
				}
			} catch (e) {
				console.error('Failed to parse save game', e);
				this.reset();
			}
		}

		for (const f of producerFamilies) {
			if (!this.producers[f.id]) this.producers[f.id] = new Array(f.tiers.length).fill(0);
			if (!this.purchasedProducers[f.id]) this.purchasedProducers[f.id] = new Array(f.tiers.length).fill(0);
		}
	}

	reset() {
		this.money = GAME_CONSTANTS.INITIAL_MONEY;
		this.rubberbands = 0;
		this.rubber = 0;
		this.totalRubberbandsSold = 0;
		this.producers = {};
		for (const f of producerFamilies) {
			this.producers[f.id] = new Array(f.tiers.length).fill(0);
		}
		this.purchasedProducers = JSON.parse(JSON.stringify(this.producers));
		this.buyerHired = false;
		this.buyerThreshold = 0;
		this.rubberPrice = GAME_CONSTANTS.INITIAL_RUBBER_PRICE;
		this.rubberbandPrice = GAME_CONSTANTS.INITIAL_RUBBERBAND_PRICE;
		this.marketingLevel = GAME_CONSTANTS.INITIAL_MARKETING_LEVEL;
		this.lastMarketingUpdateTick = 0;
		this.tickCount = 0;
		this.researched = [];
		this.gameOver = false;
		this.gameStartTime = Date.now();
		this.totalRubberProduced = 0;
		this.totalNanoSwarmsProduced = 0;
		this.consumedResources = 0;
		this.nanoSwarmCount = 0;
		this.nanobotFactoryCount = 0;
		this.nanoAllocation = { rubber_machines: 0.33, bander_machines: 0.33, nanobots: 0.34 };
	}

	// --- EFFECT HELPERS ---

	private getEffects<T extends ResearchEffect['type']>(type: T): Extract<ResearchEffect, { type: T }>[] {
		const effects: Extract<ResearchEffect, { type: T }>[] = [];

		// 1. Research Effects
		for (const rId of this.researched) {
			const def = researchList.find(d => d.id === rId);
			if (def && def.effects) {
				for (const eff of def.effects) {
					if (eff.type === type) {
						effects.push(eff as Extract<ResearchEffect, { type: T }>);
					}
				}
			}
		}

		// 2. Producer Effects (Scaled by count)
		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] <= 0) continue;
				const tier = f.tiers[i];
				if (tier.effects) {
					for (const eff of tier.effects) {
						if (eff.type === type) {
							// Clone and scale
							const scaled = { ...eff } as any;
							if (scaled.addend !== undefined) scaled.addend *= counts[i];
							if (scaled.amount !== undefined) scaled.amount *= counts[i];
							// Note: We don't scale 'multiplier' type because that would be insane (2^count). 
							// Only additive types make sense to scale linearly by count.

							effects.push(scaled as Extract<ResearchEffect, { type: T }>);
						}
					}
				}
			}
		}

		return effects;
	}

	private hasGlobalRule(rule: 'unlock_buyer' | 'unlock_marketing'): boolean {
		const rules = this.getEffects('global_rule');
		return rules.some(r => r.rule === rule);
	}

	// --- GAME LOOP ---

	tick() {
		if (this.gameOver) return;
		const startMoney = this.money;
		if (this.consumedResources >= GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT) {
			this.gameOver = true;
			return;
		}

		this.tickCount++;

		if (this.marketingDecayInterval > 0) {
			if (this.tickCount - this.lastMarketingUpdateTick >= this.marketingDecayInterval) {
				if (this.marketingLevel > 1) this.marketingLevel--;
				this.lastMarketingUpdateTick = this.tickCount;
			}
		}


		this.updateMarket();

		// Recalculate Nano Boosts for this tick (Allocation Phase)
		this.calculateNanoBoosts();

		// --- PHASE 1: Modifiers ---
		const globalSpeedMultiplier = 1.0;

		// --- PHASE 2: Raw Material Generation (Rubber) ---
		this._rubberProductionRate = this.runRawMaterialsPhase(globalSpeedMultiplier);

		// --- PHASE 3: Manufacturing (Rubberbands) ---
		this._machineProductionRate = this.runManufacturingPhase(globalSpeedMultiplier);

		// --- PHASE 4: Industrial Construction (Producers) ---
		this.runIndustryPhase(globalSpeedMultiplier);

		// --- PHASE 5: Nano Phase ---
		this.runNanoPhase();

		this.handleAutoBuy();
		this.handleAutoSell();

		const invCost = this.inventoryCost;
		this.money -= invCost;
		this.money -= this.maintenanceCost;
	}

	private calculateNanoBoosts() {
		this.currentNanoBoosts.clear();
		if (this.nanoSwarmCount <= 0) return;

		// Calculate Pools
		const rubberSwarms = Math.floor(this.nanoSwarmCount * this.nanoAllocation.rubber_machines);
		const banderSwarms = Math.floor(this.nanoSwarmCount * this.nanoAllocation.bander_machines);
		// Nano swarms allocated to nanobots are conceptually used in getNanobotProduction

		// === RUBBER POOL LOGIC ===
		let remainingRubberSwarms = rubberSwarms;
		if (remainingRubberSwarms > 0) {
			// Priority: Black Hole (1000) > Synthetic (10)
			// Wait, are there other rubber producers? Yes.
			// Rubber priorities:
			// 1. Black Hole Extruder / Line (Tier 2, 1) -> Threshold 1000
			// 2. Synthetic Rubber Mixer / Line (Tier 1, 0) -> Threshold 10

			const rubberGroups = [
				// High Tier (1000)
				{
					cost: 1000,
					items: [
						{ familyId: 'rubber_sources', tierIndex: 2 },
						{ familyId: 'rubber_factory_line', tierIndex: 1 }
					]
				},
				// Medium Tier (10)
				{
					cost: 10,
					items: [
						{ familyId: 'rubber_sources', tierIndex: 1 },
						{ familyId: 'rubber_factory_line', tierIndex: 0 }
					]
				}
			];

			for (const group of rubberGroups) {
				for (const item of group.items) {
					if (remainingRubberSwarms < group.cost) break;
					const owned = this.producers[item.familyId]?.[item.tierIndex] || 0;
					if (owned > 0) {
						const boosts = Math.floor(remainingRubberSwarms / group.cost);
						if (boosts > 0) {
							const key = `${item.familyId}:${item.tierIndex}`;
							this.currentNanoBoosts.set(key, boosts);
							remainingRubberSwarms -= boosts * group.cost;
						}
					}
				}
			}
		}

		// === BANDER POOL LOGIC ===
		let remainingBanderSwarms = banderSwarms;
		if (remainingBanderSwarms > 0) {
			// Priorities:
			// 1. Temporal Press (1M)
			// 2. Quantum Bander (1000)
			// 3. Mega Bander (10)
			// 4. Rubber Bander? (Let's assume 10 as fallback or nothing? Prompt said "Rubber Bander / Line: Cost 10 swarms")

			const banderGroups = [
				{
					cost: 1_000_000,
					items: [
						{ familyId: 'bander', tierIndex: 4 }, // Temporal Press
						{ familyId: 'bander_line', tierIndex: 2 } // Temporal Press Line
					]
				},
				{
					cost: 1_000,
					items: [
						{ familyId: 'bander', tierIndex: 3 }, // Quantum Bander
						{ familyId: 'bander_line', tierIndex: 1 } // Quantum Bander Line
					]
				},
				{
					cost: 10,
					items: [
						{ familyId: 'bander', tierIndex: 2 }, // Mega Bander
						{ familyId: 'bander_line', tierIndex: 0 }, // Mega Bander Line
						{ familyId: 'bander', tierIndex: 0 }, // Rubber Bander (Tier 0) - Usually low priority
						{ familyId: 'bander', tierIndex: 1 } // Hydraulic Bander (Tier 1) - Usually low priority
					]
				}
			];

			for (const group of banderGroups) {
				for (const item of group.items) {
					if (remainingBanderSwarms < group.cost) break;
					const owned = this.producers[item.familyId]?.[item.tierIndex] || 0;
					if (owned > 0) {
						const boosts = Math.floor(remainingBanderSwarms / group.cost);
						if (boosts > 0) {
							const key = `${item.familyId}:${item.tierIndex}`;
							// Specific logic for Bander Lines (Group 1 item 2, Group 2 item 2, etc):
							// They produce MACHINES, not bands. But boost is same concept (+1 production).
							this.currentNanoBoosts.set(key, boosts);
							remainingBanderSwarms -= boosts * group.cost;
						}
					}
				}
			}
		}
	}

	private runRawMaterialsPhase(baseMultiplier: number): number {
		let produced = 0;
		const generalResourceLimit = this.resourceLimit;

		const prodMultipliers = this.getEffects('production_multiplier');
		const additiveMultipliers = this.getEffects('production_multiplier_additive');

		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] <= 0) continue;
				const tier = f.tiers[i];
				if (tier.production.output.resource !== 'rubber') continue;

				const baseAmount = tier.production.output.amount * counts[i];
				let multiplier = baseMultiplier;

				// Rule Based Boosts
				for (const eff of prodMultipliers) {
					if (eff.target.producerType && eff.target.producerType === f.type) multiplier *= eff.multiplier;
					if (eff.target.familyId && eff.target.familyId === f.id) multiplier *= eff.multiplier;
				}

				// Additive Boosts
				for (const eff of additiveMultipliers) {
					if (eff.target.producerType === f.type || eff.target.familyId === f.id) {
						multiplier += eff.addend;
					}
				}

				// Nano Swarm Bonus (Flat Global Boost)
				const boostKey = `${f.id}:${i}`;
				const nanoBoost = this.currentNanoBoosts.get(boostKey) || 0;

				let amount = baseAmount * multiplier;

				if (nanoBoost > 0) {
					// Add boost to total produced amount directly? 
					// Or treat as extra machines?
					// "increase production by 1 machine over all".
					// So effectively: effectiveCount = count + nanoBoost.
					// Let's just add to amount.
					const boostAmount = nanoBoost * tier.production.output.amount * multiplier;
					amount += boostAmount;
				}

				if (amount > 0) {

					// Check Resource Limits
					// Synthetic Rubber Logic (uses Earth Resources if Molecular Transformation unlocked)
					if (tier.name === "Synthetic Rubber Mixer") {
						const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
						const costPerUnit = GAME_CONSTANTS.RESOURCE_COST_SYNTHETIC_RUBBER;
						const maxProd = Math.floor(remaining / costPerUnit);
						if (amount > maxProd) amount = maxProd;
						if (amount > 0) this.consumedResources += amount * costPerUnit;
					}
					// Black Hole Extruder Logic
					else if (tier.name === "Black Hole Extruder") {
						const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
						const costPerUnit = 1.0;
						const maxProd = Math.floor(remaining / costPerUnit);
						if (amount > maxProd) amount = maxProd;
						if (amount > 0) this.consumedResources += amount * costPerUnit;
					}

					// Verify Storage Capacity Logic
					// Calculate available space in terms of Rubber
					const availableSpace = GAME_CONSTANTS.LAND_SURFACE_LIMIT - this.usedStorageSpace;
					const spacePerRubber = GAME_CONSTANTS.SPACE_COST_RUBBER;
					const maxFill = Math.floor(Math.max(0, availableSpace) / spacePerRubber);

					if (amount > maxFill) amount = maxFill;

					this.rubber += amount;
					this.totalRubberProduced += amount;
					produced += amount;
				}
			}
		}
		return produced;
	}

	private runManufacturingPhase(baseMultiplier: number): number {
		let produced = 0;
		this._theoreticalRubberConsumptionRate = 0; // Reset
		const prodMultipliers = this.getEffects('production_multiplier');
		const efficiencyRules = this.getEffects('input_efficiency');

		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] <= 0) continue;
				const tier = f.tiers[i];
				if (tier.production.output.resource !== 'rubberband') continue;

				const baseAmount = tier.production.output.amount * counts[i];
				let multiplier = baseMultiplier;

				for (const eff of prodMultipliers) {
					if (eff.target.producerType && eff.target.producerType === f.type) multiplier *= eff.multiplier;
					if (eff.target.familyId && eff.target.familyId === f.id) multiplier *= eff.multiplier;
				}

				let amount = baseAmount * multiplier;

				const boostKey = `${f.id}:${i}`;
				const nanoBoost = this.currentNanoBoosts.get(boostKey) || 0;
				if (nanoBoost > 0) {
					// Apply boost (Machine Equivalent)
					amount += nanoBoost * tier.production.output.amount * multiplier;
				}

				let inputRatio = 2; // Default
				for (const eff of efficiencyRules) {
					if (eff.target.producerType === f.type || eff.target.familyId === f.id) {
						inputRatio *= eff.ratioMultiplier;
					}
				}

				// Calculate Net Space Impact
				// Consumes: neededRubber * SPACE_COST_RUBBER
				// Produces: amount * SPACE_COST_RUBBERBAND
				// Impact = (amount * 10) - (neededRubber * 1)
				// neededRubber = amount * inputRatio
				// Impact = amount * (10 - inputRatio)
				const netSpaceImpact = amount * (GAME_CONSTANTS.SPACE_COST_RUBBERBAND - (GAME_CONSTANTS.SPACE_COST_RUBBER * inputRatio));

				if (netSpaceImpact > 0) {
					const availableSpace = this.storageLimit - this.usedStorageSpace;
					const spacePerUnit = GAME_CONSTANTS.SPACE_COST_RUBBERBAND - (GAME_CONSTANTS.SPACE_COST_RUBBER * inputRatio);

					// JIT Production: Allow producing what we can store OR what we can sell immediately
					const maxSales = this.demand; // Max we can sell this tick
					const producedForStorage = Math.floor(Math.max(0, availableSpace) / spacePerUnit);

					const limit = producedForStorage + maxSales;

					if (amount > limit) {
						amount = limit;
					}
				}
				// If netSpaceImpact <= 0, we are freeing space.

				const neededRubber = amount * inputRatio;
				this._theoreticalRubberConsumptionRate += neededRubber;

				if (this.rubber >= neededRubber) {
					this.rubber -= neededRubber;
					produced += amount;
				} else {
					if (neededRubber > 0) {
						// Limited production by rubber supply
						const possible = this.rubber / inputRatio;
						produced += possible;
						this.rubber = 0;
					}
				}
			}
		}

		if (produced > 0) {
			this.rubberbands += produced;
		}
		return produced;
	}

	private runIndustryPhase(baseMultiplier: number) {
		const generalResourceLimit = this.resourceLimit;
		const flatAdditions = this.getEffects('production_output_flat');

		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] <= 0) continue;
				const tier = f.tiers[i];
				const rule = tier.production;
				if (rule.output.resource !== 'producer') continue;
				if (!rule.output.familyId) continue;

				const baseAmount = rule.output.amount * counts[i];
				let multiplier = baseMultiplier;

				let totalAmount = baseAmount * multiplier;

				// Apply Flat Additions (e.g. Nano Swarms - OLD LOGIC REPLACED)
				// Keeping generic hook if needed, but removing old allocation code.
				for (const eff of flatAdditions) {
					if (eff.target.familyId === f.id) {
						totalAmount += eff.amount * counts[i];
					}
				}

				// Nano Swarm Priority Boost
				const boostKey = `${f.id}:${i}`;
				const nanoBoost = this.currentNanoBoosts.get(boostKey) || 0;
				if (nanoBoost > 0) {
					// Output rule is "output: { resource: 'producer', amount: 1 }"
					// So 1 machine equivalent = 1 * multiplier (machines produced).
					// Wait, baseAmount includes multiplier?
					// baseAmount = rule.output.amount * counts[i].
					// totalAmount = baseAmount * multiplier.
					// So +1 machine equivalent = (1 * rule.output.amount) * multiplier.

					totalAmount += nanoBoost * rule.output.amount * multiplier;
				}

				totalAmount = Math.floor(totalAmount);

				let unitResCost = GAME_CONSTANTS.RESOURCE_COST_MACHINE;
				if (rule.output.familyId === 'nanoswarm') unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANO_SWARM;

				const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
				const maxAllowed = Math.floor(remaining / unitResCost);
				if (totalAmount > maxAllowed) totalAmount = maxAllowed;

				if (totalAmount > 0) {
					this.consumedResources += totalAmount * unitResCost;

					const targetId = rule.output.familyId!;
					const targetIdx = rule.output.tierIndex || 0;

					this.producers[targetId][targetIdx] = (this.producers[targetId][targetIdx] || 0) + totalAmount;
					this.purchasedProducers[targetId][targetIdx] = (this.purchasedProducers[targetId][targetIdx] || 0) + totalAmount;
				}
			}
		}
	}

	private runNanoPhase() {
		if (this.nanobotFactoryCount > 0 || (this.nanoAllocation.nanobots > 0 && this.nanoSwarmCount >= 10)) {
			// Now calls the helper which includes the boost!
			const production = this.getNanobotProduction();

			const unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANO_SWARM;
			const generalResourceLimit = this.resourceLimit;

			const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
			let possible = production;
			const maxAllowed = Math.floor(remaining / unitResCost);

			if (possible > maxAllowed) possible = maxAllowed;

			if (possible > 0) {
				this.consumedResources += possible * unitResCost;
				this.nanoSwarmCount += possible;
				this.totalNanoSwarmsProduced += possible;
			}
		}
	}

	// --- GETTERS & HELPERS ---

	get machineProductionRate() { return this._machineProductionRate; }
	get rubberProductionRate() { return this._rubberProductionRate; }
	get theoreticalRubberConsumptionRate() { return this._theoreticalRubberConsumptionRate; }

	get usedStorageSpace(): number {
		let space = (this.rubber * GAME_CONSTANTS.SPACE_COST_RUBBER) +
			(this.rubberbands * GAME_CONSTANTS.SPACE_COST_RUBBERBAND);

		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] <= 0) continue;
				const tier = f.tiers[i];
				if (tier.spaceCost) {
					space += counts[i] * tier.spaceCost;
				}
			}
		}
		return space;
	}

	get storageLimit(): number {
		const limitRules = this.getEffects('resource_limit');
		if (limitRules.some(r => r.limitType === 'infinite')) return Infinity;
		if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.GALAXY_SURFACE_LIMIT;
		return GAME_CONSTANTS.LAND_SURFACE_LIMIT;
	}

	get rubberShortage(): boolean {
		return this.rubber < 1 && this.machineProductionRate > 0;
	}

	getProducerOutput(familyId: string, tierIndex: number): number {
		const family = producerFamilies.find(f => f.id === familyId);
		if (!family) return 0;
		const tier = family.tiers[tierIndex];
		if (!tier || !tier.production) return 0;

		let base = tier.production.output.amount;

		// Rule Based Output Calc for UI
		const prodMultipliers = this.getEffects('production_multiplier');
		for (const eff of prodMultipliers) {
			if (eff.target.producerType === family.type || eff.target.familyId === family.id) {
				base *= eff.multiplier;
			}
		}

		// Nano Boost is now flat and global, handled in process phase.
		// UI displays "Per Machine". We do not include the flat boost here to avoid confusion.

		return base;
	}




	getNanobotProduction(): number {
		let baseRate = 1;

		// Apply Nano Swarm Boost if allocated
		const allocatedSwarms = Math.floor(this.nanoSwarmCount * this.nanoAllocation.nanobots);
		let boostFactories = 0;
		if (allocatedSwarms >= 10) {
			// 10 swarms = +1 factory equivalent
			boostFactories = Math.floor(allocatedSwarms / 10);
		}

		// Total = (Real Count + Virtual Boost Count) * Base Rate
		return (this.nanobotFactoryCount + boostFactories) * baseRate;
	}


	calculateDemand(price: number): number {
		let basevalue = 2;
		let priceSensitivity = 1.0;

		const marketingEffects = this.getEffects('demand_marketing');

		let demandMultiplier = 1;

		for (const eff of marketingEffects) {
			if (eff.marketingEffectivenessMultiplier) basevalue *= eff.marketingEffectivenessMultiplier;
			if (eff.priceSensitivityMultiplier) priceSensitivity *= eff.priceSensitivityMultiplier;
			if (eff.demandMultiplier) demandMultiplier *= eff.demandMultiplier;
		}

		return Math.floor(Math.pow(this.marketingLevel, basevalue) * 50 * Math.exp(-price / priceSensitivity) * demandMultiplier);
	}

	get demand() { return this.calculateDemand(this.rubberbandPrice); }
	get marketingCost() { return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(1.2, this.marketingLevel); }

	get maintenanceCost() {
		let cost = 0;
		for (const f of producerFamilies) {
			const counts = this.producers[f.id];
			for (let i = 0; i < counts.length; i++) {
				if (counts[i] > 0 && f.tiers[i].maintenance_cost) {
					cost += counts[i] * f.tiers[i].maintenance_cost!;
				}
			}
		}
		return cost;
	}

	get marketingDecayInterval() {
		const effects = this.getEffects('demand_marketing');
		let multiplier = 1;
		for (const eff of effects) {
			if (eff.marketingDecayMultiplier !== undefined) multiplier *= eff.marketingDecayMultiplier;
		}
		if (multiplier === 0) return 0; // Infinite/No decay
		return GAME_CONSTANTS.MARKETING_DECAY_INTERVAL * this.marketingLevel;
	}

	get inventoryCost() {
		const rubberExcess = Math.max(0, this.rubber - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBER);
		const bandExcess = Math.max(0, this.rubberbands - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBERBANDS);

		let cost = 0;
		if (rubberExcess > 0) cost += 0.001 * Math.pow(rubberExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBER, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);
		if (bandExcess > 0) cost += 0.001 * Math.pow(bandExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBERBANDS, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);

		const storageRules = this.getEffects('storage_cost');
		for (const eff of storageRules) {
			cost *= eff.multiplier;
		}

		return cost;
	}

	get income() {
		const rubberAvailable = this.rubber + this.rubberProductionRate;
		const bandsProduced = Math.min(this.machineProductionRate, rubberAvailable);
		const bandsAvailable = this.rubberbands + bandsProduced;
		const sold = Math.min(bandsAvailable, this.demand);
		return sold * this.rubberbandPrice;
	}

	get profit() { return this.income - this.maintenanceCost - this.inventoryCost; }
	get netIncome() { return this.profit; }

	get resourceLimit() {
		// Priority: Universe > Earth > Oil
		const limitRules = this.getEffects('resource_limit');
		if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT;
		if (limitRules.some(r => r.limitType === 'earth')) return GAME_CONSTANTS.EARTH_RESOURCE_LIMIT;
		return GAME_CONSTANTS.OIL_RESERVES_LIMIT;
	}

	get consumedOil() { return this.consumedResources; }
	get consumedEarthResources() { return this.consumedResources; }
	get resourceUnitName() {
		const limitRules = this.getEffects('resource_limit');
		if (limitRules.some(r => r.limitType === 'universe')) return "Universe Resources";
		if (limitRules.some(r => r.limitType === 'earth')) return "Earth Resources";
		return "Oil (l)";
	}

	private updateMarket() {
		if (this.tickCount % GAME_CONSTANTS.PRICE_FLUCTUATION_INTERVAL === 0) {
			this.rubberPrice *= 0.95 + Math.random() * 0.1;
			if (this.rubberPrice < GAME_CONSTANTS.MIN_RUBBER_PRICE) this.rubberPrice = GAME_CONSTANTS.MIN_RUBBER_PRICE;
			if (this.rubberPrice > GAME_CONSTANTS.MAX_RUBBER_PRICE) this.rubberPrice = GAME_CONSTANTS.MAX_RUBBER_PRICE;
		}
	}

	private handleAutoBuy() {
		if (this.buyerHired && this.rubber < this.buyerThreshold) {
			const needed = this.buyerThreshold - this.rubber;
			const buyAmount = Math.min(needed, GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION);
			if (buyAmount > 0) this.buyRubber(buyAmount, 1.1);
		}
	}

	private handleAutoSell() {
		const sellAmount = Math.min(this.rubberbands, this.demand);
		if (sellAmount > 0) this.sellRubberbands(sellAmount);
	}

	makeRubberband(amount: number = 1) {
		if (this.gameOver) return false;

		let inputRatio = 2; // Default
		const efficiencyRules = this.getEffects('input_efficiency');
		for (const eff of efficiencyRules) {
			if (eff.target.producerType === 'machine') inputRatio *= eff.ratioMultiplier;
		}

		if (this.rubber >= amount * inputRatio) {
			this.rubber -= amount * inputRatio;
			this.rubberbands += amount;
		}
	}

	buyRubber(amount: number, priceMultiplier: number = 1) {
		if (this.gameOver) return false;
		const limit = GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION + this.rubberProductionRate;
		if (this.rubber >= limit) return false;

		let amountToBuy = amount;
		if (this.rubber + amountToBuy > limit) amountToBuy = limit - this.rubber;

		const limitRules = this.getEffects('resource_limit');
		const hasInterplanetary = limitRules.some(r => r.limitType === 'universe');

		if (!hasInterplanetary) {
			const remaining = Math.max(0, GAME_CONSTANTS.EARTH_RESOURCE_LIMIT - this.totalRubberProduced);
			if (amountToBuy > remaining) amountToBuy = remaining;
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

	// --- GENERIC ACTIONS ---

	getProducerCost(familyId: string, tierIndex: number, amount: number, currentCount?: number) {
		const family = producerFamilies.find(f => f.id === familyId);
		if (!family) return Infinity;
		const tier = family.tiers[tierIndex];
		if (!tier) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.purchasedProducers[familyId]?.[tierIndex] || 0);
		return getCost(tier, amount, count);
	}

	getMaxAffordableProducer(familyId: string, tierIndex: number, currentMoney?: number, currentCount?: number) {
		const family = producerFamilies.find(f => f.id === familyId);
		if (!family) return 0;
		const tier = family.tiers[tierIndex];
		if (!tier) return 0;

		const count = currentCount !== undefined ? currentCount : (this.purchasedProducers[familyId]?.[tierIndex] || 0);
		const money = currentMoney !== undefined ? currentMoney : this.money;

		return getMaxAffordable(tier, money, count);
	}

	isProducerBeingProduced(entityFamilyId: string, tierIndex: number) {
		for (const f of producerFamilies) {
			if (f.tiers.some(t => t.production.output.resource === 'producer' && t.production.output.familyId === entityFamilyId && (t.production.output.tierIndex || 0) === tierIndex)) {

				const counts = this.producers[f.id];
				for (let i = 0; i < counts.length; i++) {
					if (counts[i] > 0) {
						const tier = f.tiers[i];
						if (tier.production.output.familyId === entityFamilyId && (tier.production.output.tierIndex || 0) === tierIndex) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	buyProducer(familyId: string, tierIndex: number, amount: number = 1) {
		if (this.gameOver) return false;

		const family = producerFamilies.find(f => f.id === familyId);
		if (!family) return false;
		const tier = family.tiers[tierIndex];

		if (this.isProducerBeingProduced(familyId, tierIndex)) return false;
		if (tier.allow_manual_purchase === false) return false;
		if (!this.isProducerVisible(tier)) return false;

		const spaceNeeded = (tier.spaceCost || 0) * amount;
		if (spaceNeeded > 0 && this.usedStorageSpace + spaceNeeded > this.storageLimit) {
			return false;
		}

		const cost = this.getProducerCost(familyId, tierIndex, amount);

		if (this.money >= cost) {
			this.money -= cost;
			this.producers[familyId][tierIndex] = (this.producers[familyId][tierIndex] || 0) + amount;
			this.purchasedProducers[familyId][tierIndex] = (this.purchasedProducers[familyId][tierIndex] || 0) + amount;
			return true;
		}

		return false;
	}

	sellProducer(familyId: string, tierIndex: number, amount: number = 1) {
		if (this.gameOver) return false;
		const family = producerFamilies.find(f => f.id === familyId);
		if (!family) return false;
		const tier = family.tiers[tierIndex];

		if (this.isProducerBeingProduced(familyId, tierIndex)) return false;

		const currentCount = this.producers[familyId]?.[tierIndex] || 0;
		if (currentCount < amount) return false;

		const purchasedCount = this.purchasedProducers[familyId]?.[tierIndex] || 0;
		const sellAmountFromPurchased = Math.min(amount, purchasedCount);

		let refund = 0;
		if (sellAmountFromPurchased > 0) {
			refund = Math.floor(0.5 * getCost(tier, sellAmountFromPurchased, purchasedCount - sellAmountFromPurchased));
			this.purchasedProducers[familyId][tierIndex] = purchasedCount - sellAmountFromPurchased;
		}

		this.producers[familyId][tierIndex] = currentCount - amount;
		this.money += refund;
		return true;
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
		const canHire = this.hasGlobalRule('unlock_buyer');
		if (canHire && !this.buyerHired && this.money >= GAME_CONSTANTS.BUYER_COST) {
			this.money -= GAME_CONSTANTS.BUYER_COST;
			this.buyerHired = true;
			return true;
		}
		return false;
	}

	setBuyerThreshold(amount: number) { this.buyerThreshold = amount; }

	buyMarketing() {
		if (this.gameOver) return false;
		const canBuy = this.hasGlobalRule('unlock_marketing');
		if (!canBuy) return false;
		const cost = this.marketingCost;
		if (this.money >= cost) {
			this.money -= cost;
			this.marketingLevel++;
			this.lastMarketingUpdateTick = this.tickCount;
			return true;
		}
		return false;
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

		if (research.precondition_research && !this.researched.includes(research.precondition_research)) return false;

		if (this.money >= research.cost) {
			this.money -= research.cost;
			this.researched.push(researchId);
			return true;
		}
		return false;
	}

	isProducerVisible(item: Producer): boolean {
		if (item.required_research) {
			const reqs = Array.isArray(item.required_research) ? item.required_research : [item.required_research];
			if (!reqs.every(r => this.researched.includes(r))) return false;
		} else if (item.precondition_research && !this.researched.includes(item.precondition_research)) {
			return false;
		}
		return true;
	}

	// --- NANO SYSTEM ACTIONS ---

	get nanobotFactoryCost() {
		// Initial Cost: 1,000,000,000
		// Factor: 2.0
		const count = this.nanobotFactoryCount;
		return Math.floor(1_000_000_000 * Math.pow(2.0, count));
	}

	buyNanobotFactory() {
		if (this.gameOver) return false;
		if (!this.researched.includes('nanotechnology')) return false;

		const cost = this.nanobotFactoryCost;
		if (this.money >= cost) {
			this.money -= cost;
			this.nanobotFactoryCount++;
			return true;
		}
		return false;
	}

	setNanoAllocation(newAllocation: NanoAllocation) {
		this.nanoAllocation = newAllocation;
	}

	getNanoBoost(familyId: string, tierIndex: number): number {
		const key = `${familyId}:${tierIndex}`;
		return this.currentNanoBoosts.get(key) || 0;
	}

	toJSON(): GameState {
		return {
			money: this.money,
			rubberbands: this.rubberbands,
			rubber: this.rubber,
			producers: this.producers,
			purchasedProducers: this.purchasedProducers,
			totalRubberbandsSold: this.totalRubberbandsSold,
			buyerHired: this.buyerHired,
			buyerThreshold: this.buyerThreshold,
			rubberPrice: this.rubberPrice,
			rubberbandPrice: this.rubberbandPrice,
			tickCount: this.tickCount,
			marketingLevel: this.marketingLevel,
			lastMarketingUpdateTick: this.lastMarketingUpdateTick,
			researched: this.researched,
			gameOver: this.gameOver,
			gameStartTime: this.gameStartTime,
			totalRubberProduced: this.totalRubberProduced,
			totalNanoSwarmsProduced: this.totalNanoSwarmsProduced,
			consumedResources: this.consumedResources,
			netIncome: this.netIncome,
			nanoSwarmCount: this.nanoSwarmCount,
			nanobotFactoryCount: this.nanobotFactoryCount,
			nanoAllocation: this.nanoAllocation
		};
	}

	toString() {
		return JSON.stringify(this.toJSON());
	}
}

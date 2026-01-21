import { producerFamilies, researchList, GAME_CONSTANTS, getCost, getMaxAffordable, type ProducerFamily, type Producer, type ResearchType, type ResearchEffect } from './parameters';

// NanoAllocation Refined
export interface NanoAllocation {
	rubber_machines: number; // 0.0 - 1.0 (Percentage of swarms allocated)
	bander_machines: number; // 0.0 - 1.0
	production_lines: number; // 0.0 - 1.0
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
	totalNanobotsProduced: number;
	consumedResources: number;
	gameOver: boolean;
	netIncome: number;
	nanobotCount: number;
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
	totalNanobotsProduced!: number;
	consumedResources!: number;
	nanobotCount!: number;
	nanobotFactoryCount!: number;
	nanoAllocation!: NanoAllocation;

	// Runtime Stats for UI
	private _rubberProductionRate: number = 0;
	private _machineProductionRate: number = 0; // Rubberbands
	private _theoreticalRubberConsumptionRate: number = 0; // How much rubber factories WANT to eat

	private lastPriceUpdateTick: number = 0;

	// Nano Swarm Logic



	constructor(serialized: string | undefined = undefined) {
		this.reset();
		if (serialized) {
			try {
				const data = JSON.parse(serialized) as GameState;
				this.money = data.money;
				this.rubberbands = data.rubberbands;
				this.rubber = data.rubber;
				this.nanobotCount = data.nanobotCount || 0;
				this.nanobotFactoryCount = data.nanobotFactoryCount || 0;

				// Migration: If old style allocation, reset to defaults or migrate
				if (data.nanoAllocation && 'production_lines' in data.nanoAllocation) {
					this.nanoAllocation = data.nanoAllocation;
				} else {
					this.nanoAllocation = { rubber_machines: 0.25, bander_machines: 0.25, production_lines: 0.25, nanobots: 0.25 };
				}

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
				this.totalNanobotsProduced = data.totalNanobotsProduced;
				this.consumedResources = data.consumedResources;

				// Migration for Nano Refactor
				if (this.producers['nanoswarm'] && this.producers['nanoswarm'][0] > 0) {
					this.nanobotCount += this.producers['nanoswarm'][0];
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
		this.totalNanobotsProduced = 0;
		this.consumedResources = 0;
		this.nanobotCount = 0;
		this.nanobotFactoryCount = 0;
		this.nanoAllocation = { rubber_machines: 0.25, bander_machines: 0.25, production_lines: 0.25, nanobots: 0.25 };
	}

	// --- EFFECT HELPERS ---

	private getSpaceCostMultiplier(): number {
		const effects = this.getEffects('storage_cost');
		let multiplier = 1.0;
		for (const eff of effects) {
			multiplier *= eff.multiplier;
		}
		return multiplier;
	}

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

	public getFamilyNanoEfficiency(allocationKey: keyof NanoAllocation, relevantFamilies: string[]): number {
		if (this.nanobotCount <= 0) return 0;
		const allocated = this.nanobotCount * this.nanoAllocation[allocationKey];
		if (allocated <= 0) return 0;

		let denominator = 0;
		for (const fid of relevantFamilies) {
			const family = producerFamilies.find(f => f.id === fid);
			if (!family) continue;

			const counts = this.producers[fid];
			for (let i = 0; i < counts.length; i++) {
				const tier = family.tiers[i];
				if (counts[i] > 0 && tier.nanoswarm_threshold) {
					denominator += counts[i] * tier.nanoswarm_threshold;
				}
			}
		}

		if (denominator === 0) return 0; // Or should it be infinite boost? No, infinite boost on 0 machines is 0. But if threshold is missing, we shouldn't boost? 
		// If denominator is 0, it means we have NO machines that CAN accept boost (or count is 0).
		// If count is 0, production is 0 anyway.

		return allocated / denominator;
	}

	private runRawMaterialsPhase(baseMultiplier: number): number {
		let produced = 0;
		const generalResourceLimit = this.resourceLimit;

		const prodMultipliers = this.getEffects('production_multiplier');
		const additiveMultipliers = this.getEffects('production_multiplier_additive');

		// Calculate Efficiency for Rubber Group (Sources Only)
		const nanoEfficiency = this.getFamilyNanoEfficiency('rubber_machines', ['rubber_sources']);

		// Dynamic Space Costs
		const spaceMultiplier = this.getSpaceCostMultiplier() || 0;
		const spacePerRubber = GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier;

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

				let amount = baseAmount * multiplier;

				// Apply Nano Efficiency
				if (nanoEfficiency > 0) {
					amount *= (1 + nanoEfficiency);
				}

				if (amount > 0) {
					// Check Resource Limits
					if (tier.name === "Synthetic Rubber Mixer") {
						const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
						const costPerUnit = GAME_CONSTANTS.RESOURCE_COST_SYNTHETIC_RUBBER;
						const maxProd = Math.floor(remaining / costPerUnit);
						if (amount > maxProd) amount = maxProd;
						if (amount > 0) this.consumedResources += amount * costPerUnit;
					}
					else if (tier.name === "Black Hole Extruder") {
						const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
						const costPerUnit = 1.0;
						const maxProd = Math.floor(remaining / costPerUnit);
						if (amount > maxProd) amount = maxProd;
						if (amount > 0) this.consumedResources += amount * costPerUnit;
					}

					// Dynamic Storage Limit Logic
					let maxFill = Number.MAX_VALUE;
					const storageLimit = this.storageLimit;
					const availableSpace = storageLimit === Infinity ? Number.MAX_VALUE : Math.max(0, storageLimit - this.usedStorageSpace);

					if (storageLimit === Infinity) {
						maxFill = Number.MAX_VALUE;
					} else {
						if (spacePerRubber <= 0) {
							maxFill = Number.MAX_VALUE;
						} else {
							maxFill = Math.floor(availableSpace / spacePerRubber);
						}
					}

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

		// Calculate Efficiency for Bander Group (Machines Only)
		const nanoEfficiency = this.getFamilyNanoEfficiency('bander_machines', ['bander']);

		// Dynamic Space Costs
		const spaceMultiplier = this.getSpaceCostMultiplier() || 0;
		const rawRubberSpace = GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier;
		const rawBanderSpace = GAME_CONSTANTS.SPACE_COST_RUBBERBAND * spaceMultiplier;

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

				// Apply Nano Efficiency
				if (nanoEfficiency > 0) {
					amount *= (1 + nanoEfficiency);
				}

				let inputRatio = 2; // Default
				for (const eff of efficiencyRules) {
					if (eff.target.producerType === f.type || eff.target.familyId === f.id) {
						inputRatio *= eff.ratioMultiplier;
					}
				}

				// Check Storage Space for Outputs
				const netSpaceImpact = amount * (rawBanderSpace - (rawRubberSpace * inputRatio));

				if (netSpaceImpact > 0) {
					const storageLimit = this.storageLimit;
					const availableSpace = storageLimit === Infinity ? Number.MAX_VALUE : Math.max(0, storageLimit - this.usedStorageSpace);
					const spacePerUnit = rawBanderSpace - (rawRubberSpace * inputRatio);

					if (spacePerUnit > 0) {
						let producedForStorage = Number.MAX_VALUE;
						if (storageLimit !== Infinity) {
							producedForStorage = Math.floor(availableSpace / spacePerUnit);
						}

						const maxSales = this.demand;
						const limit = producedForStorage + maxSales;
						if (amount > limit) {
							amount = limit;
						}
					}
				}

				const neededRubber = amount * inputRatio;
				this._theoreticalRubberConsumptionRate += neededRubber;

				if (this.rubber >= neededRubber) {
					this.rubber -= neededRubber;
					produced += amount;
				} else {
					if (neededRubber > 0) {
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

		// Logic for Industry Phase:
		// Lines now use 'production_lines' allocation.

		const linesEfficiency = this.getFamilyNanoEfficiency('production_lines', ['rubber_factory_line', 'bander_line']);

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

				for (const eff of flatAdditions) {
					if (eff.target.familyId === f.id) {
						totalAmount += eff.amount * counts[i];
					}
				}

				// Apply Efficiency
				// Since all producers in this phase are lines, we use linesEfficiency for all.
				// (Assuming no other producers make producers... wait, what about self-replicating bots? dealt in Nano Phase)

				if (linesEfficiency > 0) {
					totalAmount *= (1 + linesEfficiency);
				}

				totalAmount = Math.floor(totalAmount);

				let unitResCost = GAME_CONSTANTS.RESOURCE_COST_MACHINE;
				if (rule.output.familyId === 'nanoswarm') unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANOBOT;

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
		if (this.nanobotFactoryCount > 0 || (this.nanoAllocation.nanobots > 0 && this.nanobotCount >= 10)) {

			const production = this.getNanobotProduction();

			const unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANOBOT;
			const generalResourceLimit = this.resourceLimit;

			const remaining = Math.max(0, generalResourceLimit - this.consumedResources);
			let possible = production;
			const maxAllowed = Math.floor(remaining / unitResCost);

			if (possible > maxAllowed) possible = maxAllowed;

			if (possible > 0) {
				this.consumedResources += possible * unitResCost;
				this.nanobotCount += possible;
				this.totalNanobotsProduced += possible;
			}
		}
	}

	// --- GETTERS & HELPERS ---

	get machineProductionRate() { return this._machineProductionRate; }
	get rubberProductionRate() { return this._rubberProductionRate; }
	get theoreticalRubberConsumptionRate() { return this._theoreticalRubberConsumptionRate; }

	get usedStorageSpace(): number {
		const spaceMultiplier = this.getSpaceCostMultiplier();
		let space = (this.rubber * GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier) +
			(this.rubberbands * GAME_CONSTANTS.SPACE_COST_RUBBERBAND * spaceMultiplier);

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

		// Apply Nano Efficiency for Display
		let nanoEfficiency = 0;
		if (family.type === 'rubber_source' && tier.name !== 'Black Hole Extruder') {
			// Black Hole Extruder is a rubber source but might not be boosted by same logic or is it?
			// runRawMaterialsPhase uses: getFamilyNanoEfficiency('rubber_machines', ['rubber_sources'])
			// It iterates all tiers. Black Hole IS in rubber_sources.
			nanoEfficiency = this.getFamilyNanoEfficiency('rubber_machines', ['rubber_sources']);
		} else if (family.type === 'machine') {
			nanoEfficiency = this.getFamilyNanoEfficiency('bander_machines', ['bander']);
		} else if (family.type === 'production_line') {
			nanoEfficiency = this.getFamilyNanoEfficiency('production_lines', ['rubber_factory_line', 'bander_line']);
		}

		if (nanoEfficiency > 0) {
			base *= (1 + nanoEfficiency);
		}

		return base;
	}




	getNanobotProduction(): number {
		let baseRate = 1;

		// Calculate Efficiency
		// For Nanobot production ("Self Replication"), we can define a threshold too.
		// "allocated nanobots by producer family / sum of nanoswarm threashhold by tier * purchased producers by tier"
		// If Nanobot Factory has a threshold of 10 (implicit as per previous logic, or explicitly added?)
		// I didn't add threshold to legacy nanobot factory/swarm logic in parameters because they were special.
		// Use manual formula here: Threshold 10.

		const allocated = this.nanobotCount * this.nanoAllocation.nanobots;
		// Denominator: factories * 10
		const denominator = this.nanobotFactoryCount * 10;

		let efficiency = 0;
		if (denominator > 0) efficiency = allocated / denominator;

		// Total = Count * Base * (1 + Efficiency)
		return this.nanobotFactoryCount * baseRate * (1 + efficiency);
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
		// Priority: Infinite > Universe > Earth > Oil
		const limitRules = this.getEffects('resource_limit');
		if (limitRules.some(r => r.limitType === 'infinite')) return Number.MAX_VALUE;
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
			totalNanobotsProduced: this.totalNanobotsProduced,
			consumedResources: this.consumedResources,
			netIncome: this.netIncome,
			nanobotCount: this.nanobotCount,
			nanobotFactoryCount: this.nanobotFactoryCount,
			nanoAllocation: this.nanoAllocation
		};
	}

	toString() {
		return JSON.stringify(this.toJSON());
	}
}

import { get } from 'svelte/store'; // Not using stores, but might need helpers? No.
import { game } from '../state/gameState.svelte';
import { producerFamilies, GAME_CONSTANTS, researchList, getCost, getMaxAffordable, type ResearchEffect, type Producer, type NanoAllocation } from '../../routes/rubberband/parameters';

// Helper: Get Effects
export function getEffects<T extends ResearchEffect['type']>(type: T): Extract<ResearchEffect, { type: T }>[] {
    const effects: Extract<ResearchEffect, { type: T }>[] = [];

    // 1. Research Effects
    for (const rId of game.researched) {
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
        const counts = game.producers[f.id];
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

                        effects.push(scaled as Extract<ResearchEffect, { type: T }>);
                    }
                }
            }
        }
    }

    return effects;
}

export function hasGlobalRule(rule: 'unlock_buyer' | 'unlock_marketing'): boolean {
    const rules = getEffects('global_rule');
    return rules.some(r => r.rule === rule);
}

function getSpaceCostMultiplier(): number {
    const effects = getEffects('storage_cost');
    let multiplier = 1.0;
    for (const eff of effects) {
        multiplier *= eff.multiplier;
    }
    return multiplier;
}

// --- GETTERS (Derived Logic) ---
// Note: These could be getters on the class, or separate functions.
// Functions are fine, they read current state.

export function getFamilyNanoEfficiency(allocationKey: keyof NanoAllocation, relevantFamilies: string[]): number {
    if (game.nanobotCount <= 0) return 0;
    const allocated = game.nanobotCount * game.nanoAllocation[allocationKey];
    if (allocated <= 0) return 0;

    let denominator = 0;
    for (const fid of relevantFamilies) {
        const family = producerFamilies.find(f => f.id === fid);
        if (!family) continue;

        const counts = game.producers[fid];
        for (let i = 0; i < counts.length; i++) {
            const tier = family.tiers[i];
            if (counts[i] > 0 && tier.nanoswarm_threshold) {
                denominator += counts[i] * tier.nanoswarm_threshold;
            }
        }
    }

    if (denominator === 0) return 0;
    return allocated / denominator;
}

export function getNanobotProduction(): number {
    let baseRate = 1;

    // Calculate Efficiency
    // Nanobot Factory has a hardcoded threshold of 10 for now.

    const allocated = game.nanobotCount * game.nanoAllocation.nanobots;
    const denominator = game.nanobotFactoryCount * 10;

    let efficiency = 0;
    if (denominator > 0) efficiency = allocated / denominator;

    return game.nanobotFactoryCount * baseRate * (1 + efficiency);
}

export function calculateDemand(price: number): number {
    let basevalue = 2;
    let priceSensitivity = 1.0;

    const marketingEffects = getEffects('demand_marketing');

    let demandMultiplier = 1;

    for (const eff of marketingEffects) {
        if (eff.marketingEffectivenessMultiplier) basevalue *= eff.marketingEffectivenessMultiplier;
        if (eff.priceSensitivityMultiplier) priceSensitivity *= eff.priceSensitivityMultiplier;
        if (eff.demandMultiplier) demandMultiplier *= eff.demandMultiplier;
    }

    return Math.floor(Math.pow(game.marketingLevel, basevalue) * 50 * Math.exp(-price / priceSensitivity) * demandMultiplier);
}

export function getDemand() { return calculateDemand(game.rubberbandPrice); }

export function getMarketingCost() { return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(1.2, game.marketingLevel); }

export function getMaintenanceCost() {
    let cost = 0;
    for (const f of producerFamilies) {
        const counts = game.producers[f.id];
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > 0 && f.tiers[i].maintenance_cost) {
                cost += counts[i] * f.tiers[i].maintenance_cost!;
            }
        }
    }
    return cost;
}

export function getInventoryCost() {
    const rubberExcess = Math.max(0, game.rubber - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBER);
    const bandExcess = Math.max(0, game.rubberbands - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBERBANDS);

    let cost = 0;
    if (rubberExcess > 0) cost += 0.001 * Math.pow(rubberExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBER, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);
    if (bandExcess > 0) cost += 0.001 * Math.pow(bandExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBERBANDS, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);

    const storageRules = getEffects('storage_cost');
    for (const eff of storageRules) {
        cost *= eff.multiplier;
    }

    return cost;
}

export function getResourceLimit() {
    const limitRules = getEffects('resource_limit');
    if (limitRules.some(r => r.limitType === 'infinite')) return Number.MAX_VALUE;
    if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT;
    if (limitRules.some(r => r.limitType === 'earth')) return GAME_CONSTANTS.EARTH_RESOURCE_LIMIT;
    return GAME_CONSTANTS.OIL_RESERVES_LIMIT;
}

export function getUsedStorageSpace(): number {
    const spaceMultiplier = getSpaceCostMultiplier();
    let space = (game.rubber * GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier) +
        (game.rubberbands * GAME_CONSTANTS.SPACE_COST_RUBBERBAND * spaceMultiplier);

    for (const f of producerFamilies) {
        const counts = game.producers[f.id];
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

export function getStorageLimit(): number {
    const limitRules = getEffects('resource_limit');
    if (limitRules.some(r => r.limitType === 'infinite')) return Infinity;
    if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.GALAXY_SURFACE_LIMIT;
    return GAME_CONSTANTS.LAND_SURFACE_LIMIT;
}

export function getIncome() {
    const rubberAvailable = game.rubber + game._rubberProductionRate;
    const bandsProduced = Math.min(game._machineProductionRate, rubberAvailable);
    const bandsAvailable = game.rubberbands + bandsProduced;
    const sold = Math.min(bandsAvailable, getDemand());
    return sold * game.rubberbandPrice;
}

export function getProfit() { return getIncome() - getMaintenanceCost() - getInventoryCost(); }
export function getNetIncome() { return getProfit(); }


// --- PHASES ---

function runRawMaterialsPhase(baseMultiplier: number): number {
    let produced = 0;
    const generalResourceLimit = getResourceLimit();

    const prodMultipliers = getEffects('production_multiplier');
    const additiveMultipliers = getEffects('production_multiplier_additive');

    const nanoEfficiency = getFamilyNanoEfficiency('rubber_machines', ['rubber_sources']);

    const spaceMultiplier = getSpaceCostMultiplier() || 0;
    const spacePerRubber = GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier;

    for (const f of producerFamilies) {
        const counts = game.producers[f.id];
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] <= 0) continue;
            const tier = f.tiers[i];
            if (tier.production.output.resource !== 'rubber') continue;

            const baseAmount = tier.production.output.amount * counts[i];
            let multiplier = baseMultiplier;

            for (const eff of prodMultipliers) {
                if (eff.target.producerType && eff.target.producerType === f.type) multiplier *= eff.multiplier;
                if (eff.target.familyId && eff.target.familyId === f.id) multiplier *= eff.multiplier;
            }

            for (const eff of additiveMultipliers) {
                if (eff.target.producerType === f.type || eff.target.familyId === f.id) {
                    multiplier += eff.addend;
                }
            }

            let amount = baseAmount * multiplier;

            if (nanoEfficiency > 0) {
                amount *= (1 + nanoEfficiency);
            }

            if (amount > 0) {
                if (tier.name === "Synthetic Rubber Mixer") {
                    const remaining = Math.max(0, generalResourceLimit - game.consumedResources);
                    const costPerUnit = GAME_CONSTANTS.RESOURCE_COST_SYNTHETIC_RUBBER;
                    const maxProd = Math.floor(remaining / costPerUnit);
                    if (amount > maxProd) amount = maxProd;
                    if (amount > 0) game.consumedResources += amount * costPerUnit;
                }
                else if (tier.name === "Black Hole Extruder") {
                    const remaining = Math.max(0, generalResourceLimit - game.consumedResources);
                    const costPerUnit = 1.0;
                    const maxProd = Math.floor(remaining / costPerUnit);
                    if (amount > maxProd) amount = maxProd;
                    if (amount > 0) game.consumedResources += amount * costPerUnit;
                }

                let maxFill = Number.MAX_VALUE;
                const storageLimit = getStorageLimit();
                const availableSpace = storageLimit === Infinity ? Number.MAX_VALUE : Math.max(0, storageLimit - getUsedStorageSpace());

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

                game.rubber += amount;
                game.totalRubberProduced += amount;
                produced += amount;
            }
        }
    }
    return produced;
}

function runManufacturingPhase(baseMultiplier: number): number {
    let produced = 0;
    game._theoreticalRubberConsumptionRate = 0; // Reset
    const prodMultipliers = getEffects('production_multiplier');
    const efficiencyRules = getEffects('input_efficiency');

    const nanoEfficiency = getFamilyNanoEfficiency('bander_machines', ['bander']);

    const spaceMultiplier = getSpaceCostMultiplier() || 0;
    const rawRubberSpace = GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier;
    const rawBanderSpace = GAME_CONSTANTS.SPACE_COST_RUBBERBAND * spaceMultiplier;

    for (const f of producerFamilies) {
        const counts = game.producers[f.id];
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

            if (nanoEfficiency > 0) {
                amount *= (1 + nanoEfficiency);
            }

            let inputRatio = 2; // Default
            for (const eff of efficiencyRules) {
                if (eff.target.producerType === f.type || eff.target.familyId === f.id) {
                    inputRatio *= eff.ratioMultiplier;
                }
            }

            const netSpaceImpact = amount * (rawBanderSpace - (rawRubberSpace * inputRatio));

            if (netSpaceImpact > 0) {
                const storageLimit = getStorageLimit();
                const availableSpace = storageLimit === Infinity ? Number.MAX_VALUE : Math.max(0, storageLimit - getUsedStorageSpace());
                const spacePerUnit = rawBanderSpace - (rawRubberSpace * inputRatio);

                if (spacePerUnit > 0) {
                    let producedForStorage = Number.MAX_VALUE;
                    if (storageLimit !== Infinity) {
                        producedForStorage = Math.floor(availableSpace / spacePerUnit);
                    }

                    const maxSales = getDemand();
                    const limit = producedForStorage + maxSales;
                    if (amount > limit) {
                        amount = limit;
                    }
                }
            }

            const neededRubber = amount * inputRatio;
            game._theoreticalRubberConsumptionRate += neededRubber;

            if (game.rubber >= neededRubber) {
                game.rubber -= neededRubber;
                produced += amount;
            } else {
                if (neededRubber > 0) {
                    const possible = game.rubber / inputRatio;
                    produced += possible;
                    game.rubber = 0;
                }
            }
        }
    }

    if (produced > 0) {
        game.rubberbands += produced;
    }
    return produced;
}

function runIndustryPhase(baseMultiplier: number) {
    const generalResourceLimit = getResourceLimit();
    const flatAdditions = getEffects('production_output_flat');
    const linesEfficiency = getFamilyNanoEfficiency('production_lines', ['rubber_factory_line', 'bander_line']);

    for (const f of producerFamilies) {
        const counts = game.producers[f.id];
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

            if (linesEfficiency > 0) {
                totalAmount *= (1 + linesEfficiency);
            }

            totalAmount = Math.floor(totalAmount);

            let unitResCost = GAME_CONSTANTS.RESOURCE_COST_MACHINE;
            if (rule.output.familyId === 'nanoswarm') unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANOBOT;

            const remaining = Math.max(0, generalResourceLimit - game.consumedResources);
            const maxAllowed = Math.floor(remaining / unitResCost);
            if (totalAmount > maxAllowed) totalAmount = maxAllowed;

            if (totalAmount > 0) {
                game.consumedResources += totalAmount * unitResCost;

                const targetId = rule.output.familyId!;
                const targetIdx = rule.output.tierIndex || 0;

                game.producers[targetId][targetIdx] = (game.producers[targetId][targetIdx] || 0) + totalAmount;
                game.purchasedProducers[targetId][targetIdx] = (game.purchasedProducers[targetId][targetIdx] || 0) + totalAmount;
            }
        }
    }
}

function runNanoPhase() {
    if (game.nanobotFactoryCount > 0 || (game.nanoAllocation.nanobots > 0 && game.nanobotCount >= 10)) {
        const production = getNanobotProduction();
        const unitResCost = GAME_CONSTANTS.RESOURCE_COST_NANOBOT;
        const generalResourceLimit = getResourceLimit();
        const remaining = Math.max(0, generalResourceLimit - game.consumedResources);
        let possible = production;
        const maxAllowed = Math.floor(remaining / unitResCost);

        if (possible > maxAllowed) possible = maxAllowed;

        if (possible > 0) {
            game.consumedResources += possible * unitResCost;
            game.nanobotCount += possible;
            game.totalNanobotsProduced += possible;
        }
    }
}


function updateMarket() {
    if (game.tickCount % GAME_CONSTANTS.PRICE_FLUCTUATION_INTERVAL === 0) {
        game.rubberPrice *= 0.95 + Math.random() * 0.1;
        if (game.rubberPrice < GAME_CONSTANTS.MIN_RUBBER_PRICE) game.rubberPrice = GAME_CONSTANTS.MIN_RUBBER_PRICE;
        if (game.rubberPrice > GAME_CONSTANTS.MAX_RUBBER_PRICE) game.rubberPrice = GAME_CONSTANTS.MAX_RUBBER_PRICE;
    }
}

function handleAutoBuy() {
    if (game.buyerHired && game.rubber < game.buyerThreshold) {
        const needed = game.buyerThreshold - game.rubber;
        const buyAmount = Math.min(needed, GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION);
        if (buyAmount > 0) buyRubber(buyAmount, 1.1);
    }
}

function handleAutoSell() {
    const sellAmount = Math.min(game.rubberbands, getDemand());
    if (sellAmount > 0) sellRubberbands(sellAmount);
}


// --- EXPORTED ACTIONS ---

export function tick() {
    if (game.gameOver) return;

    if (game.consumedResources >= GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT) {
        game.gameOver = true;
        return;
    }

    game.tickCount++;

    const decay = getMarketingDecayInterval();
    if (decay > 0) {
        if (game.tickCount - game.lastMarketingUpdateTick >= decay) {
            if (game.marketingLevel > 1) game.marketingLevel--;
            game.lastMarketingUpdateTick = game.tickCount;
        }
    }

    updateMarket();

    const globalSpeedMultiplier = 1.0;

    game._rubberProductionRate = runRawMaterialsPhase(globalSpeedMultiplier);
    game._machineProductionRate = runManufacturingPhase(globalSpeedMultiplier);
    runIndustryPhase(globalSpeedMultiplier);
    runNanoPhase();

    handleAutoBuy();
    handleAutoSell();

    const invCost = getInventoryCost();
    game.money -= invCost;
    game.money -= getMaintenanceCost();
}

function getMarketingDecayInterval() {
    const effects = getEffects('demand_marketing');
    let multiplier = 1;
    for (const eff of effects) {
        if (eff.marketingDecayMultiplier !== undefined) multiplier *= eff.marketingDecayMultiplier;
    }
    if (multiplier === 0) return 0;
    return GAME_CONSTANTS.MARKETING_DECAY_INTERVAL * game.marketingLevel;
}

export function makeRubberband(amount: number = 1) {
    if (game.gameOver) return false;

    let inputRatio = 2; // Default
    const efficiencyRules = getEffects('input_efficiency');
    for (const eff of efficiencyRules) {
        if (eff.target.producerType === 'machine') inputRatio *= eff.ratioMultiplier;
    }

    if (game.rubber >= amount * inputRatio) {
        game.rubber -= amount * inputRatio;
        game.rubberbands += amount;
    }
}

export function buyRubber(amount: number, priceMultiplier: number = 1) {
    if (game.gameOver) return false;
    const limit = GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION + game._rubberProductionRate;
    if (game.rubber >= limit) return false;

    let amountToBuy = amount;
    if (game.rubber + amountToBuy > limit) amountToBuy = limit - game.rubber;

    const limitRules = getEffects('resource_limit');
    const hasInterplanetary = limitRules.some(r => r.limitType === 'universe');

    if (!hasInterplanetary) {
        const remaining = Math.max(0, GAME_CONSTANTS.EARTH_RESOURCE_LIMIT - game.totalRubberProduced);
        if (amountToBuy > remaining) amountToBuy = remaining;
    }

    if (amountToBuy <= 0) return false;

    const cost = amountToBuy * game.rubberPrice * priceMultiplier;
    if (game.money >= cost) {
        game.money -= cost;
        game.rubber += amountToBuy;
        game.totalRubberProduced += amountToBuy;
        return true;
    }
    return false;
}

export function sellRubberbands(amount: number) {
    if (game.gameOver) return false;
    if (game.rubberbands >= amount) {
        game.rubberbands -= amount;
        game.money += amount * game.rubberbandPrice;
        game.totalRubberbandsSold += amount;
        return true;
    }
    return false;
}

export function hireBuyer() {
    if (game.gameOver) return false;
    const canHire = hasGlobalRule('unlock_buyer');
    if (canHire && !game.buyerHired && game.money >= GAME_CONSTANTS.BUYER_COST) {
        game.money -= GAME_CONSTANTS.BUYER_COST;
        game.buyerHired = true;
        return true;
    }
    return false;
}

export function setBuyerThreshold(amount: number) { game.buyerThreshold = amount; }

export function buyMarketing() {
    if (game.gameOver) return false;
    const canBuy = hasGlobalRule('unlock_marketing');
    if (!canBuy) return false;
    const cost = getMarketingCost();
    if (game.money >= cost) {
        game.money -= cost;
        game.marketingLevel++;
        game.lastMarketingUpdateTick = game.tickCount;
        return true;
    }
    return false;
}

export function setRubberbandPrice(price: number) {
    game.rubberbandPrice = price;
    if (game.rubberbandPrice < GAME_CONSTANTS.MIN_RUBBERBAND_PRICE) game.rubberbandPrice = GAME_CONSTANTS.MIN_RUBBERBAND_PRICE;
}

export function buyResearch(researchId: string) {
    if (game.gameOver) return false;
    if (game.researched.includes(researchId)) return false;

    const research = researchList.find(r => r.id === researchId);
    if (!research) return false;

    if (research.precondition_research && !game.researched.includes(research.precondition_research)) return false;

    if (game.money >= research.cost) {
        game.money -= research.cost;
        game.researched.push(researchId);
        return true;
    }
    return false;
}

export function isProducerVisible(item: Producer): boolean {
    if (item.required_research) {
        const reqs = Array.isArray(item.required_research) ? item.required_research : [item.required_research];
        if (!reqs.every(r => game.researched.includes(r))) return false;
    } else if (item.precondition_research && !game.researched.includes(item.precondition_research)) {
        return false;
    }
    return true;
}

export function getNanobotFactoryCost() {
    const count = game.nanobotFactoryCount;
    return Math.floor(1_000_000_000 * Math.pow(2.0, count));
}

export function buyNanobotFactory() {
    if (game.gameOver) return false;
    if (!game.researched.includes('nanotechnology')) return false;

    const cost = getNanobotFactoryCost();
    if (game.money >= cost) {
        game.money -= cost;
        game.nanobotFactoryCount++;
        return true;
    }
    return false;
}

export function setNanoAllocation(newAllocation: NanoAllocation) {
    game.nanoAllocation = newAllocation;
}

// Producer Management
export function getProducerCost(familyId: string, tierIndex: number, amount: number, currentCount?: number) {
    const family = producerFamilies.find(f => f.id === familyId);
    if (!family) return Infinity;
    const tier = family.tiers[tierIndex];
    if (!tier) return Infinity;

    const count = currentCount !== undefined ? currentCount : (game.purchasedProducers[familyId]?.[tierIndex] || 0);
    return getCost(tier, amount, count);
}
export function getMaxAffordableProducer(familyId: string, tierIndex: number, currentMoney?: number, currentCount?: number) {
    const family = producerFamilies.find(f => f.id === familyId);
    if (!family) return 0;
    const tier = family.tiers[tierIndex];
    if (!tier) return 0;

    const count = currentCount !== undefined ? currentCount : (game.purchasedProducers[familyId]?.[tierIndex] || 0);
    const money = currentMoney !== undefined ? currentMoney : game.money;

    return getMaxAffordable(tier, money, count);
}

export function isProducerBeingProduced(entityFamilyId: string, tierIndex: number) {
    for (const f of producerFamilies) {
        if (f.tiers.some(t => t.production.output.resource === 'producer' && t.production.output.familyId === entityFamilyId && (t.production.output.tierIndex || 0) === tierIndex)) {

            const counts = game.producers[f.id];
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

export function buyProducer(familyId: string, tierIndex: number, amount: number = 1) {
    if (game.gameOver) return false;

    const family = producerFamilies.find(f => f.id === familyId);
    if (!family) return false;
    const tier = family.tiers[tierIndex];

    if (isProducerBeingProduced(familyId, tierIndex)) return false;
    if (tier.allow_manual_purchase === false) return false;
    if (!isProducerVisible(tier)) return false;

    const spaceNeeded = (tier.spaceCost || 0) * amount;
    if (spaceNeeded > 0 && getUsedStorageSpace() + spaceNeeded > getStorageLimit()) {
        return false;
    }

    const cost = getProducerCost(familyId, tierIndex, amount);

    if (game.money >= cost) {
        game.money -= cost;
        game.producers[familyId][tierIndex] = (game.producers[familyId][tierIndex] || 0) + amount;
        game.purchasedProducers[familyId][tierIndex] = (game.purchasedProducers[familyId][tierIndex] || 0) + amount;
        return true;
    }

    return false;
}

export function sellProducer(familyId: string, tierIndex: number, amount: number = 1) {
    if (game.gameOver) return false;
    const family = producerFamilies.find(f => f.id === familyId);
    if (!family) return false;
    const tier = family.tiers[tierIndex];

    if (isProducerBeingProduced(familyId, tierIndex)) return false;

    const currentCount = game.producers[familyId]?.[tierIndex] || 0;
    if (currentCount < amount) return false;

    const purchasedCount = game.purchasedProducers[familyId]?.[tierIndex] || 0;
    const sellAmountFromPurchased = Math.min(amount, purchasedCount);

    let refund = 0;
    if (sellAmountFromPurchased > 0) {
        refund = Math.floor(0.5 * getCost(tier, sellAmountFromPurchased, purchasedCount - sellAmountFromPurchased));
        game.purchasedProducers[familyId][tierIndex] = purchasedCount - sellAmountFromPurchased;
    }

    game.producers[familyId][tierIndex] = currentCount - amount;
    game.money += refund;
    return true;
}

export function getProducerOutput(familyId: string, tierIndex: number): number {
    const family = producerFamilies.find(f => f.id === familyId);
    if (!family) return 0;
    const tier = family.tiers[tierIndex];
    if (!tier || !tier.production) return 0;

    let base = tier.production.output.amount;

    // Rule Based Output Calc for UI
    const prodMultipliers = getEffects('production_multiplier');
    for (const eff of prodMultipliers) {
        if (eff.target.producerType === family.type || eff.target.familyId === family.id) {
            base *= eff.multiplier;
        }
    }

    // Apply Nano Efficiency for Display
    let nanoEfficiency = 0;
    if (family.type === 'rubber_source' && tier.name !== 'Black Hole Extruder') {
        nanoEfficiency = getFamilyNanoEfficiency('rubber_machines', ['rubber_sources']);
    } else if (family.type === 'machine') {
        nanoEfficiency = getFamilyNanoEfficiency('bander_machines', ['bander']);
    } else if (family.type === 'production_line') {
        nanoEfficiency = getFamilyNanoEfficiency('production_lines', ['rubber_factory_line', 'bander_line']);
    }

    if (nanoEfficiency > 0) {
        base *= (1 + nanoEfficiency);
    }

    return base;
}


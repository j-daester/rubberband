import { GAME_CONSTANTS, producerFamilies, researchList, type ResearchEffect } from "../../routes/rubberband/parameters";

export function getEffects(researched: string[], producers: Record<string, number[]>, type: ResearchEffect['type']): ResearchEffect[] {
    const effects: ResearchEffect[] = [];

    // 1. Research Effects
    for (const rId of researched) {
        const def = researchList.find(d => d.id === rId);
        if (def && def.effects) {
            for (const eff of def.effects) {
                if (eff.type === type) {
                    effects.push(eff);
                }
            }
        }
    }

    // 2. Producer Effects (Scaled by count)
    for (const f of producerFamilies) {
        const counts = producers[f.id];
        if (!startWithProducerCheck(counts)) continue;

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
                        effects.push(scaled);
                    }
                }
            }
        }
    }
    return effects;
}

function startWithProducerCheck(counts: number[] | undefined) {
    return counts && counts.length > 0;
}

export function calculateDemand(marketingLevel: number, price: number, researched: string[], producers: Record<string, number[]>) {
    let basevalue = 2;
    let priceSensitivity = 1.0;
    const marketingEffects = getEffects(researched, producers, 'demand_marketing');
    let demandMultiplier = 1;

    for (const eff of marketingEffects as any[]) {
        if (eff.marketingEffectivenessMultiplier) basevalue *= eff.marketingEffectivenessMultiplier;
        if (eff.priceSensitivityMultiplier) priceSensitivity *= eff.priceSensitivityMultiplier;
        if (eff.demandMultiplier) demandMultiplier *= eff.demandMultiplier;
    }

    return Math.floor(Math.pow(marketingLevel, basevalue) * 50 * Math.exp(-price / priceSensitivity) * demandMultiplier);
}

export function getSpaceCostMultiplier(researched: string[], producers: Record<string, number[]>) {
    const effects = getEffects(researched, producers, 'storage_cost') as any[];
    let multiplier = 1.0;
    for (const eff of effects) {
        multiplier *= eff.multiplier;
    }
    return multiplier;
}

export function getUsedStorageSpace(rubber: number, rubberbands: number, producers: Record<string, number[]>, researched: string[]) {
    const spaceMultiplier = getSpaceCostMultiplier(researched, producers);
    let space = (rubber * GAME_CONSTANTS.SPACE_COST_RUBBER * spaceMultiplier) +
        (rubberbands * GAME_CONSTANTS.SPACE_COST_RUBBERBAND * spaceMultiplier);

    for (const f of producerFamilies) {
        const counts = producers[f.id];
        if (!counts) continue;
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

export function getStorageLimit(researched: string[], producers: Record<string, number[]>) {
    const limitRules = getEffects(researched, producers, 'resource_limit') as any[];
    if (limitRules.some(r => r.limitType === 'infinite')) return Infinity;
    if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.GALAXY_SURFACE_LIMIT;
    return GAME_CONSTANTS.LAND_SURFACE_LIMIT;
}

export function getResourceLimit(researched: string[], producers: Record<string, number[]>) {
    const limitRules = getEffects(researched, producers, 'resource_limit') as any[];
    if (limitRules.some(r => r.limitType === 'infinite')) return Number.MAX_VALUE;
    if (limitRules.some(r => r.limitType === 'universe')) return GAME_CONSTANTS.UNIVERSE_RESOURCE_LIMIT;
    if (limitRules.some(r => r.limitType === 'earth')) return GAME_CONSTANTS.EARTH_RESOURCE_LIMIT;
    return GAME_CONSTANTS.OIL_RESERVES_LIMIT;
}

export function getInventoryCost(rubber: number, rubberbands: number, researched: string[], producers: Record<string, number[]>) {
    const rubberExcess = Math.max(0, rubber - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBER);
    const bandExcess = Math.max(0, rubberbands - GAME_CONSTANTS.INVENTORY_LIMIT_RUBBERBANDS);

    let cost = 0;
    if (rubberExcess > 0) cost += 0.001 * Math.pow(rubberExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBER, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);
    if (bandExcess > 0) cost += 0.001 * Math.pow(bandExcess / GAME_CONSTANTS.INVENTORY_COST_DIVISOR_RUBBERBANDS, GAME_CONSTANTS.INVENTORY_COST_EXPONENT);

    const storageRules = getEffects(researched, producers, 'storage_cost') as any[];
    for (const eff of storageRules) {
        cost *= eff.multiplier;
    }
    return cost;
}

export function getMaintenanceCost(producers: Record<string, number[]>) {
    let cost = 0;
    for (const f of producerFamilies) {
        const counts = producers[f.id];
        if (!counts) continue;
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > 0 && f.tiers[i].maintenance_cost) {
                cost += counts[i] * f.tiers[i].maintenance_cost!;
            }
        }
    }
    return cost;
}

export function getMarketingCost(marketingLevel: number) {
    return GAME_CONSTANTS.MARKETING_BASE_COST * Math.pow(1.2, marketingLevel);
}

export function getMarketingDecayInterval(researched: string[], producers: Record<string, number[]>, marketingLevel: number) {
    const effects = getEffects(researched, producers, 'demand_marketing') as any[];
    let multiplier = 1;
    for (const eff of effects) {
        if (eff.marketingDecayMultiplier !== undefined) multiplier *= eff.marketingDecayMultiplier;
    }
    if (multiplier === 0) return 0;
    return GAME_CONSTANTS.MARKETING_DECAY_INTERVAL * marketingLevel;
}

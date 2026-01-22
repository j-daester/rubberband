import { producerFamilies, GAME_CONSTANTS, type NanoAllocation } from '../../routes/rubberband/parameters';
import { calculateDemand, getResourceLimit, getStorageLimit, getUsedStorageSpace, getInventoryCost, getMaintenanceCost, getMarketingCost, getEffects, getMarketingDecayInterval } from '../utils/formulas';

interface GameStateData {
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
    nanobotCount: number;
    nanobotFactoryCount: number;
    nanoAllocation: NanoAllocation;
}

export class GameState {
    money = $state(0);
    rubberbands = $state(0);
    rubber = $state(0);

    producers = $state<Record<string, number[]>>({});
    purchasedProducers = $state<Record<string, number[]>>({});

    totalRubberbandsSold = $state(0);
    buyerHired = $state(false);
    buyerThreshold = $state(0);
    rubberPrice = $state(0);
    rubberbandPrice = $state(0);
    tickCount = $state(0);
    marketingLevel = $state(0);
    lastMarketingUpdateTick = $state(0);
    researched = $state<string[]>([]);
    gameOver = $state(false);
    gameStartTime = $state(0);
    totalRubberProduced = $state(0);
    totalNanobotsProduced = $state(0);
    consumedResources = $state(0);
    nanobotCount = $state(0);
    nanobotFactoryCount = $state(0);
    nanoAllocation = $state<NanoAllocation>({
        rubber_machines: 0.25,
        bander_machines: 0.25,
        production_lines: 0.25,
        nanobots: 0.25
    });

    get nanobotFactoryCost() {
        // Initial Cost: 1,000,000,000
        // Factor: 2.0
        const count = this.nanobotFactoryCount;
        return Math.floor(1_000_000_000 * Math.pow(2.0, count));
    }

    get marketingDecayInterval() { return getMarketingDecayInterval(this.researched, this.producers, this.marketingLevel); }

    get rubberShortage() {
        const rubberSourcesCounts = this.producers['rubber_sources'] || [];
        const hasRubberSources = rubberSourcesCounts.some(c => c > 0);
        return this.rubber < 1 && this._rubberProductionRate <= 0 && this.money < 100 * this.rubberPrice && !this.buyerHired && !hasRubberSources;
    }

    // Runtime Stats for UI
    _rubberProductionRate = $state(0);
    _machineProductionRate = $state(0); // Rubberbands
    _theoreticalRubberConsumptionRate = $state(0); // How much rubber factories WANT to eat

    get demand() { return calculateDemand(this.marketingLevel, this.rubberbandPrice, this.researched, this.producers); }
    get resourceLimit() { return getResourceLimit(this.researched, this.producers); }
    get storageLimit() { return getStorageLimit(this.researched, this.producers); }
    get usedStorageSpace() { return getUsedStorageSpace(this.rubber, this.rubberbands, this.producers, this.researched); }
    get inventoryCost() { return getInventoryCost(this.rubber, this.rubberbands, this.researched, this.producers); }
    get maintenanceCost() { return getMaintenanceCost(this.producers); }
    get marketingCost() { return getMarketingCost(this.marketingLevel); }

    get income() {
        const rubberAvailable = this.rubber + this._rubberProductionRate;
        const bandsProduced = Math.min(this._machineProductionRate, rubberAvailable);
        const bandsAvailable = this.rubberbands + bandsProduced;
        const sold = Math.min(bandsAvailable, this.demand);
        return sold * this.rubberbandPrice;
    }

    get profit() { return this.income - this.maintenanceCost - this.inventoryCost; }
    get netIncome() { return this.profit; }

    get consumedOil() { return this.consumedResources; }
    get consumedEarthResources() { return this.consumedResources; }

    get resourceUnitName() {
        const limitRules = getEffects(this.researched, this.producers, 'resource_limit') as any[];
        if (limitRules.some(r => r.limitType === 'universe')) return "Universe Resources";
        if (limitRules.some(r => r.limitType === 'earth')) return "Earth Resources";
        return "Oil (l)";
    }


    constructor(serialized: string | undefined = undefined) {
        this.reset();
        if (serialized) {
            this.load(serialized);
        }
    }

    load(dataOrString: GameStateData | string) {
        try {
            const data = typeof dataOrString === 'string'
                ? JSON.parse(dataOrString) as GameStateData
                : dataOrString;

            this.money = data.money;
            this.rubberbands = data.rubberbands;
            this.rubber = data.rubber;
            this.nanobotCount = data.nanobotCount || 0;
            this.nanobotFactoryCount = data.nanobotFactoryCount || 0;
            this.nanoAllocation = data.nanoAllocation || {
                rubber_machines: 0.25,
                bander_machines: 0.25,
                production_lines: 0.25,
                nanobots: 0.25
            };

            // Safely restore producers without overwriting the proxy if possible, or just reassign
            if (data.producers) this.producers = data.producers;
            if (data.purchasedProducers) this.purchasedProducers = data.purchasedProducers;

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

            // Ensure producers structure is complete if loaded data is partial
            for (const f of producerFamilies) {
                if (!this.producers[f.id]) this.producers[f.id] = new Array(f.tiers.length).fill(0);
                if (!this.purchasedProducers[f.id])
                    this.purchasedProducers[f.id] = new Array(f.tiers.length).fill(0);
            }

        } catch (e) {
            console.error('Failed to load save game', e);
            // reset() is not called here to preserve whatever state might have been valid or default, 
            // but usually we might want to fallback. The constructor called reset() first anyway.
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
        this.nanoAllocation = {
            rubber_machines: 0.25,
            bander_machines: 0.25,
            production_lines: 0.25,
            nanobots: 0.25
        };
    }

    toJSON(): GameStateData {
        return {
            money: this.money,
            rubberbands: this.rubberbands,
            rubber: this.rubber,
            producers: $state.snapshot(this.producers), // Is this strictly needed? Svelte 5 proxies should stringify fine usually, but snapshots help
            purchasedProducers: $state.snapshot(this.purchasedProducers),
            totalRubberbandsSold: this.totalRubberbandsSold,
            buyerHired: this.buyerHired,
            buyerThreshold: this.buyerThreshold,
            rubberPrice: this.rubberPrice,
            rubberbandPrice: this.rubberbandPrice,
            tickCount: this.tickCount,
            marketingLevel: this.marketingLevel,
            lastMarketingUpdateTick: this.lastMarketingUpdateTick,
            researched: $state.snapshot(this.researched),
            gameOver: this.gameOver,
            gameStartTime: this.gameStartTime,
            totalRubberProduced: this.totalRubberProduced,
            totalNanobotsProduced: this.totalNanobotsProduced,
            consumedResources: this.consumedResources,
            // netIncome: this.netIncome, // Not part of saved data usually
            nanobotCount: this.nanobotCount,
            nanobotFactoryCount: this.nanobotFactoryCount,
            nanoAllocation: $state.snapshot(this.nanoAllocation)
        };
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
}

export const game = new GameState();

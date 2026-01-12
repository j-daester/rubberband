// --- Interfaces ---

export type ProducerType = 'machine' | 'production_line' | 'rubber_source';
export type ResourceType = 'rubber' | 'rubberband' | 'producer' | 'money';

export interface PurchasableItem {
	name: string;
	initial_cost: number;
	cost_factor: number;
	description?: string;
	precondition_research?: string;
	required_research?: string | string[];
	allow_manual_purchase?: boolean;
}

export interface ProductionRule {
	input?: { resource: ResourceType; amount: number };
	output: {
		resource: ResourceType;
		amount: number;
		// For 'entity' production (now 'producer' production?)
		// Let's keep 'entity' resource type for now to mean "A Producer Unit", 
		// OR rename resource type to 'producer' as well? 
		// "output: { resource: 'producer', familyId: ... }"
		// The user request was "EntityFamily/Tier". 
		// Let's change resource type 'entity' to 'producer' for consistency?
		// "produceRawMaterials... output.resource === 'producer'?"
		// The previous code used 'entity' string literal. 
		// I will stick to 'producer' string literal if I change the type definition.
		// Yes, "resource: 'producer'" makes sense.
		familyId?: string;
		tierIndex?: number;
	};
}

export interface Producer extends PurchasableItem {
	maintenance_cost?: number;
	spaceCost?: number; // Space required in m^2

	// Production Rule specifically for the engine
	production: ProductionRule;

	// Passive Effects (scaled by count)
	effects?: ResearchEffect[];
}

export interface ProducerFamily {
	id: string;
	type: ProducerType;
	tiers: Producer[];
}

export type ResearchEffect =
	// Production Boosts
	| {
		type: 'production_multiplier';
		target: {
			producerType?: ProducerType; // e.g. 'machine' (affects all machines)
			familyId?: string; // e.g. 'bander' (affects only banders)
		};
		multiplier: number; // e.g. 2.0 (doubles production)
	}
	| {
		type: 'production_multiplier_additive';
		target: {
			producerType?: ProducerType;
			familyId?: string;
		};
		addend: number; // e.g. 0.01 (adds 1% per unit)
	}
	| {
		type: 'production_output_flat';
		target: {
			producerType?: ProducerType;
			familyId?: string;
		};
		amount: number; // e.g. 0.1 (adds 0.1 units per unit)
	}

	// Efficiency (Input Reduction)
	| {
		type: 'input_efficiency';
		target: { producerType?: ProducerType; familyId?: string };
		ratioMultiplier: number; // e.g. 0.5 (uses half input)
	}

	// Demand / Marketing
	| {
		type: 'demand_marketing';
		marketingEffectivenessMultiplier?: number; // Multiplies exponent base (e.g. 1.2 for +20%)
		priceSensitivityMultiplier?: number; // Multiplies sensitivity (e.g. * 0.5 for less sensitive)
		marketingDecayMultiplier?: number; // 0 = no decay
		demandMultiplier?: number; // Cosmic scale multiplier (e.g. 1e12)
	}

	// Global Mechanics
	| {
		type: 'global_rule';
		rule: 'unlock_buyer' | 'unlock_marketing';
	}
	| {
		type: 'resource_limit';
		limitType: 'oil' | 'earth' | 'universe' | 'infinite';
	}
	| {
		type: 'storage_cost';
		multiplier: number; // e.g. 0.0001
	};


export interface ResearchType {
	id: string;
	name: string;
	description: string;
	cost: number;
	precondition_research?: string;
	effects?: ResearchEffect[];
}

// --- Helper Functions for Cost Calculation ---

export function getCost(item: PurchasableItem, amount: number, currentCount: number): number {
	const r = item.cost_factor;
	const a = Math.floor(item.initial_cost * Math.pow(r, currentCount));

	if (r === 1) {
		return a * amount;
	}

	return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
}

export function getMaxAffordable(item: PurchasableItem, money: number, currentCount: number): number {
	const r = item.cost_factor;
	const a = Math.floor(item.initial_cost * Math.pow(r, currentCount));

	if (money < a) return 0;

	if (r === 1) {
		return Math.floor(money / a);
	}

	const n = Math.floor(Math.log(1 + money * (r - 1) / a) / Math.log(r));
	return n;
}

// --- Data ---
export const researchList: ResearchType[] = [
	{
		id: 'basic_manufacturing',
		name: 'Basic Manufacturing',
		description: 'Unlocks the ability to purchase machines.',
		cost: 100
	},
	{
		id: 'basic_marketing',
		name: 'Basic Marketing',
		description: 'Unlocks marketing campaigns.',
		cost: 500,
		precondition_research: 'basic_manufacturing',
		effects: [{ type: 'global_rule', rule: 'unlock_marketing' }]
	},
	{
		id: 'optimize_production',
		name: 'Optimize Production',
		description: 'Increases the efficiency of all machines, so less rubber is needed to produce the same amount of rubberbands.',
		cost: 1_000,
		precondition_research: 'basic_manufacturing',
		effects: [{ type: 'input_efficiency', target: { producerType: 'machine' }, ratioMultiplier: 0.5 }]
	},
	{
		id: 'sales_management',
		name: 'Sales Management',
		description: 'Unlocks the ability to hire an auto-buyer.',
		cost: 5_000,
		precondition_research: 'basic_marketing',
		effects: [{ type: 'global_rule', rule: 'unlock_buyer' }]
	},
	{
		id: 'online_marketing',
		name: 'Online Marketing',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 5_000,
		precondition_research: 'basic_marketing',
		effects: [{ type: 'demand_marketing', marketingEffectivenessMultiplier: 1.5 }]
	},
	{
		id: 'hyperpersonalisation',
		name: 'Hyperpersonalisation',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 50_000,
		precondition_research: 'online_marketing',
		effects: [{ type: 'demand_marketing', marketingEffectivenessMultiplier: 1.2, priceSensitivityMultiplier: 3 }]
	},
	{
		id: 'rubber_recycling',
		name: 'Rubber Recycling',
		description: 'Increases the output of rubber plantations and synthetic rubber factories by factor 2.',
		cost: 100_000,
		precondition_research: 'optimize_production',
		effects: [{ type: 'production_multiplier', target: { producerType: 'rubber_source' }, multiplier: 2.0 }]
	},
	{
		id: 'synthetic_rubber',
		name: 'Synthetic Rubber',
		description: 'Makes synthetic rubber factories available.',
		cost: 2_500_000,
		precondition_research: 'rubber_recycling'
		// Just an unlock, implicitly handled by 'required_research' on the item, no global effect needed unless we refactor visibility to be rule based too.
		// But for now, visibility is checked via 'id' presence.
	},
	{
		id: 'automated_ai_marketing',
		name: 'Automated AI-Marketing',
		description: 'Eliminates the marketing decay.',
		cost: 1_000_000,
		precondition_research: 'hyperpersonalisation',
		effects: [
			{ type: 'demand_marketing', marketingDecayMultiplier: 0, priceSensitivityMultiplier: 1.0, marketingEffectivenessMultiplier: 1.2 }
		]
		// REVISIT: The logic was:
		// if (automated_ai) { priceSens *= 1.2; baseValue *= 1.2; }
		// BUT also decay removed.
		// Let's model the multipliers.
	},
	// CORRECTION: Let's look at the old logic for automated_ai_marketing
	// if (automated) { priceSens *= 1.2; baseval *= 1.2 }
	// decay check: if (!automated) decay...
	// My struct: marketingDecayMultiplier: 0 (This handles decay)
	// For the boosts:
	// marketingEffectivenessAdd is additive to base exponent.
	// The old logic was Multiplicative on the Total Base.
	// "basevalue *= 1.2". Base was 1.2 + 0.8 + 1.
	// My struct cannot express "Multiply the SUM of previous ADDITIONS".
	// I should probably simplify or match the logic.
	// Current Logic: Base = 1.2. +0.8 (Online) +1 (Hyper).
	// Then * 1.2 (AI).
	// Maybe I should just make the effect "marketing_base_multiplier"?
	// Let's start simple. I'll manually handle the complex math in game.ts if needed, or approximate.
	// OR create a 'marketing_base_multiplier' prop.
	{
		id: 'robotics',
		name: 'Robotics',
		description: 'Makes machines more efficient and allows for the production of more machines.',
		cost: 5_000_000,
		precondition_research: 'optimize_production',
		effects: [{ type: 'production_multiplier', target: { producerType: 'machine' }, multiplier: 2.0 }]
	},
	{
		id: 'hypnosis',
		name: 'Hypnosis',
		description: 'Uses mass hypnosis to compel customers to buy rubberbands.',
		cost: 1_000_000_000,
		precondition_research: 'automated_ai_marketing',
		effects: [{ type: 'demand_marketing', priceSensitivityMultiplier: 2, demandMultiplier: 10 }]
		// Logic: priceSens *= 2. baseValue *= 1.2.
		// I need a way to pass 'baseValueMultiplier'.
	},
	{
		id: 'nanotechnology',
		name: 'Nanotechnology',
		description: 'Unlocks the ability to create self-replicating nanobots for manufacturing.',
		cost: 10_000_000_000,
		precondition_research: 'robotics',
		effects: [{ type: 'demand_marketing', priceSensitivityMultiplier: 2 }] // Billion scale
	},
	{
		id: 'molecular_transformation',
		name: 'Molecular Transformation',
		description: 'Allows creating synthetic rubber from any earth matter, bypassing oil limits.',
		cost: 500_000_000_000_000,
		precondition_research: 'quantum_mechanics',
		effects: [{ type: 'resource_limit', limitType: 'earth' }]
	},
	{
		id: 'quantum_mechanics',
		name: 'Quantum Mechanics',
		description: 'Understanding the quantum realm allows for probabilistic manufacturing.',
		cost: 100_000_000_000,
		precondition_research: 'nanotechnology',
		effects: [{ type: 'demand_marketing', priceSensitivityMultiplier: 2, demandMultiplier: 1e9 }] // Billion scale
	},
	{
		id: 'singularity_theory',
		name: 'Singularity Theory',
		description: 'Harnessing the power of a black hole for material extrusion. Eliminates all storage limits and costs.',
		cost: 100_000_000_000,
		precondition_research: 'molecular_transformation',
		effects: [
			{ type: 'demand_marketing', demandMultiplier: 1e24 },
			{ type: 'storage_cost', multiplier: 0 },
			{ type: 'resource_limit', limitType: 'infinite' }
		]
	},
	{
		id: 'mind_control',
		name: 'Mind Control',
		description: 'Uses mind control to compel customers to buy rubberbands.',
		cost: 1_000_000_000_000_000,
		precondition_research: 'hypnosis',
		effects: [{ type: 'demand_marketing', priceSensitivityMultiplier: 1000000.0, demandMultiplier: 1e30 }]
	},
	{
		id: 'interplanetary_logistics',
		name: 'Interplanetary Logistics',
		description: 'Nano swarms will be able to travel to other planets to gather resources.',
		cost: 100_000_000_000,
		precondition_research: 'molecular_transformation',
		effects: [
			{ type: 'resource_limit', limitType: 'universe' },
			{ type: 'storage_cost', multiplier: 0.0001 },
			{ type: 'demand_marketing', demandMultiplier: 1e12 } // 1 Trillion - Solar System
		]
	},
	{
		id: 'time_travel',
		name: 'Time Travel',
		description: 'Why make it now when you can have already made it?',
		cost: 10_000_000_000_000,
		precondition_research: 'singularity_theory',
		effects: [{ type: 'demand_marketing', demandMultiplier: 1e48 }] // Quindecillion - Timeline Market
	}
];

const machineDefinitions: ProducerFamily[] = [
	{
		id: "bander",
		type: 'machine',
		tiers: [
			{
				name: "Bander",
				production: {
					input: { resource: 'rubber', amount: 100 },
					output: { resource: 'rubberband', amount: 100 }
				},
				initial_cost: 100,
				cost_factor: 1.1,
				precondition_research: 'basic_manufacturing',
				maintenance_cost: 5,
				spaceCost: 10
			},
			{
				name: "MAX-Bander",
				production: {
					input: { resource: 'rubber', amount: 1_000 },
					output: { resource: 'rubberband', amount: 1_000 }
				},
				initial_cost: 750,
				cost_factor: 1.25,
				precondition_research: 'optimize_production',
				maintenance_cost: 20,
				spaceCost: 15
			},
			{
				name: "MEGA-Bander",
				production: {
					input: { resource: 'rubber', amount: 100_000 },
					output: { resource: 'rubberband', amount: 100_000 }
				},
				initial_cost: 50_000,
				cost_factor: 1.5,
				precondition_research: 'robotics',
				maintenance_cost: 100,
				spaceCost: 20
			},
			{
				name: "Quantum Bander",
				production: {
					input: { resource: 'rubber', amount: 1e10 },
					output: { resource: 'rubberband', amount: 1e10 }
				},
				initial_cost: 500_000_000,
				cost_factor: 1.7,
				maintenance_cost: 500_000,
				required_research: 'quantum_mechanics',
				precondition_research: 'quantum_mechanics',
				spaceCost: 50
			},
			{
				name: "Temporal Press",
				production: {
					input: { resource: 'rubber', amount: 1e45 },
					output: { resource: 'rubberband', amount: 1e45 }
				},
				initial_cost: 1e48,
				cost_factor: 2.5,
				maintenance_cost: 10_000_000_000,
				required_research: 'time_travel',
				precondition_research: 'time_travel'
			}
		]
	}
];

const rubberSourceDefinitions: ProducerFamily[] = [
	{
		id: "rubber_sources",
		type: 'rubber_source',
		tiers: [
			{
				name: "Rubbertree Plantation",
				production: {
					output: { resource: 'rubber', amount: 1_000 }
				},
				initial_cost: 10_000,
				cost_factor: 1.2,
				precondition_research: 'optimize_production',
				maintenance_cost: 50,
				spaceCost: 10000
			},
			{
				name: "Synthetic Rubber Mixer",
				production: {
					output: { resource: 'rubber', amount: 100_000 }
				},
				initial_cost: 1_000_000,
				cost_factor: 1.1,
				maintenance_cost: 5_000,
				required_research: 'synthetic_rubber',
				spaceCost: 200
			},
			{
				name: "Black Hole Extruder",
				production: {
					output: { resource: 'rubber', amount: 1e52 }
				},
				initial_cost: 1e55,
				cost_factor: 2.0,
				maintenance_cost: 200_000_000,
				required_research: ['singularity_theory', 'interplanetary_logistics', 'quantum_mechanics'],
				spaceCost: 5000
			}
		]
	}
];

const productionLineDefinitions: ProducerFamily[] = [
	{
		id: "rubber_factory_line",
		type: 'production_line',
		tiers: [
			{
				name: "Synthetic Rubber Mixer Line",
				production: {
					output: { resource: 'producer', familyId: 'rubber_sources', tierIndex: 1, amount: 1 }
				},
				initial_cost: 100_000_000,
				cost_factor: 1.5,
				required_research: ['synthetic_rubber', 'robotics'],
				precondition_research: 'synthetic_rubber',
				spaceCost: 500
			},
			{
				name: "Black Hole Extruder Line",
				production: {
					output: { resource: 'producer', familyId: 'rubber_sources', tierIndex: 2, amount: 1 }
				},
				initial_cost: 100_000_000_000,
				cost_factor: 2.0,
				required_research: 'singularity_theory',
				precondition_research: 'singularity_theory',
				spaceCost: 1000
			}
		]
	},
	{
		id: "bander_line",
		type: 'production_line',
		tiers: [
			{
				name: "MEGA-Bander Line",
				production: {
					output: { resource: 'producer', familyId: 'bander', tierIndex: 2, amount: 1 }
				},
				initial_cost: 100_000_000,
				cost_factor: 1.3,
				required_research: 'robotics',
				precondition_research: 'robotics',
				spaceCost: 500
			},
			{
				name: "Quantum Bander Line",
				production: {
					output: { resource: 'producer', familyId: 'bander', tierIndex: 3, amount: 1 }
				},
				initial_cost: 10_000_000_000,
				cost_factor: 1.7,
				required_research: 'quantum_mechanics',
				precondition_research: 'quantum_mechanics',
				spaceCost: 1000
			},
			{
				name: "Temporal Press Line",
				production: {
					output: { resource: 'producer', familyId: 'bander', tierIndex: 4, amount: 1 }
				},
				initial_cost: 1_000_000_000_000,
				cost_factor: 2.5,
				required_research: 'time_travel',
				precondition_research: 'time_travel',
				spaceCost: 2000
			}
		]
	}
];

export const producerFamilies: ProducerFamily[] = [
	...machineDefinitions,
	...rubberSourceDefinitions,
	...productionLineDefinitions
];

const LEVEL_DIFFICULTY_FACTOR = 1.3;
const RESOURCE_COST_SYNTHETIC_RUBBER = 1.0;

const OIL_RESERVES_LIMIT = 270_300_000_000_000;
const EARTH_RESOURCE_LIMIT = 5.972e27;
const UNIVERSE_RESOURCE_LIMIT = 1e56;

export const GAME_CONSTANTS = {
	INITIAL_MONEY: 3_000,
	INITIAL_RUBBER_PRICE: 0.1,
	INITIAL_RUBBERBAND_PRICE: 1.0,
	INITIAL_MARKETING_LEVEL: 1,
	BUYER_COST: 1_000,
	BUYER_UNLOCK_RESEARCH: 'sales_management',
	MARKETING_BASE_COST: 100,
	PRICE_FLUCTUATION_INTERVAL: 10,
	MIN_RUBBER_PRICE: 0.01,
	MAX_RUBBER_PRICE: 10.0,
	MIN_RUBBERBAND_PRICE: 0.01,
	MARKETING_UNLOCK_RESEARCH: 'basic_marketing',
	LEVEL_DIFFICULTY_FACTOR,
	MAX_RUBBER_NO_PRODUCTION: 1_000,
	INVENTORY_LIMIT_RUBBER: 1_000_000,
	INVENTORY_LIMIT_RUBBERBANDS: 10_000,
	INVENTORY_COST_EXPONENT: 1.5,
	INVENTORY_COST_DIVISOR_RUBBER: 10_000,
	INVENTORY_COST_DIVISOR_RUBBERBANDS: 1_000,
	INTERPLANETARY_LOGISTICS_STORAGE_COST_FACTOR: 0.0001,
	MARKETING_DECAY_INTERVAL: 5,
	EARTH_RESOURCE_LIMIT,
	UNIVERSE_RESOURCE_LIMIT,
	RESOURCE_COST_SYNTHETIC_RUBBER: 1.0,
	RESOURCE_COST_MACHINE: 10,
	RESOURCE_COST_NANO_SWARM: 100,
	OIL_RESERVES_LIMIT,
	LAND_SURFACE_LIMIT: 1.49e14, // m^2 of Earth
	GALAXY_SURFACE_LIMIT: 1e25, // m^2 of Galaxy (approx)
	SPACE_COST_RUBBER: 0.0001, // 1g = 1cm^2
	SPACE_COST_RUBBERBAND: 0.001, // 10x rubber
	SPACE_COST_MACHINE: 4 // Manual Machine (4m^2)
};

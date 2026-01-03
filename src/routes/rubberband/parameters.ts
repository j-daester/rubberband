export interface UpgradeDefinition {
	target: string;
	project_cost: number;
	unit_cost: number;
}

export interface PurchasableItem {
	name: string;
	initial_cost: number;
	cost_factor: number;
	precondition_research?: string;
	description?: string;
	maintenance_cost?: number;
	output?: number;
	required_research?: string | string[];
	allow_manual_purchase?: boolean;
	upgrade_definition?: UpgradeDefinition;
	upgraded_from?: string;
}

export interface MachineType extends PurchasableItem {
	output: number;
	maintenance_cost: number;
}

export interface ProductionLine extends PurchasableItem {
	machine: string;
	output: number;
	product_type?: 'machine' | 'rubber_source';
}

export interface RubberSource extends PurchasableItem {
	output: number;
	maintenance_cost: number;
}

export interface ResearchType {
	id: string;
	name: string;
	description: string;
	cost: number;
	precondition_research?: string;
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

	// Formula: money = a * (r^n - 1) / (r - 1)
	// money * (r - 1) / a = r^n - 1
	// r^n = 1 + money * (r - 1) / a
	// n = log_r(1 + money * (r - 1) / a)
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
		precondition_research: 'basic_manufacturing'
	},
	{
		id: 'optimize_production',
		name: 'Optimize Production',
		description: 'Increases the efficiency of all machines, so less rubber is needed to produce the same amount of rubberbands.',
		cost: 1_000,
		precondition_research: 'basic_manufacturing'
	},
	{
		id: 'sales_management',
		name: 'Sales Management',
		description: 'Unlocks the ability to hire an auto-buyer.',
		cost: 5_000,
		precondition_research: 'basic_marketing'
	},
	{
		id: 'online_marketing',
		name: 'Online Marketing',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 5_000,
		precondition_research: 'basic_marketing'
	},
	{
		id: 'hyperpersonalisation',
		name: 'Hyperpersonalisation',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 50_000,
		precondition_research: 'online_marketing'
	},
	{
		id: 'rubber_recycling',
		name: 'Rubber Recycling',
		description: 'Increases the output of rubber plantations and synthetic rubber factories by factor 2.',
		cost: 100_000,
		precondition_research: 'optimize_production'
	},
	{
		id: 'synthetic_rubber',
		name: 'Synthetic Rubber',
		description: 'Makes synthetic rubber factories available.',
		cost: 2_500_000,
		precondition_research: 'rubber_recycling'
	},
	{
		id: 'automated_ai_marketing',
		name: 'Automated AI-Marketing',
		description: 'Eliminates the marketing decay.',
		cost: 1_000_000,
		precondition_research: 'hyperpersonalisation'
	},
	{
		id: 'robotics',
		name: 'Robotics',
		description: 'Makes machines more efficient and allows for the production of more machines.',
		cost: 5_000_000,
		precondition_research: 'optimize_production'
	},
	{
		id: 'hypnosis',
		name: 'Hypnosis',
		description: 'Uses mass hypnosis to compel customers to buy rubberbands.',
		cost: 1_000_000_000,
		precondition_research: 'automated_ai_marketing'
	},
	{
		id: 'nanotechnology',
		name: 'Nanotechnology',
		description: 'Unlocks the ability to create self-replicating nanobots for manufacturing.',
		cost: 10_000_000_000,
		precondition_research: 'robotics'
	},
	{
		id: 'molecular_transformation',
		name: 'Molecular Transformation',
		description: 'Allows creating synthetic rubber from any earth matter, bypassing oil limits.',
		cost: 5_000_000_000_000,
		precondition_research: 'quantum_mechanics'
	},
	{
		id: 'quantum_mechanics',
		name: 'Quantum Mechanics',
		description: 'Understanding the quantum realm allows for probabilistic manufacturing.',
		cost: 100_000_000_000,
		precondition_research: 'nanotechnology'
	},
	{
		id: 'singularity_theory',
		name: 'Singularity Theory',
		description: 'Harnessing the power of a black hole for material extrusion.',
		cost: 100_000_000_000,
		precondition_research: 'molecular_transformation'
	},
	{
		id: 'mind_control',
		name: 'Mind Control',
		description: 'Uses mind control to compel customers to buy rubberbands.',
		cost: 1_000_000_000_000,
		precondition_research: 'hypnosis'
	},
	{
		id: 'interplanetary_logistics',
		name: 'Interplanetary Logistics',
		description: 'Nano swarms will be able to travel to other planets to gather resources.',
		cost: 100_000_000_000,
		precondition_research: 'molecular_transformation'
	},
	{
		id: 'time_travel',
		name: 'Time Travel',
		description: 'Why make it now when you can have already made it?',
		cost: 10_000_000_000_000,
		precondition_research: 'singularity_theory'
	}
];

export const machineTypes: MachineType[] = [
	{
		name: "Bander",
		output: 100,
		initial_cost: 100,
		cost_factor: 1.1,
		precondition_research: 'basic_manufacturing',
		maintenance_cost: 5,
		upgrade_definition: {
			target: "MAX-Bander",
			project_cost: 5_000,
			unit_cost: 600
		}
	},
	{
		name: "MAX-Bander",
		output: 1_000,
		initial_cost: 750,
		cost_factor: 1.25,
		precondition_research: 'optimize_production',
		maintenance_cost: 20,
		upgraded_from: "Bander",
		upgrade_definition: {
			target: "MEGA-Bander",
			project_cost: 250_000,
			unit_cost: 20_000
		}
	},
	{
		name: "MEGA-Bander",
		output: 100_000,
		initial_cost: 50_000,
		cost_factor: 1.5,
		precondition_research: 'robotics',
		maintenance_cost: 100,
		upgraded_from: "MAX-Bander",
		upgrade_definition: {
			target: "Quantum Bander",
			project_cost: 25_000_000,
			unit_cost: 5_000_000
		}
	},
	{
		name: "Nano-Swarms",
		output: 0,
		initial_cost: 50_000_000,
		cost_factor: 1.6,
		maintenance_cost: 1_000,
		required_research: 'nanotechnology',
		precondition_research: 'nanotechnology',
		allow_manual_purchase: false
	},
	{
		name: "Quantum Bander",
		output: 2_500_000,
		initial_cost: 500_000_000,
		cost_factor: 1.7,
		maintenance_cost: 500_000,
		required_research: 'quantum_mechanics',
		precondition_research: 'quantum_mechanics',
		upgraded_from: "MEGA-Bander",
		upgrade_definition: {
			target: "Temporal Press",
			project_cost: 50_000_000_000,
			unit_cost: 10_000_000_000
		}
	},
	{
		name: "Temporal Press",
		output: 1_000_000_000_000_000,
		initial_cost: 1_000_000_000_000,
		cost_factor: 2.5,
		maintenance_cost: 10_000_000_000,
		required_research: 'time_travel',
		precondition_research: 'time_travel',
		upgraded_from: "Quantum Bander"
	}
];

export const productionLines: ProductionLine[] = [
	{
		name: "Synthetic Rubber Factory Line",
		machine: "Synthetic Rubber Factory",
		output: 1,
		product_type: 'rubber_source',
		initial_cost: 100_000_000,
		cost_factor: 1.5,
		required_research: ['synthetic_rubber', 'robotics'],
		precondition_research: 'synthetic_rubber',
		upgrade_definition: {
			target: "Black Hole Extruder Line",
			project_cost: 50_000_000_000,
			unit_cost: 500_000_000
		}
	},
	{
		name: "Black Hole Extruder Line",
		machine: "Black Hole Extruder",
		output: 1,
		product_type: 'rubber_source',
		initial_cost: 100_000_000_000,
		cost_factor: 2.0,
		required_research: 'singularity_theory',
		precondition_research: 'singularity_theory',
		upgraded_from: 'Synthetic Rubber Factory Line'
	},
	{
		name: "MEGA-Bander Line",
		machine: "MEGA-Bander",
		output: 1,
		initial_cost: 100_000_000,
		cost_factor: 1.3,
		required_research: 'robotics',
		precondition_research: 'robotics',
		upgrade_definition: {
			target: "Quantum Bander Line",
			project_cost: 5_000_000_000,
			unit_cost: 2_000_000_000
		}
	},
	{
		name: "Nanobot Factory",
		machine: "Nano-Swarms",
		output: 1,
		initial_cost: 10_000_000_000,
		cost_factor: 2,
		required_research: 'nanotechnology',
		precondition_research: 'nanotechnology'
	},
	{
		name: "Quantum Bander Line",
		machine: "Quantum Bander",
		output: 1,
		initial_cost: 10_000_000_000,
		cost_factor: 1.7,
		required_research: 'quantum_mechanics',
		precondition_research: 'quantum_mechanics',
		upgraded_from: "MEGA-Bander Line",
		upgrade_definition: {
			target: "Temporal Press Line",
			project_cost: 100_000_000_000,
			unit_cost: 50_000_000_000
		}
	},
	{
		name: "Temporal Press Line",
		machine: "Temporal Press",
		output: 1,
		initial_cost: 1_000_000_000_000,
		cost_factor: 2.5,
		required_research: 'time_travel',
		precondition_research: 'time_travel',
		upgraded_from: "Quantum Bander Line"
	}
];

export const rubberSources: RubberSource[] = [
	{
		name: "Rubbertree Plantation",
		output: 1_000,
		initial_cost: 10_000,
		cost_factor: 1.2,
		precondition_research: 'optimize_production',
		maintenance_cost: 50
	},
	{
		name: "Synthetic Rubber Factory",
		output: 100_000,
		initial_cost: 1_000_000,
		cost_factor: 1.1,
		maintenance_cost: 5_000,
		required_research: 'synthetic_rubber',
		precondition_research: 'synthetic_rubber'
	},
	{
		name: "Black Hole Extruder",
		output: 10_000_000_000_000_000,
		initial_cost: 10_000_000_000_000,
		cost_factor: 2.0,
		maintenance_cost: 200_000_000,
		required_research: 'singularity_theory',
		precondition_research: 'singularity_theory'
	}

];

const LEVEL_DIFFICULTY_FACTOR = 1.3;
const RESOURCE_COST_SYNTHETIC_RUBBER = 0.01;

const OIL_RESERVES_LIMIT = 270_300_000_000_000; // ~1.7 trillion barrels * 159 liters
const EARTH_RESOURCE_LIMIT = 5.972e27; // Earth's mass in kg, accepted precision loss
const UNIVERSE_RESOURCE_LIMIT = 1e56; // Accepted precision loss

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
	RESOURCE_COST_SYNTHETIC_RUBBER,
	RESOURCE_COST_MACHINE: 10,
	RESOURCE_COST_NANO_SWARM: 100,
	OIL_RESERVES_LIMIT
};

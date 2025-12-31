export interface PurchasableItem {
	name: string;
	initial_cost: number;
	cost_factor: number;
	unlock_level: number;
	description?: string;
	maintenance_cost?: number;
	output?: number;
	required_research?: string;
	allow_manual_purchase?: boolean;
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
	unlock_level: number;
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
		id: 'optimize_production',
		name: 'Optimize Production',
		description: 'Increases the efficiency of all machines, so less rubber is needed to produce the same amount of rubberbands.',
		cost: 1000,
		unlock_level: 5
	},
	{
		id: 'online_marketing',
		name: 'Online Marketing',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 5000,
		unlock_level: 10
	},
	{
		id: 'hyperpersonalisation',
		name: 'Hyperpersonalisation',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 50000,
		unlock_level: 15
	},
	{
		id: 'rubber_recycling',
		name: 'Rubber Recycling',
		description: 'Increases the output of rubber plantations and synthetic rubber factories by factor 2.',
		cost: 100000,
		unlock_level: 20
	},
	{
		id: 'synthetic_rubber',
		name: 'Synthetic Rubber',
		description: 'Makes synthetic rubber factories available.',
		cost: 2500000,
		unlock_level: 25
	},
	{
		id: 'automated_ai_marketing',
		name: 'Automated AI-Marketing',
		description: 'Eliminates the marketing decay.',
		cost: 100000,
		unlock_level: 25
	},
	{
		id: 'robotics',
		name: 'Robotics',
		description: 'Makes machines more efficient and allows for the production of more machines.',
		cost: 5000000,
		unlock_level: 30
	},
	{
		id: 'brainwashing',
		name: 'Brainwashing',
		description: 'Uses Brainwashing to compel customers to buy rubberbands.',
		cost: 1000000,
		unlock_level: 45
	},
	{
		id: 'hypnosis',
		name: 'Hypnosis',
		description: 'Uses mass hypnosis to compel customers to buy rubberbands.',
		cost: 1000000000,
		unlock_level: 50
	},
	{
		id: 'mind_control',
		name: 'Mind Control',
		description: 'Uses mind control to compel customers to buy rubberbands.',
		cost: 1000000000000,
		unlock_level: 55
	},
	{
		id: 'nanotechnology',
		name: 'Nanotechnology',
		description: 'Unlocks the ability to create self-replicating nanobots for manufacturing.',
		cost: 10000000000,
		unlock_level: 55
	},
	{
		id: 'quantum_mechanics',
		name: 'Quantum Mechanics',
		description: 'Understanding the quantum realm allows for probabilistic manufacturing.',
		cost: 10000000000,
		unlock_level: 70
	},
	{
		id: 'singularity_theory',
		name: 'Singularity Theory',
		description: 'Harnessing the power of a black hole for material extrusion.',
		cost: 100000000000,
		unlock_level: 80
	},
	{
		id: 'time_travel',
		name: 'Time Travel',
		description: 'Why make it now when you can have already made it?',
		cost: 10000000000000,
		unlock_level: 90
	}
];

export const machineTypes: MachineType[] = [
	{
		name: "Bander",
		output: 100,
		initial_cost: 100,
		cost_factor: 1.1,
		unlock_level: 2,
		maintenance_cost: 5
	},
	{
		name: "MAX-Bander",
		output: 1000,
		initial_cost: 750,
		cost_factor: 1.25,
		unlock_level: 5,
		maintenance_cost: 20
	},
	{
		name: "MEGA-Bander",
		output: 100000,
		initial_cost: 5000,
		cost_factor: 1.5,
		unlock_level: 15,
		maintenance_cost: 100
	},
	{
		name: "Nano-Swarms",
		output: 0,
		initial_cost: 50000000,
		cost_factor: 1.6,
		unlock_level: researchList.find(r => r.id === 'nanotechnology')?.unlock_level ?? 60,
		maintenance_cost: 1000,
		required_research: 'nanotechnology',
		allow_manual_purchase: false
	},
	{
		name: "Quantum Bander",
		output: 2500000,
		initial_cost: 500000000,
		cost_factor: 1.7,
		unlock_level: researchList.find(r => r.id === 'quantum_mechanics')?.unlock_level ?? 70,
		maintenance_cost: 500000,
		required_research: 'quantum_mechanics'
	},
	{
		name: "Temporal Press",
		output: 1000000000000000,
		initial_cost: 1000000000000,
		cost_factor: 2.5,
		unlock_level: researchList.find(r => r.id === 'time_travel')?.unlock_level ?? 90,
		maintenance_cost: 10000000000,
		required_research: 'time_travel',
	}
];

export const productionLines: ProductionLine[] = [
	{
		name: "Synthetic Rubber Factory Line",
		machine: "Synthetic Rubber Factory",
		output: 1,
		product_type: 'rubber_source',
		initial_cost: 100000000,
		cost_factor: 1.5,
		unlock_level: researchList.find(r => r.id === 'synthetic_rubber')?.unlock_level ?? 25,
		required_research: 'synthetic_rubber'
	},
	{
		name: "MEGA-Bander Line",
		machine: "MEGA-Bander",
		output: 1,
		initial_cost: 100000000,
		cost_factor: 1.3,
		unlock_level: researchList.find(r => r.id === 'robotics')?.unlock_level ?? 30,
		required_research: 'robotics'
	},
	{
		name: "Nanobot Factory",
		machine: "Nano-Swarms",
		output: 1,
		initial_cost: 1000000000,
		cost_factor: 2,
		unlock_level: researchList.find(r => r.id === 'nanotechnology')?.unlock_level ?? 60,
		required_research: 'nanotechnology'
	},
	{
		name: "Quantum Bander Line",
		machine: "Quantum Bander",
		output: 1,
		initial_cost: 10000000000,
		cost_factor: 1.7,
		unlock_level: researchList.find(r => r.id === 'quantum_mechanics')?.unlock_level ?? 70,
		required_research: 'quantum_mechanics'
	},
];

export const rubberSources: RubberSource[] = [
	{
		name: "Rubbertree Plantation",
		output: 1000,
		initial_cost: 10000,
		cost_factor: 1.2,
		unlock_level: 5,
		maintenance_cost: 50
	},
	{
		name: "Synthetic Rubber Factory",
		output: 100000,
		initial_cost: 1000000,
		cost_factor: 1.1,
		unlock_level: researchList.find(r => r.id === 'synthetic_rubber')?.unlock_level ?? 25,
		maintenance_cost: 5000,
		required_research: 'synthetic_rubber'
	},
	{
		name: "Black Hole Extruder",
		output: 10000000000,
		initial_cost: 1000000000000,
		cost_factor: 2.0,
		unlock_level: researchList.find(r => r.id === 'singularity_theory')?.unlock_level ?? 80,
		maintenance_cost: 200000000,
		required_research: 'singularity_theory'
	}

];

export const GAME_CONSTANTS = {
	INITIAL_MONEY: 3000,
	INITIAL_RUBBER_PRICE: 0.1,
	INITIAL_RUBBERBAND_PRICE: 1.0,
	INITIAL_MARKETING_LEVEL: 1,
	BUYER_COST: 1000,
	BUYER_UNLOCK_LEVEL: 7,
	MARKETING_BASE_COST: 100,
	PRICE_FLUCTUATION_INTERVAL: 10,
	MIN_RUBBER_PRICE: 0.01,
	MAX_RUBBER_PRICE: 10.0,
	MIN_RUBBERBAND_PRICE: 0.01,
	MACHINES_UNLOCK_LEVEL: 2,
	MARKETING_UNLOCK_LEVEL: 3,
	LEVEL_DIFFICULTY_FACTOR: 1.5,
	LEVEL_REQ_BASE: 100,
	LEVEL_REQ_OFFSET: 80,
	MAX_RUBBER_NO_PRODUCTION: 1000,
	INVENTORY_LIMIT_RUBBER: 1000000,
	INVENTORY_LIMIT_RUBBERBANDS: 10000,
	INVENTORY_COST_EXPONENT: 1.5,
	INVENTORY_COST_DIVISOR_RUBBER: 10000,
	INVENTORY_COST_DIVISOR_RUBBERBANDS: 1000,
	MARKETING_DECAY_INTERVAL: 10
};

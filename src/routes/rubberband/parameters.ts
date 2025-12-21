export interface PurchasableItem {
	name: string;
	initial_cost: number;
	cost_factor: number;
	unlock_level: number;
	description?: string;
	maintenance_cost?: number;
	output?: number;
	required_research?: string;
}

export interface MachineType extends PurchasableItem {
	output: number;
	maintenance_cost: number;
}

export interface ProductionLine extends PurchasableItem {
	machine: string;
	output: number;
	product_type?: 'machine' | 'plantation';
}

export interface PlantationType extends PurchasableItem {
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
		id: 'robotics',
		name: 'Robotics',
		description: 'Makes machines more efficient.',
		cost: 5000000,
		unlock_level: 30
	},
	{
		id: 'online_marketing',
		name: 'Online Marketing',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 5000,
		unlock_level: 15
	},
	{
		id: 'hyperpersonalisation',
		name: 'Hyperpersonalisation',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 50000,
		unlock_level: 15
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
];

export const productionLines: ProductionLine[] = [
	{
		name: "Bander Line",
		machine: "Bander",
		output: 1,
		initial_cost: 1000000,
		cost_factor: 1.5,
		unlock_level: 15
	},
	{
		name: "MAX-Bander Line",
		machine: "MAX-Bander",
		output: 1,
		initial_cost: 10000000,
		cost_factor: 1.5,
		unlock_level: 30
	},
	{
		name: "MEGA-Bander Line",
		machine: "MEGA-Bander",
		output: 1,
		initial_cost: 100000000,
		cost_factor: 1.5,
		unlock_level: 50
	},
	{
		name: "Synthetic Rubber Factory Line",
		machine: "Synthetic Rubber Factory",
		output: 1,
		product_type: 'plantation',
		initial_cost: 100000000,
		cost_factor: 1.5,
		unlock_level: 30
	}
];

export const plantationTypes: PlantationType[] = [
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
	}
];

export const GAME_CONSTANTS = {
	INITIAL_MONEY: 3000,
	INITIAL_RUBBER_PRICE: 0.1,
	INITIAL_RUBBERBAND_PRICE: 1.0,
	INITIAL_MARKETING_LEVEL: 1,
	BUYER_COST: 1000,
	BUYER_UNLOCK_LEVEL: 7,
	MARKETING_BASE_COST: 300,
	PRICE_FLUCTUATION_INTERVAL: 10,
	MIN_RUBBER_PRICE: 0.01,
	MAX_RUBBER_PRICE: 10.0,
	MIN_RUBBERBAND_PRICE: 0.01,
	MACHINES_UNLOCK_LEVEL: 2,
	MARKETING_UNLOCK_LEVEL: 3,
	LEVEL_DIFFICULTY_FACTOR: 1.25,
	LEVEL_REQ_BASE: 100,
	LEVEL_REQ_OFFSET: 80,
	MAX_RUBBER_NO_PRODUCTION: 1000,
};

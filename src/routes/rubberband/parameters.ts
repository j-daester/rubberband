export interface MachineType {
	name: string;
	output: number;
	initial_cost: number;
	cost_factor: number;
	unlock_level: number;
	maintenance_cost: number;
}

export interface ResearchType {
	id: string;
	name: string;
	description: string;
	cost: number;
	unlock_level: number;
}

export const researchList: ResearchType[] = [
	{
		id: 'hyperpersonalisation',
		name: 'Hyperpersonalisation',
		description: 'Increases the effectivity of marketing significantly.',
		cost: 5000,
		unlock_level: 5
	},
	{
		id: 'rubber_recycling',
		name: 'Rubber Recycling',
		description: 'Increases the output of rubber plantations and synthetic rubber factories by factor 2.',
		cost: 10000,
		unlock_level: 10
	},
	{
		id: 'synthetic_rubber',
		name: 'Synthetic Rubber',
		description: 'Makes synthetic rubber factories available.',
		cost: 25000,
		unlock_level: 25
	},
	{
		id: 'robotics',
		name: 'Robotics',
		description: 'Makes machines more efficient.',
		cost: 25000,
		unlock_level: 30
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
		cost_factor: 1.2,
		unlock_level: 5,
		maintenance_cost: 20
	},
	{
		name: "MEGA-Bander",
		output: 100000,
		initial_cost: 5000,
		cost_factor: 1.3,
		unlock_level: 15,
		maintenance_cost: 100
	},
];

export const GAME_CONSTANTS = {
	INITIAL_MONEY: 100,
	INITIAL_RUBBER_PRICE: 0.1,
	INITIAL_RUBBERBAND_PRICE: 1.0,
	INITIAL_MARKETING_LEVEL: 1,
	BUYER_COST: 1000,
	BUYER_UNLOCK_LEVEL: 7,
	MARKETING_BASE_COST: 700,
	PRICE_FLUCTUATION_INTERVAL: 10,
	MIN_RUBBER_PRICE: 0.01,
	MAX_RUBBER_PRICE: 10.0,
	MIN_RUBBERBAND_PRICE: 0.01,
	MACHINES_UNLOCK_LEVEL: 2,
	MARKETING_UNLOCK_LEVEL: 5,
	LEVEL_DIFFICULTY_FACTOR: 1.25,
	LEVEL_REQ_BASE: 100,
	LEVEL_REQ_OFFSET: 80,
	MAX_RUBBER_NO_PRODUCTION: 1000,
};

export interface ProductionLine {
	name: string;
	machine: string;
	output: number;
	initial_cost: number;
	cost_factor: number;
	unlock_level: number;
}

export const productionLines: ProductionLine[] = [
	{
		name: "Bander Line",
		machine: "Bander",
		output: 100,
		initial_cost: 1000000,
		cost_factor: 1.5,
		unlock_level: 15
	},
	{
		name: "MAX-Bander Line",
		machine: "MAX-Bander",
		output: 1000,
		initial_cost: 10000000,
		cost_factor: 1.5,
		unlock_level: 30
	},
	{
		name: "MEGA-Bander Line",
		machine: "MEGA-Bander",
		output: 100000,
		initial_cost: 100000000,
		cost_factor: 1.5,
		unlock_level: 50
	}
];

export interface PlantationType {
	name: string;
	output: number;
	initial_cost: number;
	cost_factor: number;
	unlock_level: number;
	maintenance_cost: number;
	required_research?: string;
}

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
		name: "Syntetic Rubber Factory",
		output: 100000,
		initial_cost: 1000000,
		cost_factor: 1.1,
		unlock_level: researchList.find(r => r.id === 'synthetic_rubber')?.unlock_level ?? 25,
		maintenance_cost: 5000,
		required_research: 'synthetic_rubber'
	}
];

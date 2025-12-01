export const levels = [
	{
		level: 1,
		requirements: {
			rubberbands_sold: 100
		}
	},
	{
		level: 2,
		requirements: {
			rubberbands_sold: 200
		}
	},
]

export const machine_types = [
	{
		name: "Bander 100",
		output: 100,
		initial_cost: 100,
		cost_factor: 1.1,
		unlock_level: 2
	},
	{
		name: "MAX-Bander 1000",
		output: 1000,
		initial_cost: 1000,
		cost_factor: 1.2,
		unlock_level: 5
	},
	{
		name: "MEGA-Bander 10000",
		output: 10000,
		initial_cost: 10000,
		cost_factor: 1.3,
		unlock_level: 7
	},
];

export const GAME_CONSTANTS = {
	INITIAL_MONEY: 100,
	INITIAL_RUBBER_PRICE: 0.1,
	INITIAL_RUBBERBAND_PRICE: 1.0,
	INITIAL_MARKETING_LEVEL: 1,
	BUYER_COST: 1000,
	BUYER_UNLOCK_LEVEL: 10,
	MARKETING_BASE_COST: 1000,
	PRICE_FLUCTUATION_INTERVAL: 10,
	MIN_RUBBER_PRICE: 0.01,
	MAX_RUBBER_PRICE: 10.0,
	MIN_RUBBERBAND_PRICE: 0.01,
	MACHINES_UNLOCK_LEVEL: 2,
	MARKETING_UNLOCK_LEVEL: 5,
};

export const production_lines = [
	{
		name: "Bander 100 Line",
		machine: "Bander 100",
		output: 1,
		initial_cost: 1000000,
		cost_factor: 1.5,
		unlock_level: 15
	},
	{
		name: "MAX-Bander 1000 Line",
		machine: "MAX-Bander 1000",
		output: 1,
		initial_cost: 10000000,
		cost_factor: 1.5,
		unlock_level: 40
	},
	{
		name: "MEGA-Bander 10000 Line",
		machine: "MEGA-Bander 10000",
		output: 1,
		initial_cost: 100000000,
		cost_factor: 1.5,
		unlock_level: 100
	}
];

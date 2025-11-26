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
		output: 1,
		initial_cost: 100,
		cost_factor: 1.1
	},
	{
		name: "MAX-Bander 1000",
		output: 100,
		initial_cost: 1000,
		cost_factor: 1.2
	},
];

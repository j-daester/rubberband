import { machine_types } from './parameters';

export class Game {
	money: number;
	rubberbands: number;
	rubber: number;
	machines: Record<string, number>;
	totalRubberbandsSold: number;
	buyerHired: boolean;
	buyerThreshold: number;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 */
	constructor(serialized: string | undefined = undefined) {
		if (serialized) {
			const [money, rubberbands, totalSold, ...machineCounts] = serialized.split('-');

			this.money = +money;
			this.rubberbands = +rubberbands;
			this.totalRubberbandsSold = +totalSold || 0; // Handle old saves where this might be a machine count or undefined

			// If it's an old save, the split might be different. 
			// Old format: money-rubberbands-m1-m2...
			// New format: money-rubberbands-totalSold-m1-m2...
			// We need to be careful. 
			// Let's actually append it at the END to be safer for backward compat if we cared strictly, 
			// but since I'm rewriting the parsing logic, let's stick to the plan but be robust.
			// Actually, if I change the order, I break old saves if I don't detect version. 
			// Let's assume for this task we can just try to parse. 
			// If machineCounts is empty, it might be an old save where we consumed machine counts as totalSold.
			// Let's use a safer parsing strategy or just append to end.
			// Appending to end is safer: money-rubberbands-m1-m2...-totalSold

			// Re-evaluating strategy:
			// The current split is `serialized.split('-')`.
			// Old: [money, rubberbands, ...machines]
			// If I add totalSold at the end: [money, rubberbands, ...machines, totalSold]
			// But machines is variable length? No, `machine_types` is fixed.
			// So we know how many machines there are.
		}

		// Let's restart the constructor logic to be robust.
		if (serialized) {
			const parts = serialized.split('-');
			this.money = +parts[0];
			this.rubberbands = +parts[1];

			// Check if we have the new field. 
			// Old length = 2 + machine_types.length
			// New length = 3 + machine_types.length

			if (parts.length > 2 + machine_types.length) {
				this.totalRubberbandsSold = +parts[2];
				const machineCounts = parts.slice(3, 3 + machine_types.length);
				this.machines = {};
				machine_types.forEach((machine, index) => {
					this.machines[machine.name] = +machineCounts[index] || 0;
				});

				// Check for buyer data (new format extension)
				if (parts.length > 3 + machine_types.length) {
					this.buyerHired = parts[3 + machine_types.length] === '1';
					this.buyerThreshold = +parts[4 + machine_types.length] || 0;
				} else {
					this.buyerHired = false;
					this.buyerThreshold = 0;
				}
			} else {
				// Old save
				this.totalRubberbandsSold = 0;
				const machineCounts = parts.slice(2);
				this.machines = {};
				machine_types.forEach((machine, index) => {
					this.machines[machine.name] = +machineCounts[index] || 0;
				});
				this.buyerHired = false;
				this.buyerThreshold = 0;
			}
			this.rubber = 0;
		} else {
			this.money = 100;
			this.rubberbands = 0;
			this.rubber = 0;
			this.totalRubberbandsSold = 0;
			this.machines = {};

			for (const machine of machine_types) {
				this.machines[machine.name] = 0;
			}
			this.buyerHired = false;
			this.buyerThreshold = 0;
		}
	}

	get productionRate() {
		let rate = 0;
		for (const machine of machine_types) {
			rate += (this.machines[machine.name] || 0) * machine.output;
		}
		return rate;
	}

	get level() {
		return 1 + Math.floor(Math.sqrt(this.totalRubberbandsSold / 100));
	}

	tick() {
		const production = this.productionRate;
		if (this.rubber >= production) {
			this.rubber -= production;
			this.rubberbands += production;
		} else {
			// Produce as much as we can with remaining rubber
			this.rubberbands += this.rubber;
			this.rubber = 0;
		}

		if (this.buyerHired && this.rubber < this.buyerThreshold) {
			this.buyRubber(this.buyerThreshold, 10);
		}
	}

	makeRubberband(amount: number = 1) {
		if (this.rubber >= amount) {
			this.rubber -= amount;
			this.rubberbands += amount;
		}
	}

	buyRubber(amount: number, cost: number) {
		if (this.money >= cost) {
			this.money -= cost;
			this.rubber += amount;
			return true;
		}
		return false;
	}

	getMachineCost(machineName: string, amount: number) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return Infinity;

		const count = this.machines[machineName] || 0;
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		if (r === 1) {
			return a * amount;
		}

		return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
	}

	getMaxAffordable(machineName: string) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return 0;

		const count = this.machines[machineName] || 0;
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		if (this.money < a) return 0;

		if (r === 1) {
			return Math.floor(this.money / a);
		}

		const n = Math.floor(Math.log(1 + this.money * (r - 1) / a) / Math.log(r));
		return n;
	}

	buyMachine(machineName: string, amount: number = 1) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return false;

		const cost = this.getMachineCost(machineName, amount);

		if (this.money >= cost) {
			this.money -= cost;
			this.machines[machineName] = (this.machines[machineName] || 0) + amount;
			return true;
		}

		return false;
	}

	sellRubberbands(amount: number) {
		if (this.rubberbands >= amount) {
			this.rubberbands -= amount;
			this.money += amount * 1; // Assuming 1$ per rubberband for now
			this.totalRubberbandsSold += amount;
			return true;
		}
		return false;
	}

	hireBuyer() {
		if (this.level >= 10 && !this.buyerHired && this.money >= 1000) {
			this.money -= 1000;
			this.buyerHired = true;
			return true;
		}
		return false;
	}

	setBuyerThreshold(amount: number) {
		this.buyerThreshold = amount;
	}

	/**
	 * Serialize game state so it can be set as a cookie
	 */
	toString() {
		const machineCounts = machine_types.map(m => this.machines[m.name] || 0);
		// New format: money-rubberbands-totalSold-m1-m2...-buyerHired-buyerThreshold
		return `${this.money}-${this.rubberbands}-${this.totalRubberbandsSold}-${machineCounts.join('-')}-${this.buyerHired ? 1 : 0}-${this.buyerThreshold}`;
	}
}

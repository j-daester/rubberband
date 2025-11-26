import { machine_types } from './parameters';

export class Game {
	money: number;
	rubberbands: number;
	machines: Record<string, number>;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 */
	constructor(serialized: string | undefined = undefined) {
		if (serialized) {
			const [money, rubberbands, ...machineCounts] = serialized.split('-');

			this.money = +money;
			this.rubberbands = +rubberbands;
			this.machines = {};

			machine_types.forEach((machine, index) => {
				this.machines[machine.name] = +machineCounts[index] || 0;
			});
		} else {
			this.money = 0;
			this.rubberbands = 0;
			this.machines = {};

			for (const machine of machine_types) {
				this.machines[machine.name] = 0;
			}
		}
	}

	get productionRate() {
		let rate = 0;
		for (const machine of machine_types) {
			rate += (this.machines[machine.name] || 0) * machine.output;
		}
		return rate;
	}

	tick() {
		this.rubberbands += this.productionRate;
	}

	buyMachine(machineName: string) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return false;

		const count = this.machines[machineName] || 0;
		const cost = Math.floor(machine.initial_cost * Math.pow(machine.cost_factor, count));

		if (this.money >= cost) {
			this.money -= cost;
			this.machines[machineName] = count + 1;
			return true;
		}

		return false;
	}

	sellRubberbands(amount: number) {
		if (this.rubberbands >= amount) {
			this.rubberbands -= amount;
			this.money += amount * 1; // Assuming 1$ per rubberband for now
			return true;
		}
		return false;
	}

	/**
	 * Serialize game state so it can be set as a cookie
	 */
	toString() {
		const machineCounts = machine_types.map(m => this.machines[m.name] || 0);
		return `${this.money}-${this.rubberbands}-${machineCounts.join('-')}`;
	}
}

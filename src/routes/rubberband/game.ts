import { machine_types } from './parameters';

export class Game {
	money: number;
	rubberbands: number;
	rubber: number;
	machines: Record<string, number>;
	totalRubberbandsSold: number;
	buyerHired: boolean;
	buyerThreshold: number;
	rubberPrice: number;
	rubberbandPrice: number;
	tickCount: number;
	marketingLevel: number;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 */
	constructor(serialized: string | undefined = undefined) {
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

				// Check for price data
				if (parts.length > 5 + machine_types.length) {
					this.rubberPrice = +parts[5 + machine_types.length] || 0.1;
				} else {
					this.rubberPrice = 0.1;
				}

				// Check for marketing data
				if (parts.length > 6 + machine_types.length) {
					this.marketingLevel = +parts[6 + machine_types.length] || 1;
				} else {
					this.marketingLevel = 1;
				}

				// Check for rubberband price data
				if (parts.length > 7 + machine_types.length) {
					this.rubberbandPrice = +parts[7 + machine_types.length] || 1.0;
				} else {
					this.rubberbandPrice = 1.0;
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
				this.rubberPrice = 0.1;
				this.marketingLevel = 1;
				this.rubberbandPrice = 1.0;
			}
			this.rubber = 0;
			this.tickCount = 0;
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
			this.rubberPrice = 0.1;
			this.rubberbandPrice = 1.0;
			this.marketingLevel = 1;
			this.tickCount = 0;
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

	get demand() {
		return Math.floor(Math.pow(3, this.marketingLevel) / this.rubberbandPrice * 10);
	}

	get marketingCost() {
		return 100 * Math.pow(2, this.marketingLevel);
	}

	tick() {
		this.tickCount++;
		if (this.tickCount % 10 === 0) {
			// Fluctuate price +/- 5%
			this.rubberPrice *= 0.95 + Math.random() * 0.1;
			// Clamp price
			if (this.rubberPrice < 0.01) this.rubberPrice = 0.01;
			if (this.rubberPrice > 10.0) this.rubberPrice = 10.0;
		}

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
			this.buyRubber(this.buyerThreshold);
		}

		// Auto sell based on demand
		const sellAmount = Math.min(this.rubberbands, this.demand);
		if (sellAmount > 0) {
			this.sellRubberbands(sellAmount);
		}
	}

	makeRubberband(amount: number = 1) {
		if (this.rubber >= amount) {
			this.rubber -= amount;
			this.rubberbands += amount;
		}
	}

	buyRubber(amount: number) {
		const cost = amount * this.rubberPrice;
		if (this.money >= cost) {
			this.money -= cost;
			this.rubber += amount;
			return true;
		}
		return false;
	}

	getMachineCost(machineName: string, amount: number, currentCount?: number) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return Infinity;

		const count = currentCount !== undefined ? currentCount : (this.machines[machineName] || 0);
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		if (r === 1) {
			return a * amount;
		}

		return Math.floor(a * (Math.pow(r, amount) - 1) / (r - 1));
	}

	getMaxAffordable(machineName: string, currentMoney?: number, currentCount?: number) {
		const machine = machine_types.find(m => m.name === machineName);
		if (!machine) return 0;

		const count = currentCount !== undefined ? currentCount : (this.machines[machineName] || 0);
		const r = machine.cost_factor;
		const a = Math.floor(machine.initial_cost * Math.pow(r, count));

		const money = currentMoney !== undefined ? currentMoney : this.money;

		if (money < a) return 0;

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
			this.money += amount * this.rubberbandPrice;
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

	buyMarketing() {
		const cost = this.marketingCost;
		if (this.money >= cost) {
			this.money -= cost;
			this.marketingLevel++;
			return true;
		}
		return false;
	}

	setRubberbandPrice(price: number) {
		this.rubberbandPrice = price;
		if (this.rubberbandPrice < 0.01) this.rubberbandPrice = 0.01;
	}

	/**
	 * Serialize game state so it can be set as a cookie
	 */
	toString() {
		const machineCounts = machine_types.map(m => this.machines[m.name] || 0);
		// New format: money-rubberbands-totalSold-m1-m2...-buyerHired-buyerThreshold-rubberPrice-marketingLevel-rubberbandPrice
		return `${this.money}-${this.rubberbands}-${this.totalRubberbandsSold}-${machineCounts.join('-')}-${this.buyerHired ? 1 : 0}-${this.buyerThreshold}-${this.rubberPrice}-${this.marketingLevel}-${this.rubberbandPrice}`;
	}
}

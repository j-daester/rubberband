<script lang="ts">
	import type { Game, NanoAllocation } from '../game';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	const dispatch = createEventDispatcher();

	// Local allocation state (0-100 integers for UI)
	let allocRubber = 33;
	let allocBander = 33;
	let allocNano = 34;

	// Init from game state once
	let initialized = false;

	// Reactive trigger
	$: {
		tick;
		game = game;
		if (game && !initialized) {
			allocRubber = Math.round(game.nanoAllocation.rubber_machines * 100);
			allocBander = Math.round(game.nanoAllocation.bander_machines * 100);
			allocNano = Math.round(game.nanoAllocation.nanobots * 100);
			// Ensure sum is exactly 100 on init due to rounding
			const sum = allocRubber + allocBander + allocNano;
			if (sum !== 100) {
				allocNano += 100 - sum;
			}
			initialized = true;
		}
	}

	function buyFactory() {
		if (game.buyNanobotFactory()) {
			dispatch('action');
		}
	}

	function updateAllocation(param: 'rubber' | 'bander' | 'nano', value: number) {
		value = Math.max(0, Math.min(100, Math.round(value))); // Clamp

		// Smart redistribution
		// We have 3 buckets. Target is changing to 'value'.
		// The other two must sum to (100 - value).
		// We try to preserve their relative proportions.

		let remainder = 100 - value;

		if (param === 'rubber') {
			allocRubber = value;
			const currentOthersSum = allocBander + allocNano;
			if (currentOthersSum === 0) {
				// If others are 0, split remainder equally? or give to one?
				// Let's split equally for fairness if they were both zeroed out.
				allocBander = Math.floor(remainder / 2);
				allocNano = remainder - allocBander;
			} else {
				// Scale relative to each other
				const ratioBander = allocBander / currentOthersSum;
				allocBander = Math.floor(remainder * ratioBander);
				allocNano = remainder - allocBander; // Assign rest to last to ensure sum=100
			}
		} else if (param === 'bander') {
			allocBander = value;
			const currentOthersSum = allocRubber + allocNano;
			if (currentOthersSum === 0) {
				allocRubber = Math.floor(remainder / 2);
				allocNano = remainder - allocRubber;
			} else {
				const ratioRubber = allocRubber / currentOthersSum;
				allocRubber = Math.floor(remainder * ratioRubber);
				allocNano = remainder - allocRubber;
			}
		} else if (param === 'nano') {
			allocNano = value;
			const currentOthersSum = allocRubber + allocBander;
			if (currentOthersSum === 0) {
				allocRubber = Math.floor(remainder / 2);
				allocBander = remainder - allocRubber;
			} else {
				const ratioRubber = allocRubber / currentOthersSum;
				allocRubber = Math.floor(remainder * ratioRubber);
				allocBander = remainder - allocRubber;
			}
		}

		// Apply to Game
		const newAlloc: NanoAllocation = {
			rubber_machines: allocRubber / 100,
			bander_machines: allocBander / 100,
			nanobots: allocNano / 100
		};
		game.setNanoAllocation(newAlloc);
	}

	$: isVisible = game.researched.includes('nanotechnology');

	$: nanoSwarmsCount = game.nanoSwarmCount;

	$: nanoFactoryCount = game.nanobotFactoryCount;
	$: nanoFactoryCost = game.nanobotFactoryCost;

	// Calculate Current Effects for Display
	// Bonus: +0.1 per swarm * alloc
	$: boostRubber = Math.floor(nanoSwarmsCount * 0.1 * (allocRubber / 100));
	$: boostBander = Math.floor(nanoSwarmsCount * 0.1 * (allocBander / 100));
	$: boostNano = Math.floor(nanoSwarmsCount * 0.1 * (allocNano / 100));

	$: nanobotProduction = game.getNanobotProduction();

	// Reactive translations helper
	$: tr = (key: string, search: string, replace: string) => {
		const val = $t(key);
		return (typeof val === 'string' ? val : '').replace(search, replace);
	};
</script>

{#if isVisible}
	<section class="nano-factory">
		<h2>Nano Factory</h2>

		<div class="stats-panel">
			<div class="stat">
				<span class="label">Active Swarms</span>
				<span class="value">{formatNumber(nanoSwarmsCount, suffixes)}</span>
			</div>
		</div>

		<!-- Allocation Sliders -->
		<div class="allocation-panel">
			<h3>Swarm Allocation</h3>

			<div class="slider-row">
				<div class="slider-label">
					<span>Synthetic Rubber</span>
					<span class="boost-text">+{formatNumber(boostRubber, suffixes)} per tick</span>
				</div>
				<div class="slider-controls">
					<input
						type="range"
						min="0"
						max="100"
						value={allocRubber}
						on:input={(e) => updateAllocation('rubber', +e.currentTarget.value)}
					/>
					<span class="perc-value">{allocRubber}%</span>
				</div>
			</div>

			<div class="slider-row">
				<div class="slider-label">
					<span>Rubber Banders</span>
					<span class="boost-text">+{formatNumber(boostBander, suffixes)} per tick</span>
				</div>
				<div class="slider-controls">
					<input
						type="range"
						min="0"
						max="100"
						value={allocBander}
						on:input={(e) => updateAllocation('bander', +e.currentTarget.value)}
					/>
					<span class="perc-value">{allocBander}%</span>
				</div>
			</div>

			<div class="slider-row">
				<div class="slider-label">
					<span>Nanobot Production</span>
					<span class="boost-text">+{formatNumber(boostNano, suffixes)} per tick</span>
				</div>
				<div class="slider-controls">
					<input
						type="range"
						min="0"
						max="100"
						value={allocNano}
						on:input={(e) => updateAllocation('nano', +e.currentTarget.value)}
					/>
					<span class="perc-value">{allocNano}%</span>
				</div>
			</div>
		</div>

		<div class="machine-list">
			<div class="industry-card">
				<div class="info">
					<h3>{$t('production_lines.Nanobot Factory')}</h3>
					<p>{tr('heavy_industry_ui.auto_produces', '{machine}', 'Nano-Swarms')}</p>
					<p class="details">
						{$t('common.production')}: {formatNumber(nanobotProduction, suffixes)}/⏱️
					</p>
					<p class="owned">{$t('common.owned')}: {formatNumber(nanoFactoryCount, suffixes)}</p>
				</div>
				<div class="actions">
					<button class="buy-btn" disabled={game.money < nanoFactoryCost} on:click={buyFactory}>
						<span class="action-text">{$t('common.buy')}</span>
						<span class="price-text">{formatMoney(nanoFactoryCost, suffixes)}</span>
					</button>
				</div>
			</div>
		</div>
	</section>
{/if}

<style>
	section {
		margin-bottom: 2rem;
		background: radial-gradient(circle at top right, #1a2a3a 0%, #111 60%);
		padding: 1.5rem;
		border-radius: 12px;
		border: 1px solid #3a4a5a;
	}

	h2 {
		color: #00f2fe;
		text-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
	}

	h3 {
		color: #eee;
		margin-top: 0;
	}

	.stats-panel {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 8px;
	}

	.allocation-panel {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		border: 1px solid #3a4a5a;
	}

	.slider-row {
		margin-bottom: 1rem;
	}

	.slider-label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.25rem;
		color: #ccc;
		font-size: 0.9rem;
	}

	.boost-text {
		color: #00f2fe;
		font-weight: bold;
	}

	.slider-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	input[type='range'] {
		flex: 1;
		cursor: pointer;
		accent-color: #00f2fe;
	}

	.perc-value {
		width: 3rem;
		text-align: right;
		font-weight: bold;
		color: #fff;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.label {
		font-size: 0.8rem;
		color: #8899aa;
		text-transform: uppercase;
	}

	.value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #fff;
	}

	.machine-list {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.industry-card {
		background: #252525;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: row; /* Horizontal layout */
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.info {
		flex: 1;
	}

	.info h3 {
		margin: 0 0 0.5rem 0;
		font-size: var(--font-size-xl); /* Larger title */
		color: var(--color-text-primary);
	}

	.info p {
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
		margin: 0 0 0.5rem 0;
	}

	.details {
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
		margin: 0;
	}

	.owned {
		color: var(--color-text-highlight);
		font-weight: var(--font-weight-bold);
		margin: 0.5rem 0 0 0;
		font-size: var(--font-size-lg);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		min-width: 200px;
	}

	.buy-btn {
		padding: 1rem 2rem; /* Larger button */
		border: none;
		border-radius: 6px;
		background: #444;
		color: #fff;
		cursor: pointer;
		transition: background 0.2s;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.action-text {
		font-weight: bold;
		font-size: 1.1rem;
	}

	.price-text {
		font-weight: normal;
		font-size: 1rem;
	}

	.buy-btn:hover:not(:disabled) {
		background: #555;
	}

	.buy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #333;
		color: #666;
	}
</style>

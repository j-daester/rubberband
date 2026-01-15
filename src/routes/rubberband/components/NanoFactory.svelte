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
		if (game && !initialized && game.nanoAllocation) {
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
				allocBander = Math.floor(remainder / 2);
				allocNano = remainder - allocBander;
			} else {
				const ratioBander = allocBander / currentOthersSum;
				allocBander = Math.floor(remainder * ratioBander);
				allocNano = remainder - allocBander;
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
				allocBander = remainder - allocRubber;
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

	$: nanobotProduction = game.getNanobotProduction ? game.getNanobotProduction() : 1;

	// Helper for boosts list - prioritized producers
	$: activeBoosts = [
		// Rubber Pool
		{ name: 'Black Hole Extruder', id: 'rubber_sources', idx: 2 },
		{ name: 'Black Hole Extruder Line', id: 'rubber_factory_line', idx: 1 },
		{ name: 'Synthetic Rubber Mixer', id: 'rubber_sources', idx: 1 },
		{ name: 'Synthetic Rubber Mixer Line', id: 'rubber_factory_line', idx: 0 },

		// Bander Pool
		{ name: 'Temporal Press', id: 'bander', idx: 4 },
		{ name: 'Temporal Press Line', id: 'bander_line', idx: 2 },
		{ name: 'Quantum Bander', id: 'bander', idx: 3 },
		{ name: 'Quantum Bander Line', id: 'bander_line', idx: 1 },
		{ name: 'MEGA-Bander', id: 'bander', idx: 2 },
		{ name: 'MEGA-Bander Line', id: 'bander_line', idx: 0 },
		{ name: 'MAX-Bander', id: 'bander', idx: 1 },
		{ name: 'Bander', id: 'bander', idx: 0 },

		// Nano Pool (Conceptually)
		{
			name: 'Nanobot Production',
			id: 'NANOBOT_SPECIAL',
			idx: 0,
			overrideValue:
				nanobotProduction > 1 ? Math.floor((nanoSwarmsCount * (allocNano / 100)) / 10) : 0
		}
	]
		.map((item) => {
			if (item.id === 'NANOBOT_SPECIAL') {
				return { ...item, boost: item.overrideValue || 0 };
			}
			return {
				...item,
				boost: (game.getNanoBoost && game.getNanoBoost(item.id, item.idx)) || 0
			};
		})
		.filter((b) => b.boost > 0);

	$: tr = (key: string, search: string, replace: string) => {
		const val = $t(key);
		return (typeof val === 'string' ? val : '').replace(search, replace);
	};
</script>

{#if isVisible}
	<section class="nano-factory">
		<div class="stats-panel">
			<div class="stat">
				<span class="label">Active Swarms</span>
				<span class="value">{formatNumber(nanoSwarmsCount, suffixes)}</span>
			</div>
		</div>

		<!-- Allocation Sliders -->
		<div class="allocation-panel">
			<div class="flex justify-between items-center mb-2">
				<h3>Swarm Allocation</h3>
				<span class="text-xs text-gray-400">Determines pool size</span>
			</div>

			<div class="slider-row">
				<div class="slider-label">
					<span>Synthetic Rubber</span>
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

		<div class="explanation-panel">
			<h3>Swarm Intelligence</h3>
			<p>Nano swarms within each category will automatically boost highest-tier machines first.</p>
		</div>

		<div class="boosts-panel">
			<h3>Active Boosts</h3>
			{#if activeBoosts.length > 0}
				<div class="boost-list">
					{#each activeBoosts as item}
						<div class="boost-item">
							<span class="boost-name">{item.name}</span>
							<span class="boost-value">+{formatNumber(item.boost, suffixes)} machines</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-text">No active boosts. Produce more swarms or check allocation!</p>
			{/if}
		</div>

		<div class="machine-list">
			<div class="industry-card">
				<div class="info">
					<div class="tier-header">
						<h3>{$t('production_lines.Nanobot Factory')}</h3>
						<div class="owned-badge" title={$t('common.owned')}>
							{formatNumber(nanoFactoryCount, suffixes)}
						</div>
					</div>
					<p>{tr('heavy_industry_ui.auto_produces', '{machine}', 'Nano-Swarms')}</p>
					<div class="stats-row">
						<div class="stat-block">
							<span class="stat-label">{$t('common.production')}</span>
							<span class="stat-value">
								{formatNumber(nanobotProduction, suffixes)}/⏱️
							</span>
						</div>
					</div>
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

	h3 {
		color: #eee;
		margin-top: 0;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	p {
		color: #ccc;
		font-size: 0.9rem;
		margin: 0;
	}

	.stats-panel {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 8px;
	}

	.explanation-panel,
	.boosts-panel {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		border: 1px solid #3a4a5a;
	}

	.boost-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.boost-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.boost-item:last-child {
		border-bottom: none;
	}

	.boost-name {
		color: #ccc;
	}

	.boost-value {
		color: #00f2fe;
		font-weight: bold;
	}

	.empty-text {
		color: #888;
		font-style: italic;
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
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.info {
		flex: 999 1 300px;
	}

	.info h3 {
		margin: 0 0 0.5rem 0;
		font-size: var(--font-size-xl);
		color: var(--color-text-primary);
	}

	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		gap: 1rem;
	}

	.owned-badge {
		background: #333;
		color: #fff;
		font-size: 0.9rem;
		font-weight: bold;
		min-width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		padding: 0 0.5rem;
		border: 1px solid #444;
	}

	.stats-row {
		display: flex;
		flex-wrap: wrap;
		column-gap: 2rem;
		row-gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.stat-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		text-transform: uppercase;
		color: #888;
		font-size: 0.75rem;
		font-weight: bold;
		letter-spacing: 0.05em;
	}

	.stat-value {
		color: #fff;
		font-size: 1.1rem;
		font-weight: 500;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		min-width: 200px;
		flex: 1 1 auto;
		justify-content: flex-end;
	}

	.buy-btn {
		padding: 1rem 2rem;
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
		flex: 1;
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
</style>

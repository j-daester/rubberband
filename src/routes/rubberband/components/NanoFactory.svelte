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
	let allocRubber = 25;
	let allocBander = 25;
	let allocLines = 25;
	let allocNano = 25;

	// Init from game state once
	let initialized = false;

	// Reactive trigger
	$: {
		tick;
		game = game;
		if (game && !initialized && game.nanoAllocation) {
			allocRubber = Math.round(game.nanoAllocation.rubber_machines * 100);
			allocBander = Math.round(game.nanoAllocation.bander_machines * 100);
			allocLines = Math.round(game.nanoAllocation.production_lines * 100) || 0;
			allocNano = Math.round(game.nanoAllocation.nanobots * 100);
			// Ensure sum is exactly 100
			const sum = allocRubber + allocBander + allocLines + allocNano;
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

	function updateAllocation(param: 'rubber' | 'bander' | 'lines' | 'nano', value: number) {
		value = Math.max(0, Math.min(100, Math.round(value))); // Clamp

		const others = [
			{ key: 'rubber', val: allocRubber },
			{ key: 'bander', val: allocBander },
			{ key: 'lines', val: allocLines },
			{ key: 'nano', val: allocNano }
		].filter((o) => o.key !== param);

		const remainder = 100 - value;
		const currentSumOthers = others.reduce((a, b) => a + b.val, 0);

		const newAllocations: Record<string, number> = {
			rubber: allocRubber,
			bander: allocBander,
			lines: allocLines,
			nano: allocNano
		};

		// Set the target
		newAllocations[param] = value;

		if (currentSumOthers === 0) {
			// Distribute evenly if others are zero
			const equalShare = Math.floor(remainder / others.length);
			let distributed = 0;
			others.forEach((o, i) => {
				if (i === others.length - 1) {
					newAllocations[o.key] = remainder - distributed;
				} else {
					newAllocations[o.key] = equalShare;
					distributed += equalShare;
				}
			});
		} else {
			// Proportional Distribution
			let distributed = 0;
			others.forEach((o, i) => {
				if (i === others.length - 1) {
					newAllocations[o.key] = remainder - distributed;
				} else {
					const ratio = o.val / currentSumOthers;
					const share = Math.floor(remainder * ratio);
					newAllocations[o.key] = share;
					distributed += share;
				}
			});
		}

		// Update State UI
		allocRubber = newAllocations['rubber'];
		allocBander = newAllocations['bander'];
		allocLines = newAllocations['lines'];
		allocNano = newAllocations['nano'];

		// Apply to Game
		const newAlloc: NanoAllocation = {
			rubber_machines: allocRubber / 100,
			bander_machines: allocBander / 100,
			production_lines: allocLines / 100,
			nanobots: allocNano / 100
		};
		game.setNanoAllocation(newAlloc);
	}

	function resetAllocation() {
		allocRubber = 25;
		allocBander = 25;
		allocLines = 25;
		allocNano = 25;

		const newAlloc: NanoAllocation = {
			rubber_machines: 0.25,
			bander_machines: 0.25,
			production_lines: 0.25,
			nanobots: 0.25
		};
		game.setNanoAllocation(newAlloc);
	}

	$: isVisible = game.researched.includes('nanotechnology');

	$: nanobotCount = game.nanobotCount;

	$: nanoFactoryCount = game.nanobotFactoryCount;
	$: nanoFactoryCost = game.nanobotFactoryCost;

	$: nanobotProduction = game.getNanobotProduction ? game.getNanobotProduction() : 1;

	// Calculate Efficiencies for Display
	$: rubberEfficiency = game.getFamilyNanoEfficiency('rubber_machines', ['rubber_sources']);
	$: banderEfficiency = game.getFamilyNanoEfficiency('bander_machines', ['bander']);
	$: linesEfficiency = game.getFamilyNanoEfficiency('production_lines', [
		'rubber_factory_line',
		'bander_line'
	]);

	// Helper for Nanobot Efficiency Display
	$: nanoEfficiency = (() => {
		const allocated = game.nanobotCount * (allocNano / 100);
		const denom = game.nanobotFactoryCount * 10;
		if (denom > 0) return allocated / denom;
		return 0;
	})();

	$: tr = (key: string, search: string, replace: string) => {
		const val = $t(key);
		return (typeof val === 'string' ? val : '').replace(search, replace);
	};
</script>

{#if isVisible}
	<section class="nano-factory">
		<div class="stats-panel">
			<div class="stat">
				<span class="label">Active Nanobots</span>
				<span class="value">{formatNumber(nanobotCount, suffixes)}</span>
			</div>
		</div>

		<!-- Allocation Sliders -->
		<div class="allocation-panel">
			<div
				class="flex justify-between items-center mb-2"
				style="display: flex; justify-content: space-between; align-items: center;"
			>
				<div>
					<h3>Nanobot Allocation</h3>
					<span class="text-xs text-gray-400">Determines pool size</span>
				</div>
				<button class="reset-btn" on:click={resetAllocation} title="Reset to 25% each">
					Reset
				</button>
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
					<div class="boost-badge" title="Current Efficiency Boost">
						⚡ {(rubberEfficiency * 100).toFixed(1)}%
					</div>
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
					<div class="boost-badge" title="Current Efficiency Boost">
						⚡ {(banderEfficiency * 100).toFixed(1)}%
					</div>
				</div>
			</div>

			<div class="slider-row">
				<div class="slider-label">
					<span>Production Lines</span>
				</div>
				<div class="slider-controls">
					<input
						type="range"
						min="0"
						max="100"
						value={allocLines}
						on:input={(e) => updateAllocation('lines', +e.currentTarget.value)}
					/>
					<span class="perc-value">{allocLines}%</span>
					<div class="boost-badge" title="Current Efficiency Boost">
						⚡ {(linesEfficiency * 100).toFixed(1)}%
					</div>
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
					<div class="boost-badge" title="Current Efficiency Boost">
						⚡ {(nanoEfficiency * 100).toFixed(1)}%
					</div>
				</div>
			</div>
		</div>

		<div class="explanation-panel">
			<h3>Nanobot Intelligence</h3>
			<p>Nanobots improve the efficiency of all machines in the assigned category.</p>
			<p class="text-xs text-gray-400 mt-1">
				Efficiency = Allocated Nanobots / (Sum of Machine Count × Threshold)
			</p>
		</div>

		<div class="boosts-panel" style="display: none;">
			<!-- Hidden as requested by logic change (display next to slider) -->
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
					<p>{tr('heavy_industry_ui.auto_produces', '{machine}', 'Nanobots')}</p>
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

	.boost-badge {
		background: rgba(0, 242, 254, 0.15);
		color: #00f2fe;
		font-size: 0.8rem;
		font-weight: bold;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		margin-left: 0.5rem;
		min-width: 4.5rem;
		text-align: center;
		border: 1px solid rgba(0, 242, 254, 0.3);
		white-space: nowrap;
	}

	.reset-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid #444;
		color: #ccc;
		font-size: 0.8rem;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.reset-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		border-color: #555;
	}
</style>

<script lang="ts">
	import type { Game } from '../game';
	import { productionLines } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	const dispatch = createEventDispatcher();

	// Explicitly defining the Nanobot Factory line
	const nanoFactoryLine = productionLines.find((p) => p.name === 'Nanobot Factory');

	// Reactive trigger
	$: {
		tick;
		game = game;
	}

	function buyMachineProductionLine(machineName: string, amount: number = 1) {
		if (game.buyMachineProductionLine(machineName, amount)) {
			dispatch('action');
		}
	}

	$: nanoSwarmsCount = game.machines['Nano-Swarms'] || 0;
	$: currentBuff = Math.floor(nanoSwarmsCount * 0.01);

	$: nanoFactoryCount = nanoFactoryLine
		? game.machineProductionLines[nanoFactoryLine.name] || 0
		: 0;
	$: nanoFactoryCost = nanoFactoryLine
		? game.getMachineProductionLineCost(nanoFactoryLine.name, 1, nanoFactoryCount)
		: 0;

	// Reactive translations helper
	$: tr = (key: string, search: string, replace: string) => {
		const val = $t(key);
		return (typeof val === 'string' ? val : '').replace(search, replace);
	};
</script>

{#if nanoFactoryLine && game.isProductionLineUnlocked(nanoFactoryLine)}
	<section class="nano-factory">
		<h2>Nano Factory</h2>

		<div class="stats-panel">
			<div class="stat">
				<span class="label">Active Swarms</span>
				<span class="value">{formatNumber(nanoSwarmsCount, suffixes)}</span>
			</div>
			<div class="stat">
				<span class="label">Production Buff</span>
				<span class="valueHighlight">+{formatNumber(currentBuff, suffixes)}</span>
			</div>
		</div>

		<div class="machine-list">
			{#if nanoFactoryLine}
				<div class="industry-card">
					<div class="info">
						<h3>{$t('production_lines.' + nanoFactoryLine.name)}</h3>
						<p>{tr('heavy_industry_ui.auto_produces', '{machine}', 'Nano-Swarms')}</p>
						<p class="details">
							{$t('common.production')}: {formatNumber(
								game.getProductionLineOutputPerUnit(nanoFactoryLine.name),
								suffixes
							)}/⏱️
						</p>
						<p class="owned">{$t('common.owned')}: {formatNumber(nanoFactoryCount, suffixes)}</p>
					</div>
					<div class="actions">
						<button
							class="buy-btn"
							disabled={game.money < nanoFactoryCost}
							on:click={() => buyMachineProductionLine(nanoFactoryLine.name)}
						>
							<span class="action-text">{$t('common.buy')}</span>
							<span class="price-text">{formatMoney(nanoFactoryCost, suffixes)}</span>
						</button>
					</div>
				</div>
			{/if}
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

	.stats-panel {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 8px;
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

	.valueHighlight {
		font-size: 1.5rem;
		font-weight: bold;
		color: #00f2fe;
	}

	.machine-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	.industry-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.info h3 {
		margin: 0 0 0.5rem 0;
		font-size: var(--font-size-lg);
		color: var(--color-text-primary);
	}

	.info p {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.details {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.owned {
		color: var(--color-text-highlight);
		font-weight: var(--font-weight-bold);
		margin: 0.5rem 0 0.5rem 0;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.buy-btn {
		padding: 0.5rem;
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
		min-height: 3.5rem;
		width: 100%;
	}

	.action-text {
		font-weight: bold;
	}

	.price-text {
		font-weight: normal;
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

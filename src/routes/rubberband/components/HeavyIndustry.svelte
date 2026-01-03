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

	function sellMachineProductionLine(machineName: string, amount: number = 1) {
		if (game.sellMachineProductionLine(machineName, amount)) {
			dispatch('action');
		}
	}

	function anyParams(p: any): any {
		return p;
	}

	function tr(key: string, search: string, replace: string) {
		return ($t(key) as string).replace(search, replace);
	}
	function handleUpgrade(machineName: string) {
		if (game.upgradeItem(machineName)) {
			dispatch('action');
		}
	}
</script>

{#if game.researched.includes('synthetic_rubber')}
	<section class="heavy-industry">
		<h2>{$t('heavy_industry_ui.title')}</h2>
		<div class="machine-list">
			{#each productionLines as line}
				{#if game.isItemVisible(line) && line.name !== 'Nanobot Factory'}
					{@const count = game.machineProductionLines[line.name] || 0}
					{@const cost = game.getMachineProductionLineCost(line.name, 1, count)}
					{@const max = game.getMaxAffordableProductionLine(line.name, game.money, count)}
					{@const sellPrice =
						count > 0
							? Math.floor(0.5 * game.getMachineProductionLineCost(line.name, 1, count - 1))
							: 0}

					{@const machineNameTranslated =
						line.product_type === 'rubber_source'
							? $t('rubber_sources.' + line.machine)
							: $t('machines.' + line.machine)}

					{@const nanoSwarms = game.machines['Nano-Swarms'] || 0}
					{@const nanoBoost = Math.floor(nanoSwarms * 0.01)}

					<div class="industry-card">
						<div class="info">
							<h3>{$t('production_lines.' + line.name)}</h3>
							<p>{tr('heavy_industry_ui.auto_produces', '{machine}', machineNameTranslated)}</p>
							<p class="details">
								{$t('common.production')}: {formatNumber(
									game.getProductionLineOutputPerUnit(line.name),
									suffixes
								)}/⏱️
								{#if nanoBoost > 0}
									<span style="color: #00f2fe; font-weight: bold;"
										>(+{formatNumber(nanoBoost, suffixes)})</span
									>
								{/if}
							</p>
							<p class="owned">{$t('common.owned')}: {formatNumber(count, suffixes)}</p>
						</div>
						<div class="actions">
							<button
								class="buy-btn"
								disabled={game.money < cost}
								on:click={() => buyMachineProductionLine(line.name)}
							>
								<span class="action-text">{$t('common.buy')}</span>
								<span class="price-text">{formatMoney(cost, suffixes)}</span>
							</button>
							<button
								class="buy-btn sell-btn"
								disabled={count <= 0}
								on:click={() => sellMachineProductionLine(line.name)}
							>
								<span class="action-text">{$t('common.sell')}</span>
								<span class="price-text">{formatMoney(sellPrice, suffixes)}</span>
							</button>

							{#if line.upgrade_definition}
								{@const upgradeCost = game.getUpgradeCost(line)}
								{@const upgradeTarget = $t('production_lines.' + line.upgrade_definition.target)}
								{#if line.upgrade_definition?.target}
									{@const targetLine = productionLines.find(
										(p) => p.name === line.upgrade_definition?.target
									)}
									{#if targetLine}
										{@const isResearchMissing = !game.isProductionLineUnlocked(targetLine)}
										<div
											style="width: 100%; margin-top: 0.5rem; flex-basis: 100%; {isResearchMissing
												? 'opacity: 0.5;'
												: ''}"
										>
											<hr style="border: 0; border-top: 1px solid #444; margin: 0.5rem 0 1rem 0;" />
											<p
												style="margin: 0 0 0.5rem 0; color: {isResearchMissing
													? '#aaa'
													: '#fff'}; font-size: 0.9em; text-align: center; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;"
											>
												{$t('common.upgrade_available', {
													default: 'Upgrade to ' + upgradeTarget
												})}
											</p>
											{#if isResearchMissing && targetLine.precondition_research}
												<p
													style="margin: 0 0 0.5rem 0; color: #ff6b6b; font-size: 0.8em; text-align: center; font-weight: bold;"
												>
													Requires the research of {$t(
														'research.' + targetLine.precondition_research + '.name'
													)}
												</p>
											{/if}

											<!-- Upgrade Stats -->
											<div
												style="display: flex; justify-content: space-around; font-size: 0.8em; color: #ccc; margin-bottom: 0.5rem;"
											>
												<span>
													{$t('common.production')}:
													{formatNumber(game.getProductionLineOutputPerUnit(line.name), suffixes)} &rarr;
													<span style="color: #4caf50;"
														>{formatNumber(
															game.getProductionLineOutputPerUnit(targetLine.name),
															suffixes
														)}</span
													>/⏱️
												</span>
											</div>
											<button
												class="buy-btn upgrade-btn"
												disabled={game.money < upgradeCost || isResearchMissing}
												on:click={() => handleUpgrade(line.name)}
												style="background: #a27b00; width: 100%;"
												title={isResearchMissing ? 'Research required' : ''}
											>
												<span class="action-text">Upgrade</span>
												<span class="price-text">{formatMoney(upgradeCost, suffixes)}</span>
											</button>
										</div>
									{/if}
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</section>
{/if}

<style>
	section {
		margin-bottom: 2rem;
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
		flex-wrap: wrap;
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

	.buy-btn:not(.sell-btn) {
		flex: 2;
	}

	.sell-btn {
		background: #663333;
		flex: 1;
	}

	.sell-btn:hover:not(:disabled) {
		background: #884444;
	}
</style>

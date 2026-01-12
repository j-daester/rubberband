<script lang="ts">
	import type { Game } from '../game';
	import { producerFamilies, type Producer } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	let buyAmount = 1;

	// Reactive trigger
	$: {
		tick;
		game = game;
	}

	// Filter Production Lines
	$: productionLineFamilies = producerFamilies.filter((f) => f.type === 'production_line');

	const dispatch = createEventDispatcher();

	function handleBuy(familyId: string, tierIndex: number, amount: number = 1) {
		if (game.buyProducer(familyId, tierIndex, amount)) {
			dispatch('action');
		}
	}

	function handleSell(familyId: string, tierIndex: number, amount: number = 1) {
		if (game.sellProducer(familyId, tierIndex, amount)) {
			dispatch('action');
		}
	}

	function tr(key: string, search: string, replace: string) {
		return ($t(key) as string).replace(search, replace);
	}
</script>

{#if game.researched.includes('synthetic_rubber')}
	<section class="heavy-industry">
		<div class="header-row">
			<h2>{$t('heavy_industry_ui.title')}</h2>
			<div class="buy-controls">
				<button class:active={buyAmount === 1} on:click={() => (buyAmount = 1)}>1</button>
				<button class:active={buyAmount === 10} on:click={() => (buyAmount = 10)}>10</button>
				<button class:active={buyAmount === -1} on:click={() => (buyAmount = -1)}>Max</button>
			</div>
		</div>

		<div class="machine-list">
			{#each productionLineFamilies as family}
				{@const baseLine = family.tiers[0]}
				{#if game.isProducerVisible(baseLine)}
					<div class="industry-card">
						<div class="family-header">
							<h3>{$t('production_lines.' + baseLine.name)}</h3>
						</div>

						<div class="tiers-container">
							{#each family.tiers as line, index}
								{@const count = game.producers[family.id]?.[index] || 0}
								{#if game.isProducerVisible(line) || count > 0}
									{@const isBeingProduced = false}
									<!-- Lines are not produced by other lines usually -->
									{@const nextTier = family.tiers[index + 1]}
									{@const canUpgrade = !!(nextTier && game.isProducerVisible(nextTier))}

									{@const machineNameTranslated =
										line.production.output.resource === 'rubber' // Fallback check
											? $t('rubber_sources.' + line.name)
											: (() => {
													const targetFamilyId = line.production.output.familyId;
													const targetTierIndex = line.production.output.tierIndex || 0;
													const targetFamily = producerFamilies.find(
														(f) => f.id === targetFamilyId
													);
													const targetTier = targetFamily?.tiers[targetTierIndex];

													if (targetFamily?.type === 'rubber_source')
														return targetTier ? $t('rubber_sources.' + targetTier.name) : '';
													return targetTier ? $t('machines.' + targetTier.name) : '';
											  })()}

									{@const nanoSwarms = game.producers['nanoswarm']?.[0] || 0}

									<!-- Boost is calculated inside getEntityOutput, we just display the base+boost diff if we want, or just Total.
                                         Original code showed (+Boost).
                                         Let's calc boost for display.
                                    -->
									{@const totalOutput = game.getProducerOutput(family.id, index)}
									{@const baseOutput = line.production.output.amount}
									{@const boost = totalOutput - baseOutput}

									<div class="tier-row">
										<div class="info">
											<h4>{$t('production_lines.' + line.name)}</h4>
											<p class="desc">
												{tr('heavy_industry_ui.auto_produces', '{machine}', machineNameTranslated)}
											</p>

											<div class="stats">
												<span class="stat">
													{$t('common.production')}:
													<span class="val">{formatNumber(totalOutput, suffixes)}/⏱️</span>
													{#if boost > 0}
														<span class="boost">(+{formatNumber(boost, suffixes)})</span>
													{/if}
												</span>
												<span class="stat"
													>{$t('common.owned')}:
													<span class="val highlight">{formatNumber(count, suffixes)}</span></span
												>
											</div>
										</div>

										<div class="actions">
											<!-- Buy / Sell Base Tier -->
											{#if line.allow_manual_purchase !== false}
												{@const purchased = game.purchasedProducers[family.id]?.[index] || 0}
												{@const maxBuy = game.getMaxAffordableProducer(
													family.id,
													index,
													game.money,
													purchased
												)}
												{@const currentBuyAmount =
													buyAmount === -1 ? Math.max(1, maxBuy) : buyAmount}
												{@const buyCost = game.getProducerCost(
													family.id,
													index,
													currentBuyAmount,
													purchased
												)}
												{@const canAffordBuy = game.money >= buyCost}

												<div class="action-group">
													<button
														class="btn buy"
														disabled={(!canAffordBuy && buyAmount !== -1) ||
															(buyAmount === -1 && maxBuy === 0)}
														on:click={() => handleBuy(family.id, index, currentBuyAmount)}
													>
														Buy {currentBuyAmount} <br />
														<small>{formatMoney(buyCost, suffixes)}</small>
													</button>
													<button
														class="btn sell"
														disabled={count <= 0}
														on:click={() => handleSell(family.id, index)}
													>
														Sell
													</button>
												</div>
											{/if}

											<!-- Upgrade -->
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</section>
{/if}

<style>
	section.heavy-industry {
		margin-bottom: 2rem;
		color: #eee;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.header-row h2 {
		margin: 0;
	}

	.buy-controls button {
		background: #333;
		border: 1px solid #555;
		color: #aaa;
		padding: 0.25rem 0.75rem;
		cursor: pointer;
		border-radius: 4px;
	}
	.buy-controls button.active {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.machine-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	.industry-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
	}
	.family-header h3 {
		margin-top: 0;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
		color: #fff;
	}

	.tiers-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tier-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		background: #303030;
		padding: 0.5rem;
		border-radius: 6px;
		gap: 1rem;
	}

	.info {
		flex: 1;
		min-width: 250px;
	}
	.info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: #ddd;
	}
	.info .desc {
		color: #aaa;
		font-size: 0.8rem;
		margin-bottom: 0.25rem;
	}

	.stats {
		font-size: 0.85rem;
		color: #aaa;
		display: flex;
		gap: 1rem;
	}
	.stat .val {
		color: #fff;
	}
	.stat .val.highlight {
		color: #4caf50;
		font-weight: bold;
	}
	.boost {
		color: #00f2fe;
		font-weight: bold;
		font-size: 0.9em;
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	.action-group {
		display: flex;
		gap: 2px;
	}

	.btn {
		border: none;
		border-radius: 4px;
		padding: 0.4rem 0.8rem;
		cursor: pointer;
		color: white;
		font-size: 0.8rem;
		line-height: 1.2;
		text-align: center;
		min-width: 80px;
	}
	.btn small {
		display: block;
		opacity: 0.8;
		font-size: 0.75em;
	}

	.btn.buy {
		background: #444;
	}
	.btn.buy:hover:not(:disabled) {
		background: #555;
	}

	.btn.sell {
		background: #5a3030;
		opacity: 0.8;
	}
	.btn.sell:hover:not(:disabled) {
		background: #7a4040;
		opacity: 1;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		filter: grayscale(0.5);
	}
</style>

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
		<h2>{$t('heavy_industry_ui.title')}</h2>

		<div class="machine-list">
			{#each productionLineFamilies as family}
				{#each family.tiers as line, index}
					{@const count = game.producers[family.id]?.[index] || 0}
					<!-- Check visibility: Visible if unlocked OR owned > 0 -->
					{#if game.isProducerVisible(line) || count > 0}
						<!-- Logic Setup -->
						{@const isBeingProduced = false}

						<!-- Name Translation Logic for Description -->
						{@const machineNameTranslated =
							line.production.output.resource === 'rubber'
								? $t('rubber_sources.' + line.name)
								: (() => {
										const targetFamilyId = line.production.output.familyId;
										const targetTierIndex = line.production.output.tierIndex || 0;
										const targetFamily = producerFamilies.find((f) => f.id === targetFamilyId);
										const targetTier = targetFamily?.tiers[targetTierIndex];

										if (targetFamily?.type === 'rubber_source')
											return targetTier ? $t('rubber_sources.' + targetTier.name) : '';
										return targetTier ? $t('machines.' + targetTier.name) : '';
								  })()}

						<!-- Stats Logic -->
						{@const totalOutput = game.getProducerOutput(family.id, index)}
						{@const baseOutput = line.production.output.amount}
						{@const boost = totalOutput - baseOutput}

						<!-- Card -->
						<div class="industry-card">
							<div class="info">
								<div class="tier-header">
									<h3>{$t('production_lines.' + line.name)}</h3>
									<div class="owned-badge" title={$t('common.owned')}>
										{formatNumber(count, suffixes)}
									</div>
								</div>
								<p class="desc">
									{tr('heavy_industry_ui.auto_produces', '{machine}', machineNameTranslated)}
								</p>

								<div class="stats-row">
									<div class="stat-block">
										<span class="stat-label">{$t('common.production')}</span>
										<span class="stat-value">
											{formatNumber(totalOutput, suffixes)}/⏱️
											{#if boost > 0}
												<span class="boost">(+{formatNumber(boost, suffixes)})</span>
											{/if}
										</span>
									</div>
								</div>
							</div>

							<div class="actions">
								{#if line.allow_manual_purchase !== false}
									{@const purchased = game.purchasedProducers[family.id]?.[index] || 0}
									{@const maxBuy = game.getMaxAffordableProducer(
										family.id,
										index,
										game.money,
										purchased
									)}
									{@const currentBuyAmount = buyAmount === -1 ? Math.max(1, maxBuy) : buyAmount}
									{@const buyCost = game.getProducerCost(
										family.id,
										index,
										currentBuyAmount,
										purchased
									)}
									{@const canAffordBuy = game.money >= buyCost}
									{@const sellPrice =
										count > 0
											? Math.floor(0.5 * game.getProducerCost(family.id, index, 1, count - 1))
											: 0}

									<div class="action-group">
										<button
											class="buy-btn"
											disabled={(!canAffordBuy && buyAmount !== -1) ||
												(buyAmount === -1 && maxBuy === 0)}
											on:click={() => handleBuy(family.id, index, currentBuyAmount)}
										>
											<span class="action-text">{$t('common.buy')}</span>
											<span class="price-text">{formatMoney(buyCost, suffixes)}</span>
										</button>
										<button
											class="buy-btn sell-btn"
											disabled={count <= 0}
											on:click={() => handleSell(family.id, index)}
										>
											<span class="action-text">{$t('common.sell')}</span>
											<span class="price-text">{formatMoney(sellPrice, suffixes)}</span>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			{/each}
		</div>
	</section>
{/if}

<style>
	section.heavy-industry {
		margin-bottom: 2rem;
		color: #eee;
	}

	.machine-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.industry-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.info {
		flex: 999 1 250px;
		min-width: 250px;
	}

	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
		gap: 1rem;
	}

	.info h3 {
		margin: 0;
		font-size: 1rem;
		color: #ddd;
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

	.desc {
		color: #aaa;
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
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

	.boost {
		color: #00f2fe;
		font-weight: bold;
		font-size: 0.8em;
		margin-left: 0.3rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
		flex: 1 1 auto;
		justify-content: flex-end;
	}

	.action-group {
		display: flex;
		gap: 0.5rem;
		flex: 1;
	}

	.buy-btn {
		background: #444;
		border: 1px solid #555;
		color: #fff;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 80px;
		transition: all 0.2s;
		flex: 1;
	}

	.buy-btn:hover:not(:disabled) {
		background: #555;
		border-color: #666;
	}

	.buy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		filter: grayscale(0.8);
	}

	.sell-btn {
		background: #3f2a2a;
		border-color: #553333;
	}

	.sell-btn:hover:not(:disabled) {
		background: #5a3a3a;
		border-color: #774444;
	}

	.action-text {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		line-height: 1.2;
	}

	.price-text {
		font-size: 0.75rem;
		color: #aaa;
		margin-top: 0.1rem;
		font-weight: normal;
	}
</style>

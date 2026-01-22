<script lang="ts">
	import { game } from '$lib/state/gameState.svelte';
	import * as Actions from '$lib/services/gameLoop';
	import { producerFamilies, type Producer } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t, json } from 'svelte-i18n';

	// No props needed - accessing global state
	// Local state
	let buyAmount = 1;

	// Helper to get suffixes (previously passed as prop)
	$: suffixes = $json('suffixes') as unknown as string[];

	$: machineFamilies = producerFamilies.filter((f) => f.type === 'machine');

	const dispatch = createEventDispatcher();

	function handleBuy(familyId: string, tierIndex: number, amount: number = 1) {
		if (Actions.buyProducer(familyId, tierIndex, amount)) {
			dispatch('action');
		}
	}

	function handleSell(familyId: string, tierIndex: number, amount: number = 1) {
		if (Actions.sellProducer(familyId, tierIndex, amount)) {
			dispatch('action');
		}
	}
</script>

{#if game.researched.includes('basic_manufacturing')}
	<section class="shop">
		<h2>{$t('common.machine_shop')}</h2>

		<div class="machine-list">
			{#each machineFamilies as family}
				{#each family.tiers as machine, index}
					<!-- Show tier if it's Research Unlocked OR if we own some (legacy/edge case) -->
					{@const owned = game.producers[family.id]?.[index] || 0}
					<!-- Check visibility of the specific machine tier -->
					{#if Actions.isProducerVisible(machine) || owned > 0}
						{@const purchased = game.purchasedProducers[family.id]?.[index] || 0}
						{@const isBeingProduced = Actions.isProducerBeingProduced(family.id, index)}
						{@const nextTier = family.tiers[index + 1]}

						{@const sellPrice =
							purchased > 0
								? Math.floor(0.5 * Actions.getProducerCost(family.id, index, 1, purchased - 1))
								: 0}

						<div class="machine-card">
							<div class="tier-info">
								<div class="tier-header">
									<h3>{$t('machines.' + machine.name)}</h3>
									<div class="owned-badge" title={$t('common.owned')}>
										{formatNumber(owned, suffixes)}
									</div>
								</div>

								<div class="stats-row">
									<div class="stat-block">
										<span class="stat-label">{$t('common.production')}</span>
										<span class="stat-value">
											{formatNumber(Actions.getProducerOutput(family.id, index), suffixes)}/⏱️
										</span>
									</div>
									{#if machine.maintenance_cost && machine.maintenance_cost > 0}
										<div class="stat-block">
											<span class="stat-label">{$t('common.maintenance')}</span>
											<span class="stat-value">
												{formatMoney(machine.maintenance_cost, suffixes)}/⏱️
											</span>
										</div>
									{/if}
								</div>
							</div>

							<div class="tier-actions">
								<!-- Buy / Sell Base Tier -->
								{#if machine.allow_manual_purchase !== false}
									{@const maxBuy = Actions.getMaxAffordableProducer(
										family.id,
										index,
										game.money,
										purchased
									)}
									{@const currentBuyAmount = buyAmount === -1 ? Math.max(1, maxBuy) : buyAmount}
									{@const buyCost = Actions.getProducerCost(
										family.id,
										index,
										currentBuyAmount,
										purchased
									)}
									{@const canAffordBuy = game.money >= buyCost}

									<div class="action-group">
										<button
											class="buy-btn"
											disabled={(!canAffordBuy && buyAmount !== -1) ||
												(buyAmount === -1 && maxBuy === 0) ||
												isBeingProduced}
											onclick={() => handleBuy(family.id, index, currentBuyAmount)}
										>
											<span class="action-text">{$t('common.buy')}</span>
											<span class="price-text">{formatMoney(buyCost, suffixes)}</span>
										</button>
										<button
											class="buy-btn sell-btn"
											disabled={owned <= 0 || isBeingProduced}
											onclick={() => handleSell(family.id, index)}
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
	section.shop {
		margin-bottom: 2rem;
		color: #eee;
	}

	.machine-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.machine-card {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		gap: 1rem;
	}

	.tier-info {
		flex: 999 1 300px;
		min-width: 200px;
	}

	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		gap: 1rem;
	}

	.tier-info h3 {
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

	.tier-actions {
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

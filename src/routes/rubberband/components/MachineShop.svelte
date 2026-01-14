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

	// Reactive declarations to keep UI in sync with game state
	$: {
		tick;
		game = game;
	}

	// Filter for Machines
	$: machineFamilies = producerFamilies.filter((f) => f.type === 'machine');

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
</script>

{#if game.researched.includes('basic_manufacturing')}
	<section class="shop">
		<h2>{$t('common.machine_shop')}</h2>

		<div class="machine-list">
			{#each machineFamilies as family}
				{@const baseMachine = family.tiers[0]}
				<!-- Only show family if base is unlocked/visible based on research -->
				{#if game.isProducerVisible(baseMachine)}
					<div class="family-card">
						<!-- Family Header -->
						<div class="family-header">
							<h3>
								{$t('machines.' + baseMachine.name + '_family', { default: baseMachine.name })}
							</h3>
						</div>

						<div class="tiers-container">
							{#each family.tiers as machine, index}
								<!-- Show tier if it's Research Unlocked OR if we own some (legacy/edge case) -->
								{@const owned = game.producers[family.id]?.[index] || 0}
								{#if game.isProducerVisible(machine) || owned > 0}
									{@const purchased = game.purchasedProducers[family.id]?.[index] || 0}
									{@const isBeingProduced = game.isProducerBeingProduced(family.id, index)}
									{@const nextTier = family.tiers[index + 1]}
									<!-- Can upgrade if next tier exists and is visible -->
									{@const canUpgrade = !!(nextTier && game.isProducerVisible(nextTier))}

									<div class="tier-row">
										<div class="tier-info">
											<h4>{$t('machines.' + machine.name)}</h4>
											<div class="stats">
												<span class="stat"
													>{$t('common.production')}:
													<span class="val"
														>{formatNumber(
															game.getProducerOutput(family.id, index),
															suffixes
														)}/⏱️</span
													></span
												>
												<span class="stat"
													>{$t('common.owned')}:
													<span class="val highlight">{formatNumber(owned, suffixes)}</span></span
												>
											</div>
										</div>

										<div class="tier-actions">
											<!-- Buy / Sell Base Tier -->
											{#if machine.allow_manual_purchase !== false}
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
															(buyAmount === -1 && maxBuy === 0) ||
															isBeingProduced}
														on:click={() => handleBuy(family.id, index, currentBuyAmount)}
													>
														Buy {currentBuyAmount} <br />
														<small>{formatMoney(buyCost, suffixes)}</small>
													</button>
													<button
														class="btn sell"
														disabled={owned <= 0 || isBeingProduced}
														on:click={() => handleSell(family.id, index)}
													>
														Sell
													</button>
												</div>
											{/if}

											<!-- Upgrade Action -->
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
	section.shop {
		margin-bottom: 2rem;
		color: #eee;
	}

	.machine-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	.family-card {
		background: #1e1e1e;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 1rem;
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
		background: #252525;
		padding: 0.5rem;
		border-radius: 6px;
		gap: 1rem;
	}

	.tier-info {
		flex: 1;
		min-width: 200px;
	}
	.tier-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: #ddd;
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

	.tier-actions {
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

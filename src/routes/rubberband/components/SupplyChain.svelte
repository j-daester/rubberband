<script lang="ts">
	import type { Game } from '../game';
	import { producerFamilies, GAME_CONSTANTS } from '../parameters';
	import { formatNumber, formatMoney, formatWeight } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t, locale } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	let buyAmount = 1;
	let buyerThreshold = game.buyerThreshold;

	// Reactive declarations
	$: {
		tick;
		game = game;
		if (
			game.buyerThreshold !== buyerThreshold &&
			!document.activeElement?.id?.includes('threshold')
		) {
			buyerThreshold = game.buyerThreshold;
		}
	}

	// Filter Rubber Source Families
	$: rubberSourceFamilies = producerFamilies.filter((f) => f.type === 'rubber_source');

	$: money = game.money;
	$: buyerHired = game.buyerHired;
	$: currentBuyerThreshold = game.buyerThreshold;

	$: warningMessage = (() => {
		const suggestions = [$t('supply_chain_ui.suggestion_increase_production')];
		if (!game.buyerHired) {
			suggestions.push($t('supply_chain_ui.suggestion_hire_buyer'));
		} else if (game.buyerThreshold < GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION) {
			suggestions.push($t('supply_chain_ui.suggestion_increase_auto_buy'));
		}

		const prefix = $t('supply_chain_ui.warning_prefix');
		const orText = $locale?.startsWith('de') ? 'oder' : $locale?.startsWith('fr') ? 'ou' : 'or';

		if (suggestions.length > 1) {
			const last = suggestions.pop();
			return `${prefix} ${suggestions.join(', ')} ${orText} ${last}.`;
		}
		return `${prefix} ${suggestions[0]}.`;
	})();

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

	function hireBuyer() {
		if (game.hireBuyer()) {
			dispatch('action');
		}
	}

	function updateBuyerThreshold() {
		game.setBuyerThreshold(buyerThreshold);
		dispatch('action');
	}

	$: autoBuyerActiveParams = {
		amount: formatNumber(currentBuyerThreshold, suffixes)
	} as any;

	function tr(key: string, search: string, replace: string) {
		return ($t(key) as string).replace(search, replace);
	}
</script>

{#if game.researched.includes('optimize_production')}
	<section class="supply-chain">
		<h2>{$t('supply_chain_ui.title')}</h2>

		{#if game.rubberShortage}
			<div class="warning">
				<p>
					⚠️ <strong>{$t('supply_chain_ui.warning_title')}</strong>
					{warningMessage}
				</p>
			</div>
		{/if}

		{#if game.researched.includes(GAME_CONSTANTS.BUYER_UNLOCK_RESEARCH)}
			<div class="auto-buyer-section">
				{#if !buyerHired}
					<div class="plantation-card">
						<div class="plantation-info">
							<h3>{$t('supply_chain_ui.auto_buyer')}</h3>
							<p class="details">{$t('supply_chain_ui.auto_buyer_desc')}</p>
						</div>
						<div class="actions">
							<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}>
								<span class="action-text">{$t('supply_chain_ui.hire_buyer')}</span>
								<span class="price-text">{formatMoney(1000, suffixes)}</span>
							</button>
						</div>
					</div>
				{:else}
					<div class="plantation-card">
						<div class="plantation-info">
							<h3>{$t('supply_chain_ui.auto_buyer_active')}</h3>
							<p class="details">
								{tr(
									'supply_chain_ui.auto_buyer_active_desc',
									'{amount}',
									formatNumber(currentBuyerThreshold, suffixes)
								)}
							</p>
							<div class="controls" style="margin-top: 1rem;">
								<label for="threshold">{$t('supply_chain_ui.threshold_label')}</label>
								<input
									id="threshold"
									type="number"
									bind:value={buyerThreshold}
									on:input={updateBuyerThreshold}
									min="0"
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="plantation-list">
			{#each rubberSourceFamilies as family}
				{#each family.tiers as source, index}
					{#if game.isProducerVisible(source)}
						{@const owned = game.producers[family.id]?.[index] || 0}
						{@const purchased = game.purchasedProducers[family.id]?.[index] || 0}
						{@const max = game.getMaxAffordableProducer(family.id, index, game.money, purchased)}
						{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
						{@const cost = game.getProducerCost(family.id, index, amount, purchased)}
						{@const canAfford = game.money >= cost}
						{@const isBeingProduced = game.isProducerBeingProduced(family.id, index)}

						{@const isDisplayOnly = source.allow_manual_purchase === false}
						{@const sellPrice =
							purchased > 0
								? Math.floor(0.5 * game.getProducerCost(family.id, index, 1, purchased - 1))
								: 0}

						{@const nextTier = family.tiers[index + 1]}

						<div class="plantation-card">
							<div class="plantation-info">
								<div class="tier-header">
									<h3>{$t('rubber_sources.' + source.name)}</h3>
									<div class="owned-badge" title={$t('common.owned')}>
										{formatNumber(owned, suffixes)}
									</div>
								</div>

								<div class="stats-row">
									<div class="stat-block">
										<span class="stat-label">{$t('common.production')}</span>
										<span class="stat-value">
											{formatWeight(game.getProducerOutput(family.id, index))}
											{$t('common.rubber')}/⏱️
										</span>
									</div>
									<div class="stat-block">
										<span class="stat-label">{$t('common.maintenance')}</span>
										<span class="stat-value">
											{formatMoney(source.maintenance_cost || 0, suffixes)}/⏱️
										</span>
									</div>
								</div>
							</div>

							<div class="actions">
								{#if !isDisplayOnly}
									<div class="action-column">
										<div class="buy-sell-row">
											<button
												class="buy-btn"
												disabled={(!canAfford && buyAmount !== -1) ||
													(buyAmount === -1 && max === 0) ||
													isBeingProduced}
												on:click={() => handleBuy(family.id, index, amount)}
												title={isBeingProduced
													? 'Cannot buy while being produced by heavy industry'
													: ''}
											>
												<span class="action-text">{$t('common.buy')}</span>
												<span class="price-text">{formatMoney(cost, suffixes)}</span>
											</button>
											<button
												class="buy-btn sell-btn"
												disabled={owned <= 0 || isBeingProduced}
												on:click={() => handleSell(family.id, index)}
												title={isBeingProduced
													? 'Cannot sell while being produced by heavy industry'
													: ''}
											>
												<span class="action-text">{$t('common.sell')}</span>
												<span class="price-text">{formatMoney(sellPrice, suffixes)}</span>
											</button>
										</div>
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
	section {
		margin-bottom: 2rem;
	}

	.plantation-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.plantation-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: center;
	}

	.plantation-info {
		flex: 999 1 300px;
	}

	.plantation-info h3 {
		margin: 0;
		font-size: 1rem;
		color: #ddd;
	}

	.details {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
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
		margin-top: 0;
		flex: 1 1 auto;
		justify-content: flex-end;
	}

	.action-column {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.buy-sell-row {
		display: flex;
		gap: 0.5rem;
		flex: 1;
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
		flex: 1;
	}

	.action-text {
		font-weight: bold;
		font-size: 1em;
	}

	.price-text {
		font-weight: normal;
		font-size: 0.9em;
		opacity: 0.9;
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

	.sell-btn {
		background: #663333;
	}

	.sell-btn:hover:not(:disabled) {
		background: #884444;
	}

	.warning {
		background: rgba(255, 68, 68, 0.1);
		border: 1px solid #ff4444;
		border-radius: 8px;
		padding: 0.75rem;
		margin-bottom: 1rem;
		color: #ff8888;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.warning p {
		margin: 0;
		font-size: 0.9em;
	}

	.auto-buyer-section {
		margin-bottom: 1rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	input {
		background: #333;
		border: 1px solid #444;
		color: #fff;
		padding: 0.5rem;
		border-radius: 4px;
	}

	@media (max-width: 480px) {
		.auto-buyer-section .plantation-card {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.controls {
			justify-content: space-between;
		}
	}
</style>

<script lang="ts">
	import type { Game } from '../game';
	import { rubberSources, GAME_CONSTANTS } from '../parameters';
	import { formatNumber, formatMoney, formatWeight } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t, locale } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	let buyAmount = 1;
	let buyerThreshold = game.buyerThreshold;

	// Reactive declarations to keep UI in sync with game state
	$: {
		tick;
		// Trigger reactivity for plantations
		game = game;
		// Sync local threshold if game updates it externally (optional, but good for consistency)
		if (
			game.buyerThreshold !== buyerThreshold &&
			!document.activeElement?.id?.includes('threshold')
		) {
			buyerThreshold = game.buyerThreshold;
		}
	}

	$: money = game.money;
	$: buyerHired = game.buyerHired;
	$: currentBuyerThreshold = game.buyerThreshold;

	$: warningMessage = (() => {
		// Ensure $t is available/reactive
		// We depend on tick/game, but simpler to depend on t explicitly if needed?
		// Svelte handles $t reactivity automatically.
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

	function handleBuy(sourceName: string, amount: number = 1) {
		if (game.buyRubberSource(sourceName, amount)) {
			dispatch('action');
		}
	}

	function handleSell(sourceName: string, amount: number = 1) {
		if (game.sellRubberSource(sourceName, amount)) {
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

	const minUnlockLevel = Math.min(
		...rubberSources.map((p) => p.unlock_level),
		GAME_CONSTANTS.BUYER_UNLOCK_LEVEL
	);

	$: autoBuyerActiveParams = {
		amount: formatNumber(currentBuyerThreshold, suffixes)
	} as any;

	function tr(key: string, search: string, replace: string) {
		return ($t(key) as string).replace(search, replace);
	}
</script>

{#if game.level >= minUnlockLevel}
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

		{#if game.level >= GAME_CONSTANTS.BUYER_UNLOCK_LEVEL}
			<div class="auto-buyer-section">
				{#if !buyerHired}
					<div class="hire-card">
						<div class="info">
							<h3>{$t('supply_chain_ui.auto_buyer')}</h3>
							<p>{$t('supply_chain_ui.auto_buyer_desc')}</p>
						</div>
						<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}>
							<span class="action-text">{$t('supply_chain_ui.hire_buyer')}</span>
							<span class="price-text">{formatMoney(1000, suffixes)}</span>
						</button>
					</div>
				{:else}
					<div class="worker-card">
						<div class="info">
							<h3>{$t('supply_chain_ui.auto_buyer_active')}</h3>
							<p>
								{tr(
									'supply_chain_ui.auto_buyer_active_desc',
									'{amount}',
									formatNumber(currentBuyerThreshold, suffixes)
								)}
							</p>
						</div>
						<div class="controls">
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
				{/if}
			</div>
		{/if}

		<div class="plantation-list">
			{#each rubberSources as source}
				{#if game.isRubberSourceUnlocked(source)}
					{@const owned = game.rubberSources[source.name] || 0}
					{@const purchased = game.purchasedRubberSources[source.name] || 0}
					{@const max = game.getMaxAffordableRubberSource(source.name, game.money, purchased)}
					{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
					{@const cost = game.getRubberSourceCost(source.name, amount, purchased)}
					{@const canAfford = game.money >= cost}
					{@const isBeingProduced = game.isBeingProduced(source.name)}

					{@const isDisplayOnly = source.allow_manual_purchase === false}
					{@const sellPrice =
						purchased > 0
							? Math.floor(0.5 * game.getRubberSourceCost(source.name, 1, purchased - 1))
							: 0}

					<div class="plantation-card">
						<div class="plantation-info">
							<h3>{$t('rubber_sources.' + source.name)}</h3>
							<p class="details">
								{$t('common.production')}: {formatWeight(
									game.getRubberSourceOutputPerUnit(source.name)
								)}
								{$t('common.rubber')}/⏱️
							</p>
							<p class="details">
								{$t('common.maintenance')}: {formatMoney(source.maintenance_cost, suffixes)}/⏱️
							</p>
							<p class="owned">{$t('common.owned')}: {formatNumber(owned, suffixes)}</p>
							<p class="details">
								Total {$t('common.maintenance')}: {formatMoney(
									owned * source.maintenance_cost,
									suffixes
								)}/⏱️
							</p>
							{#if !isDisplayOnly}
								<!-- Price removed -->
							{/if}
						</div>
						<div class="actions">
							{#if !isDisplayOnly}
								<button
									class="buy-btn"
									disabled={(!canAfford && buyAmount !== -1) ||
										(buyAmount === -1 && max === 0) ||
										isBeingProduced}
									on:click={() => handleBuy(source.name)}
									title={isBeingProduced ? 'Cannot buy while being produced by heavy industry' : ''}
								>
									<span class="action-text">{$t('common.buy')}</span>
									<span class="price-text">{formatMoney(cost, suffixes)}</span>
								</button>
								<button
									class="buy-btn sell-btn"
									disabled={owned <= 0 || isBeingProduced}
									on:click={() => handleSell(source.name)}
									title={isBeingProduced
										? 'Cannot sell while being produced by heavy industry'
										: ''}
								>
									<span class="action-text">{$t('common.sell')}</span>
									<span class="price-text">{formatMoney(sellPrice, suffixes)}</span>
								</button>
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

	.plantation-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	.plantation-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.plantation-info h3 {
		margin: 0 0 0.5rem 0;
		font-size: var(--font-size-lg);
		color: var(--color-text-primary);
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

	.hire-card,
	.worker-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
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
		.hire-card,
		.worker-card {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.controls {
			justify-content: space-between;
		}
	}
</style>

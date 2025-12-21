<script lang="ts">
	import type { Game } from '../game';
	import { plantationTypes, GAME_CONSTANTS } from '../parameters';
	import { formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

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
		const suggestions = ['Increase your rubber production'];
		if (!game.buyerHired) {
			suggestions.push('hire a buyer');
		} else if (game.buyerThreshold < GAME_CONSTANTS.MAX_RUBBER_NO_PRODUCTION) {
			suggestions.push('increase auto-buy amount');
		}
		if (suggestions.length > 1) {
			const last = suggestions.pop();
			return `Rubber production is lower than demand! ${suggestions.join(', ')} or ${last}.`;
		}
		return `Rubber production is lower than demand! ${suggestions[0]}.`;
	})();

	const dispatch = createEventDispatcher();

	function handleBuy(plantationName: string, amount: number = 1) {
		if (game.buyPlantation(plantationName, amount)) {
			dispatch('action');
		}
	}

	function handleSell(plantationName: string, amount: number = 1) {
		if (game.sellPlantation(plantationName, amount)) {
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
		...plantationTypes.map((p) => p.unlock_level),
		GAME_CONSTANTS.BUYER_UNLOCK_LEVEL
	);
</script>

{#if game.level >= minUnlockLevel}
	<section class="supply-chain">
		<h2>Supply Chain</h2>

		{#if game.rubberShortage}
			<div class="warning">
				<p>
					⚠️ <strong>Warning:</strong>
					{warningMessage}
				</p>
			</div>
		{/if}

		{#if game.level >= GAME_CONSTANTS.BUYER_UNLOCK_LEVEL}
			<div class="auto-buyer-section">
				{#if !buyerHired}
					<div class="hire-card">
						<div class="info">
							<h3>Auto-Buyer</h3>
							<p>Automatically buys rubber when low.</p>
							<p class="price">Cost: ${formatNumber(1000)}</p>
						</div>
						<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}>
							Hire Buyer
						</button>
					</div>
				{:else}
					<div class="worker-card">
						<div class="info">
							<h3>Auto-Buyer (Active)</h3>
							<p>
								Buys {formatNumber(currentBuyerThreshold)} rubber when rubber drops below threshold.
							</p>
						</div>
						<div class="controls">
							<label for="threshold">Threshold:</label>
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
			{#each plantationTypes as plantation}
				{#if game.isPlantationUnlocked(plantation)}
					{@const owned = game.plantations[plantation.name] || 0}
					{@const max = game.getMaxAffordablePlantation(plantation.name, game.money, owned)}
					{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
					{@const cost = game.getPlantationCost(plantation.name, amount, owned)}
					{@const canAfford = game.money >= cost}

					<div class="plantation-card">
						<div class="plantation-info">
							<h3>{plantation.name}</h3>
							<p class="details">Output: {formatNumber(plantation.output)} Rubber/tick</p>
							<p class="details">Maint: ${formatNumber(plantation.maintenance_cost)}/tick</p>
							<p class="owned">Owned: {formatNumber(owned)}</p>
							<p class="details">
								Total Maint: ${formatNumber(owned * plantation.maintenance_cost)}/tick
							</p>
							<p class="price">Price: ${formatNumber(cost)}</p>
						</div>
						<div class="actions">
							<button
								class="buy-btn"
								disabled={(!canAfford && buyAmount !== -1) || (buyAmount === -1 && max === 0)}
								on:click={() => handleBuy(plantation.name)}
							>
								Buy
							</button>
							<button
								class="buy-btn sell-btn"
								disabled={owned <= 0}
								on:click={() => handleSell(plantation.name)}
							>
								Sell
							</button>
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

	.price {
		color: var(--color-text-base);
		font-size: var(--font-size-sm);
		margin-bottom: 1rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.buy-btn {
		padding: 0.75rem;
		border: none;
		border-radius: 6px;
		background: #444;
		color: #fff;
		cursor: pointer;
		transition: background 0.2s;
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

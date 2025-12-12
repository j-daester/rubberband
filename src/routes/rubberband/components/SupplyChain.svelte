<script lang="ts">
	import type { Game } from '../game';
	import { plantationTypes } from '../parameters';
	import { formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

	let buyAmount = 1;

	// Reactive declarations to keep UI in sync with game state
	$: {
		tick;
		// Trigger reactivity for plantations
		game = game;
	}

	const dispatch = createEventDispatcher();

	function handleBuy(plantationName: string, amount: number = 1) {
		if (game.buyPlantation(plantationName, amount)) {
			dispatch('action');
		}
	}
</script>

<section class="supply-chain">
	<h2>Supply Chain</h2>

	<div class="plantation-list">
		{#each plantationTypes as plantation}
			{#if game.level >= plantation.unlock_level}
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
							class="buy-btn max-btn"
							disabled={max <= 0}
							on:click={() => handleBuy(plantation.name, max)}
							title="Buy Max"
						>
							Buy ({formatNumber(max)})
						</button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</section>

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

	.buy-btn:not(.max-btn) {
		flex: 2;
	}

	.max-btn {
		flex: 1;
		font-size: 0.85em;
		padding: 0.75rem 0.5rem;
	}
</style>

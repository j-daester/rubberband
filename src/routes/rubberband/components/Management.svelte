<script lang="ts">
	import type { Game } from '../game';
	import { GAME_CONSTANTS } from '../parameters';
	import { formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

	const dispatch = createEventDispatcher();

	let buyerThreshold = game.buyerThreshold;

	// Sync local state with game state when tick changes (e.g. on load or external update)
	// Sync local state with game state when tick changes
	$: {
		tick;
		game = game;
	}

	$: money = game.money;
	$: buyerHired = game.buyerHired;
	$: currentBuyerThreshold = game.buyerThreshold;

	// Update local threshold if game updates it (e.g. load)
	$: if (currentBuyerThreshold !== buyerThreshold) {
		// Only sync if we are not actively editing?
		// For now, let's just sync to be safe, but this might conflict with typing.
		// Actually, let's just use the game value for display if we wanted,
		// but we need two-way binding or similar.
		// Let's just update the local variable if the game one changes significantly or on load.
		// For now, let's just leave the binding as is, but we need `money` and `buyerHired` to be reactive.
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
</script>

{#if game.level >= GAME_CONSTANTS.BUYER_UNLOCK_LEVEL}
	<section class="management">
		<h2>Management</h2>
		{#if !buyerHired}
			<div class="hire-card">
				<div class="info">
					<h3>Auto-Buyer</h3>
					<p>Automatically buys rubber when low.</p>
					<p class="price">Cost: ${formatNumber(1000)}</p>
				</div>
				<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}> Hire Buyer </button>
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
	</section>
{/if}

<style>
	section {
		margin-bottom: 2rem;
	}

	.management {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
	}

	.hire-card,
	.worker-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.price {
		color: var(--color-text-base);
		margin-top: 0.5rem !important;
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

	.buy-btn {
		padding: 0.75rem 1.5rem;
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

		.buy-btn {
			width: 100%;
		}
	}
</style>

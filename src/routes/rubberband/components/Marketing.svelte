<script lang="ts">
	import type { Game } from '../game';
	import { GAME_CONSTANTS } from '../parameters';
	import { formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

	// Trigger reactivity
	$: {
		tick;
		// Force update of local variables when tick changes
		game = game;
	}

	$: money = game.money;
	$: marketingLevel = game.marketingLevel;
	$: marketingCost = game.marketingCost;

	const dispatch = createEventDispatcher();

	function buyMarketing() {
		if (game.buyMarketing()) {
			dispatch('action');
		}
	}
</script>

{#if game.level >= GAME_CONSTANTS.MARKETING_UNLOCK_LEVEL}
	<section class="marketing">
		<h2>Marketing</h2>
		<div class="marketing-card">
			<div class="info">
				<h3>Marketing Campaign (Lvl {marketingLevel})</h3>
				<p>Increases demand for rubberbands.</p>
				<p class="price">Cost: ${formatNumber(marketingCost)}</p>
			</div>
			<button class="buy-btn" disabled={money < marketingCost} on:click={buyMarketing}>
				Buy Campaign
			</button>
		</div>
	</section>
{/if}

<style>
	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: #ccc;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.marketing-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.info h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		color: #fff;
	}

	.info p {
		color: #888;
		font-size: 0.9rem;
		margin: 0;
	}

	.price {
		color: #e0e0e0;
		margin-top: 0.5rem !important;
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
</style>

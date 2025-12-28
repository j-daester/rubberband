<script lang="ts">
	import type { Game } from '../game';
	import { GAME_CONSTANTS } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
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
	$: ticksSinceLastUpdate = game.tickCount - game.lastMarketingUpdateTick;
	$: ticksUntilDecay = Math.max(0, GAME_CONSTANTS.MARKETING_DECAY_INTERVAL - ticksSinceLastUpdate);
</script>

{#if game.level >= GAME_CONSTANTS.MARKETING_UNLOCK_LEVEL}
	<section class="marketing">
		<h2>Marketing</h2>
		<div class="marketing-card">
			<div class="info">
				<h3>Marketing Campaign (Lvl {marketingLevel})</h3>
				<p>
					Increases demand for rubberbands. {game.researched.includes('automated_ai_marketing')
						? 'No decay.'
						: `Decays in ${ticksUntilDecay} ticks.`}
				</p>
			</div>
			<button class="buy-btn" disabled={money < marketingCost} on:click={buyMarketing}>
				<span class="action-text">Buy Campaign</span>
				<span class="price-text">{formatMoney(marketingCost)}</span>
			</button>
		</div>
	</section>
{/if}

<style>
	section {
		margin-bottom: 2rem;
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
		font-size: var(--font-size-lg);
		color: var(--color-text-primary);
	}

	.info p {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.buy-btn {
		padding: 0.5rem 1.5rem;
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
	}

	.price-text {
		font-weight: normal;
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
		.marketing-card {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.buy-btn {
			width: 100%;
		}
	}
</style>

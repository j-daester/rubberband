<script lang="ts">
	import type { Game } from '../game';
	import { researchList } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

	const dispatch = createEventDispatcher();

	// Reactive trigger
	$: {
		tick;
		game = game;
	}

	function buyResearch(researchId: string) {
		if (game.buyResearch(researchId)) {
			dispatch('action');
		}
	}

	const minUnlockLevel = Math.min(...researchList.map((r) => r.unlock_level));
</script>

{#if game.level >= minUnlockLevel}
	<section class="research">
		<h2>Research</h2>
		<div class="research-list">
			{#each researchList as research}
				{#if game.level >= research.unlock_level}
					{@const isResearched = game.researched.includes(research.id)}
					<div class="research-card" class:researched={isResearched}>
						<div class="info">
							<h3>{research.name}</h3>
							<p>{research.description}</p>
							{#if !isResearched}
								<!-- Price removed from here -->
							{:else}
								<p class="status">✅ Researched</p>
							{/if}
						</div>
						<div class="actions">
							{#if !isResearched}
								<button
									class="buy-btn"
									disabled={game.money < research.cost}
									on:click={() => buyResearch(research.id)}
								>
									<span class="action-text">Research</span>
									<span class="price-text">{formatMoney(research.cost)}</span>
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

	.research-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.research-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: border-color 0.3s;
	}

	.research-card.researched {
		border-color: #4caf50;
		opacity: 0.8;
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

	.status {
		color: #4caf50;
		font-weight: bold;
		margin-top: 0.5rem !important;
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
		.research-card {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.buy-btn {
			width: 100%;
		}
	}
</style>

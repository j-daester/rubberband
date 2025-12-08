<script lang="ts">
	import type { Game } from '../game';
	import { productionLines } from '../parameters';
	import { formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';

	export let game: Game;
	export let tick: number;

	const dispatch = createEventDispatcher();

	// Reactive trigger
	$: {
		tick;
		game = game;
	}

	function buyMachineProductionLine(machineName: string) {
		if (game.buyMachineProductionLine(machineName)) {
			dispatch('action');
		}
	}
</script>

{#if game.level >= 20}
	<section class="heavy-industry">
		<h2>Heavy Industry</h2>
		<div class="machine-list">
			{#each productionLines as line}
				{#if game.level >= line.unlock_level}
					{@const count = game.machineProductionLines[line.name] || 0}
					{@const cost = game.getMachineProductionLineCost(line.name, count)}

					<div class="industry-card">
						<div class="info">
							<h3>{line.name}</h3>
							<p>Automatically produces {line.machine}.</p>
							<p class="details">
								Production: {formatNumber(line.output)} machines/tick per line
							</p>
							<p class="owned">Owned: {formatNumber(count)}</p>
							<p class="price">Cost: ${formatNumber(cost)}</p>
						</div>
						<button
							class="buy-btn"
							disabled={game.money < cost}
							on:click={() => buyMachineProductionLine(line.name)}
						>
							Buy Line
						</button>
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

	.machine-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	.industry-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
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

	.buy-btn {
		width: 100%;
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
</style>

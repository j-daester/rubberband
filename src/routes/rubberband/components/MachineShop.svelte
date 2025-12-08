<script lang="ts">
	import type { Game } from '../game';
	import { machineTypes } from '../parameters';
	import { formatNumber } from '../utils';

	export let game: Game;
	export let tick: number;

	let buyAmount = 1;

	// Reactive declarations to keep UI in sync with game state
	$: {
		tick;
		// Trigger reactivity for machines
		game = game;
	}

	function buyMachine(machineName: string) {
		if (game.buyMachine(machineName)) {
			// We need to notify the parent or just let the tick prop handle the update cycle?
			// Since game is an object reference, modifying it works.
			// But we might need to trigger an update in the parent if the parent relies on specific properties.
			// However, the parent passes `tick` which changes every second or on action.
			// If we want immediate feedback, we might need to dispatch an event or just rely on the fact that
			// Svelte reactivity is triggered by assignment.
			// In +page.svelte, actions did `tick++`.
			// We can't easily write back to `tick` prop.
			// But we can just rely on the game object being mutated.
			// To force a re-render locally, we can have a local tick or just use the game object.
			// But to update the header stats (Money), we need the parent to update.
			// So we should probably dispatch an event "action" that the parent listens to and increments tick.
		}
	}

	// To handle the "tick++" from the parent for immediate UI updates,
	// we can accept a callback or dispatch an event.
	// For now, let's assume the parent passes a function or we dispatch.
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleBuy(machineName: string) {
		if (game.buyMachine(machineName)) {
			dispatch('action');
		}
	}
</script>

<section class="shop">
	<h2>Machine Shop</h2>
	<!-- Buy Amount Toggle could be added here if needed, but for now hardcoded to 1 in logic or we can add UI -->

	<div class="machine-list">
		{#each machineTypes as machine}
			{#if game.level >= machine.unlock_level}
				{@const owned = game.machines[machine.name] || 0}
				{@const max = game.getMaxAffordable(machine.name, game.money, owned)}
				{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
				{@const cost = game.getMachineCost(machine.name, amount, owned)}
				{@const canAfford = game.money >= cost}

				<div class="machine-card">
					<div class="machine-info">
						<h3>{machine.name}</h3>
						<p class="details">Output: {formatNumber(machine.output)}/tick</p>
						<p class="owned">Owned: {formatNumber(owned)}</p>
						<p class="price">Price: ${formatNumber(cost)}</p>
					</div>
					<button
						class="buy-btn"
						disabled={(!canAfford && buyAmount !== -1) || (buyAmount === -1 && max === 0)}
						on:click={() => handleBuy(machine.name)}
					>
						Buy {amount}
					</button>
				</div>
			{/if}
		{/each}
	</div>
</section>

<style>
	section {
		margin-bottom: 2rem;
	}

	section {
		margin-bottom: 2rem;
	}

	.machine-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}

	.machine-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.machine-info h3 {
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

<script lang="ts">
	import type { Game } from '../game';
	import { machineTypes } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

	let buyAmount = 1;

	// Reactive declarations to keep UI in sync with game state
	$: {
		tick;
		// Trigger reactivity for machines
		game = game;
	}

	function buyMachine(machineName: string) {
		if (game.buyMachine(machineName)) {
			// Logic handled below via dispatch
		}
	}

	// To handle the "tick++" from the parent for immediate UI updates,
	// we can accept a callback or dispatch an event.
	// For now, let's assume the parent passes a function or we dispatch.
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleBuy(machineName: string, amount: number = 1) {
		if (game.buyMachine(machineName, amount)) {
			dispatch('action');
		}
	}

	function handleSell(machineName: string, amount: number = 1) {
		if (game.sellMachine(machineName, amount)) {
			dispatch('action');
		}
	}

	const minUnlockLevel = Math.min(...machineTypes.map((m) => m.unlock_level));
</script>

{#if game.level >= minUnlockLevel}
	<section class="shop">
		<h2>{$t('common.machine_shop')}</h2>
		<!-- Buy Amount Toggle could be added here if needed, but for now hardcoded to 1 in logic or we can add UI -->

		<div class="machine-list">
			{#each machineTypes as machine}
				{#if game.isMachineUnlocked(machine)}
					{@const owned = game.machines[machine.name] || 0}
					{@const purchased = game.purchasedMachines[machine.name] || 0}
					{@const max = game.getMaxAffordable(machine.name, game.money, purchased)}
					{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
					{@const cost = game.getMachineCost(machine.name, amount, purchased)}
					{@const canAfford = game.money >= cost}
					{@const isBeingProduced = game.isBeingProduced(machine.name)}
					{@const isDisplayOnly = machine.allow_manual_purchase === false}
					{@const sellPrice =
						purchased > 0
							? Math.floor(0.5 * game.getMachineCost(machine.name, 1, purchased - 1))
							: 0}

					<div class="machine-card">
						<div class="machine-info">
							<h3>{$t('machines.' + machine.name)}</h3>
							<p class="details">
								{$t('common.production')}: {formatNumber(
									game.getMachineOutputPerUnit(machine.name),
									suffixes
								)}/t
							</p>
							<p class="details">
								{$t('common.maintenance')}: {formatMoney(machine.maintenance_cost, suffixes)}/t
							</p>
							<p class="owned">{$t('common.owned')}: {formatNumber(owned, suffixes)}</p>
							<p class="details">
								Total {$t('common.maintenance')}: {formatMoney(
									owned * machine.maintenance_cost,
									suffixes
								)}/t
							</p>
						</div>
						<div class="actions">
							{#if !isDisplayOnly}
								<button
									class="buy-btn"
									disabled={(!canAfford && buyAmount !== -1) ||
										(buyAmount === -1 && max === 0) ||
										isBeingProduced}
									on:click={() => handleBuy(machine.name)}
									title={isBeingProduced ? 'Cannot buy while being produced by heavy industry' : ''}
								>
									<span class="action-text">{$t('common.buy')}</span>
									<span class="price-text">{formatMoney(cost, suffixes)}</span>
								</button>
								<button
									class="buy-btn sell-btn"
									disabled={owned <= 0 || isBeingProduced}
									on:click={() => handleSell(machine.name)}
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
</style>

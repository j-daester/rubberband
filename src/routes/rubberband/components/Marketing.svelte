<script lang="ts">
	import { game } from '$lib/state/gameState.svelte';
	import * as Actions from '$lib/services/gameLoop';
	import { GAME_CONSTANTS } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t, json } from 'svelte-i18n';

	// No props needed - accessing global state

	// Helper to get suffixes (previously passed as prop)
	let suffixes = $derived($json('suffixes') as unknown as string[]);
	let money = $derived(game.money);
	let marketingLevel = $derived(game.marketingLevel);
	let marketingCost = $derived(game.marketingCost);

	const dispatch = createEventDispatcher();

	function buyMarketing() {
		if (Actions.buyMarketing()) {
			dispatch('action');
		}
	}
	let ticksSinceLastUpdate = $derived(game.tickCount - game.lastMarketingUpdateTick);
	// game.marketingDecayInterval is a getter I added to GameState
	let ticksUntilDecay = $derived(Math.max(0, game.marketingDecayInterval - ticksSinceLastUpdate));

	function tr(key: string, search: string, replace: string) {
		return ($t(key) as string).replace(search, replace);
	}
</script>

{#if game.researched.includes(GAME_CONSTANTS.MARKETING_UNLOCK_RESEARCH)}
	<section class="marketing">
		<div class="marketing-card">
			<div class="info">
				<h3>{tr('marketing_ui.campaign_title', '{level}', marketingLevel.toString())}</h3>
				<p>
					{$t('marketing_ui.desc_base')}
					{#if marketingLevel > 1 && !game.researched.includes('automated_ai_marketing')}
						{tr('marketing_ui.decays_in', '{ticks}', ticksUntilDecay.toString())}
					{/if}
					{#if game.researched.includes('automated_ai_marketing')}
						{$t('marketing_ui.no_decay')}
					{/if}
				</p>
			</div>
			<button class="buy-btn" disabled={money < marketingCost} onclick={buyMarketing}>
				<span class="action-text">{$t('marketing_ui.buy_campaign')}</span>
				<span class="price-text">{formatMoney(marketingCost, suffixes)}</span>
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
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: center;
	}

	.info {
		flex: 999 1 300px;
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
		flex: 1 1 auto;
		min-width: fit-content;
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
</style>

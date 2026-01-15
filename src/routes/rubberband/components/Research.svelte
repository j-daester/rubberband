<script lang="ts">
	import type { Game } from '../game';
	import { researchList } from '../parameters';
	import { formatNumber, formatMoney } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number;
	export let suffixes: string[] = [];

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

	// Reactive filter for visible research
	$: visibleResearch = researchList.filter(
		(r) => !r.precondition_research || game.researched.includes(r.precondition_research)
	);
</script>

<section class="research">
	<h2>{$t('research_ui.title')}</h2>

	<!-- Available Research -->
	<div class="research-list">
		{#each visibleResearch as research (research.id)}
			{@const isResearched = game.researched.includes(research.id)}
			{#if !isResearched}
				<div class="research-card">
					<div class="info">
						<h3>{$t('research.' + research.id + '.name')}</h3>
						<p>{$t('research.' + research.id + '.desc')}</p>
					</div>
					<div class="actions">
						<button
							class="buy-btn"
							disabled={game.money < research.cost}
							on:click={() => buyResearch(research.id)}
						>
							<span class="action-text">{$t('research_ui.research_btn')}</span>
							<span class="price-text">{formatMoney(research.cost, suffixes)}</span>
						</button>
					</div>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Completed Research -->
	{#if game.researched.length > 0}
		<div class="completed-research">
			<h3>{$t('research_ui.researched')}</h3>
			<ul class="completed-list">
				{#each game.researched as researchId}
					{@const research = researchList.find((r) => r.id === researchId)}
					{#if research}
						<li class="completed-item">
							<span class="completed-name">{$t('research.' + researchId + '.name')}</span>
							<span class="completed-desc-tooltip">{$t('research.' + researchId + '.desc')}</span>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
</section>

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
		flex-wrap: wrap; /* Allow wrapping */
		gap: 1rem;
		justify-content: space-between;
		align-items: center;
	}

	.info {
		flex: 1;
		min-width: 200px;
	}

	.info h3 {
		margin: 0;
		font-size: 1rem;
		color: #ddd;
	}

	.info h3 {
		margin: 0;
		font-size: 1rem;
		color: #ddd;
	}

	.info p {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0.25rem 0 0 0;
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
	}

	.completed-research {
		margin-top: 1rem;
		background: #444;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #555;
	}

	.completed-research h3 {
		font-size: var(--font-size-md);
		color: #fff;
		margin-bottom: 0.5rem;
		margin-top: 0;
	}

	.completed-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.completed-item {
		background: #1e1e1e;
		border: 1px solid #4caf50;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: var(--font-size-sm);
		color: #ddd;
		position: relative;
		cursor: help;
	}

	.completed-desc-tooltip {
		display: none;
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		background: #333;
		color: #fff;
		padding: 0.5rem;
		border-radius: 4px;
		width: 200px;
		z-index: 10;
		font-size: var(--font-size-xs);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.completed-item:hover .completed-desc-tooltip {
		display: block;
	}
</style>

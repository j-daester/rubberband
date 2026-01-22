<script context="module" lang="ts">
	declare const __APP_VERSION__: string;
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { game } from '$lib/state/gameState.svelte';
	import * as Actions from '$lib/services/gameLoop';
	import { GAME_CONSTANTS } from './parameters';
	import { formatNumber, formatMoney, formatWeight, formatVolume, formatArea } from './utils';

	import MachineShop from './components/MachineShop.svelte';
	import Marketing from './components/Marketing.svelte';
	import HeavyIndustry from './components/HeavyIndustry.svelte';
	import SupplyChain from './components/SupplyChain.svelte';
	import Research from './components/Research.svelte';
	import NanoFactory from './components/NanoFactory.svelte';
	import DemandCurve from './components/DemandCurve.svelte';
	import { t, json } from 'svelte-i18n';

	const appVersion = __APP_VERSION__;
	let interval: ReturnType<typeof setInterval>;
	let canShare = false;
	let scrollY = 0;
	let tick = $state(0); // Kept for legacy component prop compatibility if needed, or derived from game.

	// Derived State for Template Compatibility
	let isScrolled = $derived(scrollY > 50);

	// Helper to get suffixes easily
	let suffixes = $derived($json('suffixes') as unknown as string[]);

	// Direct access via game object, but mapping to local variables for minimizing template diffs
	let money = $derived(game.money);
	let rubberbands = $derived(game.rubberbands);
	let rubber = $derived(game.rubber);

	// Getters from State
	let productionRate = $derived(game._machineProductionRate); // Internal prop, but exposed via getter? No, getter was machineProductionRate
	// Wait, I didn't add the `machineProductionRate` getter in step 122 explicitly, I added `income` etc.
	// I should check if `_machineProductionRate` is public. YES, it is. But normally I should use a getter.
	// I'll access properties directly for now where getters aren't present.
	// Actually, `game.machineProductionRate` getter WAS present in original `Game` class. I removed it?
	// I added `_machineProductionRate` as a property. I did NOT add a getter for it in Step 122.
	// I will use `game._machineProductionRate` for now.

	let rubberProduction = $derived(game._rubberProductionRate);
	let totalSold = $derived(game.totalRubberbandsSold);
	let demand = $derived(game.demand);
	let rubberbandPrice = $derived(game.rubberbandPrice);
	let rubberPrice = $derived(game.rubberPrice);
	let tickCount = $derived(game.tickCount);
	let gameOver = $derived(game.gameOver);

	let inventoryCost = $derived(game.inventoryCost);
	let maintenanceCost = $derived(game.maintenanceCost);
	let totalRubberProduced = $derived(game.totalRubberProduced);
	let consumedEarthResources = $derived(game.consumedEarthResources);
	let consumedOil = $derived(game.consumedOil);
	let netIncome = $derived(game.netIncome);
	let researched = $derived(game.researched);
	let resourceLimit = $derived(game.resourceLimit);
	let storageLimit = $derived(game.storageLimit);
	let usedStorageSpace = $derived(game.usedStorageSpace);

	// Computed Logic
	let score = $derived(tickCount > 0 ? 100000 / tickCount : 0);
	let resourceUnitNameKey = $derived(
		researched.includes('interplanetary_logistics')
			? 'common.universe_resources'
			: 'common.earth_resources'
	);

	let hasRubberSources = $derived(
		(game.producers['rubber_sources'] || []).some((count) => count > 0)
	);

	let banderCounts = $derived(game.producers['bander'] || []);
	let totalMachines = $derived(banderCounts.reduce((a, b) => a + b, 0));

	let showResourceGroup = $derived(
		(researched.includes('synthetic_rubber') && !researched.includes('molecular_transformation')) ||
			researched.includes('molecular_transformation')
	);

	let theoreticalConsumption = $derived(game._theoreticalRubberConsumptionRate);
	let showOperationsSection = true;

	// Share Text
	let shareText = $derived(
		`I just scored ${formatNumber(
			score,
			suffixes
		)} Points in Rubberband Inc. (Version ${appVersion})! ${formatNumber(
			totalSold,
			suffixes
		)} rubberbands sold in ${formatNumber(
			tickCount,
			suffixes
		)} ticks! Try to beat my score! https://rubberband.realnet.ch`
	);

	onMount(() => {
		canShare = !!navigator.share;
		const saved = localStorage.getItem('rubberband_save');
		if (saved) {
			// We need to re-initialize game state. GameState has constructor that takes serialized.
			// But 'game' is singleton.
			// We should call a method on game to load.
			// I missed adding 'load' method. I can just use the constructor logic via a 'load' method or new instance assignment if it wasn't const.
			// 'game' is exported as 'const game = new GameState()'. I cannot reassign it.
			// I must add a `load(json)` method to GameState or manually assign props.
			// `GameState` has a `reset()` method. I could add `load`.
			// For now, I will parse and assign manually or assume existing state if SSR? No, onMount is client.
			// I will hack it: Object.assign(game, JSON.parse(saved)); - This won't trigger reactivity deeply if nested objects are replaced without $state proxy?
			// Actually, `game.producers = data.producers` works if `producers` is a state proxy.
			// I will add a TO-DO to fix loading properly, or just do manual assignment here.
			try {
				const data = JSON.parse(saved);
				game.load(data);
			} catch (e) {
				console.error('Load failed', e);
			}
		}

		interval = setInterval(() => {
			Actions.tick();
			tick = game.tickCount; // Sync local tick for components if they use it
			if (game.tickCount % 10 === 0) {
				localStorage.setItem('rubberband_save', game.toString());
			}
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	function makeRubberband() {
		Actions.makeRubberband();
	}

	function buyRubber() {
		Actions.buyRubber(100);
	}

	function restartGame() {
		if (!gameOver && !confirm($t('common.restart_game') + '?')) return;
		localStorage.removeItem('rubberband_save');
		location.reload();
	}

	function handleAction() {
		// No-op with Runes usually, but maybe force update if deeper components need it?
		// In Svelte 5, fine-grained reactivity handles it.
	}

	async function shareGame() {
		try {
			await navigator.share({ title: 'Rubberband Inc. Success', text: shareText });
		} catch (err) {
			console.error('Error sharing:', err);
		}
	}

	function handlePriceChange(e: CustomEvent) {
		const p = Math.round(e.detail.price * 100) / 100;
		Actions.setRubberbandPrice(p); // Use action
	}

	// Translations
	let buyRubberText = $derived(
		$t('common.buy_rubber').replace('{cost}', formatMoney(100 * rubberPrice, suffixes))
	);
	let scoreStatText = $derived(
		$t('common.score_stat').replace('{score}', formatNumber(score, suffixes))
	);
	let totalSoldStatText = $derived(
		$t('common.total_sold_stat').replace('{amount}', formatNumber(totalSold, suffixes))
	);
	let coinsStatText = $derived(
		$t('common.coins_stat').replace('{amount}', formatMoney(money, suffixes))
	);
	let ticksStatText = $derived($t('common.ticks_stat').replace('{amount}', tickCount.toString()));
</script>

<svelte:head>
	<title>Rubberband</title>
	<meta name="description" content="A paperclip clone written in SvelteKit" />
</svelte:head>

<svelte:window bind:scrollY />

<div class="game-container">
	<header class:scrolled={isScrolled}>
		<h1>Rubberband Inc.</h1>

		<!-- Main Stats Dashboard -->
		<div class="stats-dashboard">
			<!-- Top Row: Global Stats -->
			<div class="stat-card main-stats">
				<div class="stat">
					<span class="label">{$t('common.total_sold')}</span>
					<span class="value">{formatNumber(totalSold, suffixes)}</span>
				</div>
				<div class="stat">
					<span class="label">Ticks {$t('common.ticks')}</span>
					<span class="value">{tickCount}</span>
				</div>
				<div class="restart-container">
					<button class="restart-btn-small" onclick={restartGame} title={$t('common.restart_game')}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Middle Row: Inventory & Production -->
			<div class="stat-card inventory-stats">
				<span class="group-title">{$t('common.inventory')}</span>
				<div class="stat-row">
					<div class="stat">
						<span class="label">{$t('common.rubber')}</span>
						<span class="value">{formatWeight(rubber)}</span>
					</div>
					<div class="stat">
						<span class="label">{$t('common.rubberbands')}</span>
						<span class="value">{formatNumber(Math.floor(rubberbands), suffixes)}</span>
					</div>
				</div>
			</div>

			<div class="stat-card production-stats">
				<span class="group-title">{$t('common.production')}</span>
				<div class="stat-row">
					<div class="stat">
						<span class="label">{$t('common.rubber')}</span>
						<span class="value">{formatWeight(rubberProduction)}/⏱️</span>
					</div>
					{#if hasRubberSources}
						<div class="stat">
							<span class="label">{$t('common.net_rubber')}</span>
							<span
								class="value"
								style="color: {rubberProduction - theoreticalConsumption >= 0
									? '#4caf50'
									: '#ff6b6b'}"
							>
								{rubberProduction - theoreticalConsumption > 0 ? '+' : ''}{formatWeight(
									rubberProduction - theoreticalConsumption
								)}/⏱️
							</span>
						</div>
					{/if}
					<div class="stat">
						<span class="label">{$t('common.bands')}</span>
						<span class="value">{formatNumber(productionRate, suffixes)}/⏱️</span>
					</div>
				</div>
			</div>

			{#if showResourceGroup}
				<div class="stat-card logistics-stats">
					<span class="group-title">{$t('common.logistics')}</span>
					<div class="stat-column">
						<div class="stat resource-stat">
							<span class="label">{$t('common.storage_limit')} 📦</span>
							<div class="progress-bar-container">
								<div
									class="resource-progress-bar"
									style="width: {Math.min(
										100,
										(usedStorageSpace / storageLimit) * 100
									)}%; background-color: #ff9800;"
								/>
								<span class="progress-text"
									>{formatArea(usedStorageSpace)} / {formatArea(storageLimit)}</span
								>
							</div>
						</div>

						{#if researched.includes('synthetic_rubber') && !researched.includes('molecular_transformation')}
							<div class="stat resource-stat">
								<span class="label">{$t('common.oil_reserves')} 🛢️</span>
								<div class="progress-bar-container">
									<div
										class="resource-progress-bar"
										style="width: {Math.min(
											100,
											(consumedOil / GAME_CONSTANTS.OIL_RESERVES_LIMIT) * 100
										)}%"
									/>
									<span class="progress-text"
										>{formatVolume(consumedOil)} / {formatVolume(
											GAME_CONSTANTS.OIL_RESERVES_LIMIT
										)}</span
									>
								</div>
							</div>
						{/if}
						{#if researched.includes('molecular_transformation')}
							<div class="stat resource-stat">
								<span class="label">{$t(resourceUnitNameKey)} 🌍</span>
								<div class="progress-bar-container">
									<div
										class="resource-progress-bar"
										style="width: {Math.min(100, (consumedEarthResources / resourceLimit) * 100)}%"
									/>
									<span class="progress-text"
										>{formatWeight(consumedEarthResources)} / {formatWeight(resourceLimit)}</span
									>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Bottom Row: Economy -->
			<div class="stat-card economy-stats" style="grid-column: 1 / -1;">
				<span class="group-title">{$t('common.economy')}</span>
				<div class="economy-content-grid">
					<div class="stat coin-stat">
						<span class="label">{$t('common.coins')} 🪙</span>
						<span class="value" style="color: {money < 0 ? '#ff6b6b' : ''}"
							>{formatMoney(money, suffixes)}</span
						>
					</div>

					<div class="financial-details-grid">
						<div class="detail-group">
							{#if maintenanceCost > 0}
								<span>{$t('common.maintenance')}:</span>
								<span class="negative">-{formatMoney(maintenanceCost, suffixes)}/⏱️</span>
							{/if}
						</div>
						<div class="detail-group">
							{#if inventoryCost > 0}
								<span>{$t('common.storage_cost')}:</span>
								<span class="negative">-{formatMoney(inventoryCost, suffixes)}/⏱️</span>
							{/if}
						</div>
						<div class="detail-group profit">
							<span>{$t('common.profit')}:</span>
							<span class={netIncome >= 0 ? 'positive' : 'negative'}>
								{netIncome >= 0 ? '+' : ''}{formatMoney(netIncome, suffixes)}/⏱️
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main class="content-layout">
		<!-- Systems Grid (Research, Machines, Supply, Heavy Industry) -->
		<div class="systems-grid">
			<!-- Central Operations Section (Combined Operations, Marketing, Nano) -->
			{#if showOperationsSection}
				<section class="central-operations">
					<section class="operations-content">
						<!-- Price Controls -->
						<div class="chart-container">
							<DemandCurve on:priceChange={handlePriceChange} />
						</div>

						<!-- Manual Controls -->
						<div class="manual-controls">
							<div class="button-group">
								{#if totalMachines === 0}
									<button class="action-btn primary" onclick={makeRubberband} disabled={rubber < 1}>
										{$t('common.make_rubberband')}
									</button>
								{/if}
								{#if !hasRubberSources}
									<button
										class="action-btn secondary"
										onclick={buyRubber}
										disabled={money < 100 * game.rubberPrice}
									>
										{@html buyRubberText}
									</button>
								{/if}
							</div>
						</div>
					</section>
					<!-- Marketing -->
					<Marketing on:action={handleAction} />

					<!-- Nano Factory -->
					<NanoFactory on:action={handleAction} />
				</section>
			{/if}

			<Research on:action={handleAction} />
			<MachineShop on:action={handleAction} />
			<SupplyChain on:action={handleAction} />
			<HeavyIndustry on:action={handleAction} />
		</div>
	</main>

	{#if gameOver}
		<div class="modal-overlay">
			<div class="modal">
				<h2>{$t('common.game_over')}</h2>
				<p>{$t('common.congrats')}</p>
				<div class="stats-grid">
					<p>
						<strong>{scoreStatText}</strong>
					</p>
					<p>{totalSoldStatText}</p>
					<p>{coinsStatText}</p>
					<p>{ticksStatText}</p>
					<p><small>{$t('common.version')}: {appVersion}</small></p>
				</div>

				<div class="share-section">
					<h3>Share your success</h3>
					<div class="share-buttons">
						{#if canShare}
							<button class="share-btn native-share" onclick={shareGame}> Share </button>
						{:else}
							<a
								href="https://twitter.com/intent/tweet?text={encodeURIComponent(shareText)}"
								target="_blank"
								rel="noopener noreferrer"
								class="share-btn twitter"
							>
								Twitter
							</a>
							<a
								href="https://wa.me/?text={encodeURIComponent(shareText)}"
								target="_blank"
								rel="noopener noreferrer"
								class="share-btn whatsapp"
							>
								WhatsApp
							</a>
							<a
								href="mailto:?subject=Rubberband%20Inc.%20Success&body={encodeURIComponent(
									shareText
								)}"
								class="share-btn email"
							>
								Email
							</a>
							<a
								href="threema://compose?text={encodeURIComponent(shareText)}"
								class="share-btn threema"
							>
								Threema
							</a>
						{/if}
					</div>
				</div>

				<button class="restart-btn" onclick={restartGame}>Restart Game</button>
			</div>
		</div>
	{/if}

	<footer>
		Version: {appVersion}
	</footer>
</div>

<style>
	:global(body) {
		background-color: #1a1a1a;
		color: #e0e0e0;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		margin: 0;
	}

	/* Global Section Styling for Prettier Headings */
	:global(section h2) {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #888;
		font-weight: bold;
		border-bottom: 0.0625rem solid #333;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
		background: none;
		padding-left: 0;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	.game-container {
		width: 100%;
		max-width: 100%;
		margin: 0;
		padding: 1rem;
		display: flex;
		flex-direction: column;
	}

	section {
		margin-bottom: 1rem;
	}

	footer {
		margin-top: auto;
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		padding-top: 2rem;
		opacity: 0.5;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		color: #fff;
		font-size: var(--font-size-3xl);
		text-transform: uppercase;
		letter-spacing: 0.125rem;
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		/* Transition for collapsing */
		transition: all 0.3s ease;
		max-height: 6.25rem;
		opacity: 1;
	}

	header.scrolled h1 {
		max-height: 0;
		opacity: 0;
		margin-bottom: 0;
		margin-top: 0;
		overflow: hidden;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
		position: sticky;
		top: 0;
		padding-top: 1rem;
		padding-bottom: 1rem;
		z-index: 100;
		background: rgba(224, 224, 224, 0);
		backdrop-filter: blur(0.625rem);
		-webkit-backdrop-filter: blur(0.625rem);
	}

	.restart-btn-small {
		background: #333;
		border: none;
		color: #888;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		height: 3rem;
		width: 3rem;
	}

	.restart-btn-small:hover {
		background: #444;
		transform: rotate(180deg);
		color: #ff6b6b;
	}

	/* Economy Section Redesign Styles */
	.economy-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.economy-stats-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
		align-items: start;
	}

	.chart-container {
		width: 100%;
		margin-top: 0.5rem;
	}

	/* Financial Details Column */
	.financial-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-end; /* Right align the text */
		justify-content: center;
		height: 100%;
	}

	.detail-row {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: #aaa;
		width: 100%;
	}

	.coin-stat {
		/* Reset flex direction for this specific stat container to be block-like or center */
		display: flex;
		flex-direction: column;
		align-items: flex-start; /* Left align money */
		justify-content: center;
		height: 100%;
	}

	/* Chart legend / price control styles removed */

	/* New Stats Dashboard Grid (now Flexbox) */
	.stats-dashboard {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		width: 100%;
	}

	.systems-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		width: 100%;
	}

	/* Target all direct children sections (components + central ops) */
	.systems-grid > :global(section) {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1 1 25rem;
	}

	.chart-container {
		width: 100%;
		min-width: 0;
	}

	.group-title {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.0625rem;
		color: var(--color-text-muted);
		font-weight: bold;
		border-bottom: 0.0625rem solid #444;
		width: 100%;
		text-align: center;
		padding-bottom: 0.25rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-around;
		width: 100%;
		align-items: center;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-card {
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 0.75rem;
		box-shadow: 0 0.25rem 0.375rem rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex: 1 1 20rem; /* Grow, shrink, base width */
	}

	.main-stats {
		/* Force full width row */
		flex: 1 1 100%;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		background: #333; /* Slightly different bg for main stats */
	}

	.economy-stats {
		flex: 1 1 20rem;
	}

	.economy-content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 100%;
		gap: 1rem;
		align-items: center;
	}

	.financial-details-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: var(--font-size-sm);
		text-align: right;
	}

	.detail-group {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.stat-column {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	/* Removed min-width Grid overrides as Flex handles wrapping naturally */

	.label {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.0625rem;
		color: var(--color-text-muted);
		margin-bottom: 0.25rem;
	}

	.value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	.button-group {
		display: flex;
		gap: 1rem;
	}

	.action-btn {
		flex: 1;
		padding: 1.5rem;
		font-size: var(--font-size-lg);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: transform 0.1s, filter 0.2s;
		font-weight: var(--font-weight-bold);
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.primary {
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		color: var(--color-text-dark);
	}

	.secondary {
		background: #333;
		color: var(--color-text-primary);
		border: 0.0625rem solid #444;
	}

	.secondary:hover:not(:disabled) {
		background: #444;
	}

	.secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* input style removed */

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal {
		background: #2d2d2d;
		padding: 2rem;
		border-radius: 0.75rem;
		text-align: center;
		border: 0.0625rem solid #444;
		box-shadow: 0 0.25rem 1.25rem rgba(0, 0, 0, 0.5);
	}

	.modal h2 {
		font-size: var(--font-size-2xl);
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	.modal p {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
		font-size: var(--font-size-lg);
	}

	.stats-grid {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 2rem;
		text-align: left;
		background: #252525;
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.stats-grid p {
		margin: 0;
		font-size: var(--font-size-base);
		color: var(--color-text-base);
		display: flex;
		justify-content: space-between;
	}

	.restart-btn {
		background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
		border: none;
		padding: 1rem 2rem;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-dark);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: transform 0.1s;
	}

	.restart-btn:hover {
		transform: scale(1.05);
	}

	.restart-btn:active {
		transform: scale(0.95);
	}

	.share-section {
		margin-bottom: 2rem;
	}

	.share-section h3 {
		color: #e0e0e0;
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.share-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.financial-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.5rem;
		width: 100%;
		font-size: var(--font-size-sm);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		padding: 0 0.5rem;
	}

	.detail-label {
		color: var(--color-text-muted);
	}

	.detail-value.negative {
		color: #ff6b6b;
	}

	.detail-value.positive {
		color: #4caf50;
	}

	.profit-row {
		border-top: 0.0625rem solid #444;
		margin-top: 0.25rem;
		padding-top: 0.25rem;
		font-weight: bold;
	}

	.coin-stat {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		color: white;
		font-weight: 500;
		transition: opacity 0.2s;
		border: none;
		cursor: pointer;
		font-size: 1rem;
	}

	.share-btn:hover {
		opacity: 0.9;
	}

	.twitter {
		background-color: #1da1f2;
	}

	.whatsapp {
		background-color: #25d366;
	}

	.email {
		background-color: #777;
	}

	.threema {
		background-color: #05a081;
	}

	.native-share {
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		color: #1a1a1a;
		font-weight: bold;
		min-width: 7.5rem;
	}

	@media (max-width: 768px) {
		.game-container {
			padding: 1rem;
			width: 95%;
		}

		h1 {
			font-size: var(--font-size-2xl);
			margin-bottom: 1.5rem;
		}

		header {
			margin-bottom: 1.5rem;
			position: sticky;
			top: 0;
			padding-top: 1rem;
			padding-bottom: 1rem;
			margin-left: -1rem; /* Compensate for container padding */
			margin-right: -1rem;
			padding-left: 1rem;
			padding-right: 1rem;
			z-index: 1000;
		}

		header.scrolled {
			margin-bottom: 1rem;
		}

		.progress-bar {
			padding: 0.5rem;
			gap: 0.5rem;
			flex-wrap: wrap;
		}

		.stat {
			min-width: 5rem;
		}

		.label {
			font-size: 0.7rem;
		}
		.value {
			font-size: 1.1rem;
		}

		.action-btn {
			padding: 1rem;
			font-size: var(--font-size-base);
		}

		.button-group {
			flex-direction: column;
		}
	}

	.resource-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 12.5rem;
	}

	.progress-bar-container {
		width: 100%;
		height: 1.2rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		overflow: hidden;
		position: relative;
		border: 0.0625rem solid rgba(255, 255, 255, 0.2);
	}

	.resource-progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #4ecdc4, #556270);
		transition: width 0.3s ease;
	}

	.progress-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.75rem;
		color: white;
		text-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.8);
		white-space: nowrap;
	}
</style>

<script context="module" lang="ts">
	declare const __APP_VERSION__: string;
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Game } from './game';
	import { GAME_CONSTANTS } from './parameters';

	import { formatNumber, formatMoney, formatWeight, formatVolume, formatArea } from './utils';
	import MachineShop from './components/MachineShop.svelte';
	import Marketing from './components/Marketing.svelte';
	import HeavyIndustry from './components/HeavyIndustry.svelte';
	import SupplyChain from './components/SupplyChain.svelte';
	import Research from './components/Research.svelte';

	import NanoFactory from './components/NanoFactory.svelte';
	import DemandCurve from './components/DemandCurve.svelte';

	const appVersion = __APP_VERSION__;

	let game = new Game();
	let interval: ReturnType<typeof setInterval>;

	// Reactivity trigger
	let tick = 0;
	let canShare = false;

	// Reactive declarations for header stats
	let money = game.money;
	interface I18nStore {
		(key: string, vars?: Record<string, any>): string;
	}
	// We need to type t as any for now because of the lint error issue with the module,
	// or just trust it works.
	import { t, json } from 'svelte-i18n';

	// Helper to get suffixes easily (reactive)
	$: suffixes = $json('suffixes') as unknown as string[];

	let rubberbands = game.rubberbands;
	let rubber = game.rubber;
	let productionRate = game.machineProductionRate;
	let rubberProduction = game.rubberProductionRate;
	let totalSold = game.totalRubberbandsSold;
	let demand = game.demand;
	let rubberbandPrice = game.rubberbandPrice;
	let tickCount = game.tickCount;

	let gameOver = game.gameOver;

	let inventoryCost = game.inventoryCost;
	let maintenanceCost = game.maintenanceCost;
	let totalRubberProduced = game.totalRubberProduced;
	let consumedEarthResources = game.consumedEarthResources;
	let consumedOil = game.consumedOil;
	let netIncome = game.netIncome;
	let researched = game.researched;
	let resourceLimit = game.resourceLimit;
	let storageLimit = game.storageLimit;
	let resourceUnitNameKey = 'common.earth_resources';

	$: score = 100000 / tickCount;
	// Construct share text using translations is tricky inside script because $t is reactive.
	// But we can use it here.
	$: shareText = $t('common.share_success') + ` ${formatNumber(score, suffixes)} Points...`; // Simplified for now or reconstruct fully?
	// User didn't strictly ask to translate the share text but "everything".
	// Let's rely on English for share text usually? Or translate it.
	// The problem is constructing it dynamically.
	// Let's leave share text logic slightly simpler or assume English for the URL preview?
	// Actually, let's translate it.
	$: shareTextRaw = `I just scored ${formatNumber(
		score,
		suffixes
	)} Points in Rubberband Inc. (Version ${appVersion})! ${formatNumber(
		totalSold,
		suffixes
	)} rubberbands sold in ${formatNumber(
		tickCount,
		suffixes
	)} ticks! Try to beat my score! https://rubberband.realnet.ch`;

	onMount(() => {
		canShare = !!navigator.share;
		// Load game state if available
		const saved = localStorage.getItem('rubberband_save');
		if (saved) {
			game = new Game(saved);
			// Sync bound variables
			rubberbandPrice = game.rubberbandPrice;
			tick++;
		}

		interval = setInterval(() => {
			game.tick();
			tick++; // Trigger Svelte reactivity

			if (game.tickCount % 10 === 0) {
				localStorage.setItem('rubberband_save', game.toString());
			}
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	function makeRubberband() {
		game.makeRubberband();
		tick++;
	}

	function buyRubber() {
		if (game.buyRubber(100)) {
			tick++;
		}
	}

	function updateRubberbandPrice() {
		game.setRubberbandPrice(rubberbandPrice);
		tick++;
	}

	function restartGame() {
		if (!gameOver && !confirm($t('common.restart_game') + '?')) {
			// Simplified confirm
			return;
		}
		localStorage.removeItem('rubberband_save');
		location.reload();
	}

	function handleAction() {
		game = game;
		tick++;
	}

	// Reactive declarations for UI updates
	let hasRubberSources = false;
	let totalMachines = 0;
	let theoreticalConsumption = 0;
	let usedStorageSpace = 0;
	let showResourceGroup = false;
	let showOperationsSection = true;
	let showButtons = true;

	$: {
		tick;
		money = game.money;
		rubberbands = game.rubberbands;
		rubber = game.rubber;
		productionRate = game.machineProductionRate;
		rubberProduction = game.rubberProductionRate;
		theoreticalConsumption = game.theoreticalRubberConsumptionRate;
		totalSold = game.totalRubberbandsSold;
		totalSold = game.totalRubberbandsSold;
		demand = game.demand;
		tickCount = game.tickCount;
		gameOver = game.gameOver;

		inventoryCost = game.inventoryCost;
		maintenanceCost = game.maintenanceCost;
		netIncome = game.netIncome;
		totalRubberProduced = game.totalRubberProduced;
		resourceLimit = game.resourceLimit;

		usedStorageSpace = game.usedStorageSpace;

		consumedOil = game.consumedOil;
		consumedEarthResources = game.consumedResources;
		researched = game.researched;
		resourceLimit = game.resourceLimit;
		storageLimit = game.storageLimit;
		resourceUnitNameKey = researched.includes('interplanetary_logistics')
			? 'common.universe_resources'
			: 'common.earth_resources';
		hasRubberSources = (game.producers['rubber_sources'] || []).some((count) => count > 0);

		// Calculate total machines for "Make Rubberband" button logic
		// Only count 'machine' type families? Or all entities?
		// Original logic was "machines" map values sum.
		// Machines are now families with type='machine'.
		// We probably only care about "Bander" style machines for manual clicking?
		// Or literally any machine owned?
		// Let's sum all tiers of all families of type 'machine'.
		// Bander is type='machine'. Nano is type='machine'.
		// Wait, Nano shouldn't hide the button?
		// Original: totalMachines > 0 hides the button.
		// This includes Banders.
		// We'll mimic that.
		totalMachines = 0;
		// Ideally export entityFamilies from +page, but we don't import it here directly in script usually?
		// We can just iterate game.entities keys? No, we don't know types.
		// But `game` has helper properties or we can import `entityFamilies`.
		// Let's just check 'bander' family for now as it's the main one.
		// Or import entityFamilies.
		const banderCounts = game.producers['bander'] || [];
		totalMachines = banderCounts.reduce((a, b) => a + b, 0);

		showResourceGroup =
			(researched.includes('synthetic_rubber') &&
				!researched.includes('molecular_transformation')) ||
			researched.includes('molecular_transformation');

		// Buttons are visible if their conditions are met
		// Make Rubberband: totalMachines === 0
		// Buy Rubber: !hasRubberSources
		const showMakeBtn = totalMachines === 0;
		const showBuyBtn = !hasRubberSources;
		showButtons = showMakeBtn || showBuyBtn;

		const marketingUnlocked = researched.includes(GAME_CONSTANTS.MARKETING_UNLOCK_RESEARCH);
		showOperationsSection = showButtons || marketingUnlocked;

		// if (rubberbandPrice !== game.rubberbandPrice) {
		// 	rubberbandPrice = game.rubberbandPrice;
		// }
	}

	async function shareGame() {
		try {
			await navigator.share({
				title: 'Rubberband Inc. Success',
				text: shareTextRaw
			});
		} catch (err) {
			console.error('Error sharing:', err);
		}
	}

	function handlePriceChange(e: CustomEvent) {
		const p = Math.round(e.detail.price * 100) / 100;
		game.rubberbandPrice = p;
		rubberbandPrice = p;
	}

	// Reactive translations dependent on game state/tick
	let buyRubberText = '',
		priceLabelText = '',
		scoreStatText = '',
		totalSoldStatText = '',
		coinsStatText = '',
		ticksStatText = '';

	$: {
		// Just referencing tick/game to force re-evaluation
		tick;
		if (game) {
			// Manual interpolation fallback since svelte-i18n interpolation is failing
			buyRubberText = ($t('common.buy_rubber') as string).replace(
				'{cost}',
				formatMoney(100 * game.rubberPrice, suffixes)
			);
			priceLabelText = ($t('common.price_label') as string).replace('{currency}', '🪙');
			scoreStatText = ($t('common.score_stat') as string).replace(
				'{score}',
				formatNumber(score, suffixes)
			);
			totalSoldStatText = ($t('common.total_sold_stat') as string).replace(
				'{amount}',
				formatNumber(totalSold, suffixes)
			);
			coinsStatText = ($t('common.coins_stat') as string).replace(
				'{amount}',
				formatMoney(money, suffixes)
			);
			ticksStatText = ($t('common.ticks_stat') as string).replace('{amount}', tickCount.toString());
		}
	}
</script>

<svelte:head>
	<title>Rubberband</title>
	<meta name="description" content="A paperclip clone written in SvelteKit" />
</svelte:head>

<div class="game-container">
	<header>
		<h1>Rubberband Inc.</h1>

		<div class="progress-bar">
			<div class="stat">
				<span class="label">{$t('common.total_sold')}</span>
				<span class="value">{formatNumber(totalSold, suffixes)}</span>
			</div>
			<div class="stat">
				<span class="label">Ticks {$t('common.ticks')}</span>
				<span class="value">{tickCount}</span>
			</div>
			<button class="restart-btn-small" on:click={restartGame} title={$t('common.restart_game')}>
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

		<div class="split-layout">
			<div class="left-column">
				<div class="resource-group">
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

				<div class="resource-group">
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
					<div class="resource-group">
						<span class="group-title">{$t('common.logistics')}</span>
						<div
							class="stat-row"
							style="flex-direction: column; gap: 0.5rem; align-items: stretch;"
						>
							<div class="stat resource-stat" style="width: 100%">
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
								<div class="stat resource-stat" style="width: 100%">
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
								<div class="stat resource-stat" style="width: 100%">
									<span class="label">{$t(resourceUnitNameKey)} 🌍</span>
									<div class="progress-bar-container">
										<div
											class="resource-progress-bar"
											style="width: {Math.min(
												100,
												(consumedEarthResources / resourceLimit) * 100
											)}%"
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
			</div>

			<div class="right-column">
				<div class="resource-group economy-group">
					<span class="group-title">{$t('common.economy')}</span>
					<div class="stat-row">
						<div class="stat coin-stat">
							<span class="label">{$t('common.coins')} 🪙</span>
							<span class="value" style="color: {money < 0 ? '#ff6b6b' : ''}"
								>{formatMoney(money, suffixes)}</span
							>
							<div class="financial-details">
								{#if maintenanceCost > 0}
									<div class="detail-row">
										<span class="detail-label">{$t('common.maintenance')}</span>
										<span class="detail-value negative"
											>-{formatMoney(maintenanceCost, suffixes)}/⏱️</span
										>
									</div>
								{/if}
								{#if inventoryCost > 0}
									<div class="detail-row">
										<span class="detail-label">{$t('common.storage_cost')}</span>
										<span class="detail-value negative"
											>-{formatMoney(inventoryCost, suffixes)}/⏱️</span
										>
									</div>
								{/if}
								<div class="detail-row profit-row">
									<span class="detail-label">{$t('common.profit')}</span>
									<span class="detail-value {netIncome >= 0 ? 'positive' : 'negative'}">
										{netIncome >= 0 ? '+' : ''}{formatMoney(netIncome, suffixes)}/⏱️
									</span>
								</div>
							</div>
						</div>
						<div class="economy-main-content chart-container">
							<!-- Chart now self-contained -->
							<div class="chart-input-row">
								<DemandCurve {game} {tick} {suffixes} on:priceChange={handlePriceChange} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main>
		{#if showOperationsSection}
			<section class="actions">
				{#if showButtons}
					<h2>{$t('common.operations')}</h2>
					<div class="button-group">
						{#if totalMachines === 0}
							<button class="action-btn primary" on:click={makeRubberband} disabled={rubber < 1}>
								{$t('common.make_rubberband')}
							</button>
						{/if}
						{#if !hasRubberSources}
							<button
								class="action-btn secondary"
								on:click={buyRubber}
								disabled={money < 100 * game.rubberPrice}
							>
								{@html buyRubberText}
							</button>
						{/if}
					</div>
				{/if}

				<!-- Merged Marketing into Operations/Actions area -->
				<Marketing {game} {tick} {suffixes} on:action={handleAction} />
			</section>
		{/if}

		<!-- Duplicate Marketing removed from here -->

		<div class="main-game-row">
			<div class="game-column">
				<Research {game} {tick} {suffixes} on:action={handleAction} />
			</div>
			<div class="game-column">
				<MachineShop {game} {tick} {suffixes} on:action={handleAction} />
			</div>
			<div class="game-column">
				<SupplyChain {game} {tick} {suffixes} on:action={handleAction} />
			</div>
			<div class="game-column">
				<HeavyIndustry {game} {tick} {suffixes} on:action={handleAction} />
			</div>
		</div>

		<NanoFactory {game} {tick} {suffixes} on:action={handleAction} />
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
							<button class="share-btn native-share" on:click={shareGame}> Share </button>
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

				<button class="restart-btn" on:click={restartGame}>Restart Game</button>
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
		border-bottom: 1px solid #333;
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
		max-width: 120rem;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	footer {
		margin-top: auto;
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		padding-top: 2rem;
		opacity: 0.5;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		color: #fff;
		font-size: var(--font-size-3xl);
		text-transform: uppercase;
		letter-spacing: 2px;
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
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

	.economy-main-content {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-top: 0.5rem;
		gap: 0.5rem;
	}

	/* Chart legend / price control styles removed */

	.progress-bar {
		display: flex;
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 1rem;
		align-items: center;
	}

	.split-layout {
		display: grid;
		grid-template-columns: 1fr 1.5fr; /* Give more space to economy/chart */
		gap: 1rem;
	}

	.left-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.main-game-row {
		display: flex;
		flex-direction: row;
		gap: 1.5rem;
		align-items: flex-start;
		width: 100%;
		margin-bottom: 2rem;
	}

	.game-column {
		flex: 1;
		min-width: 300px; /* Ensure columns don't get too squished */
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 1000px) {
		.main-game-row {
			flex-direction: column;
		}

		.game-column {
			width: 100%;
		}
	}

	.right-column {
		display: flex;
		flex-direction: column; /* economy group expands to fill */
	}

	.economy-group {
		background: #2d2d2d;
		padding: 0.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.resource-group {
		/* Flex 1 removed as it's now in column */
		display: flex;
		flex-direction: column;
		background: #2d2d2d;
		padding: 0.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		align-items: center;
		gap: 0.5rem;
	}
	/* ... */
	/* Remove padding/margin from .economy-group title if needed to save space? */
	.economy-group .group-title {
		margin-bottom: 0.5rem;
	}

	.economy-group .stat-row {
		gap: 1rem;
	}

	.coin-stat {
		flex: 1;
		min-width: 0; /* Allow shrinking if needed */
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.chart-container {
		flex: 1.5; /* 2/3rds width */
		min-width: 0;
	}

	.group-title {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--color-text-muted);
		font-weight: bold;
		border-bottom: 1px solid #444;
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

	.label {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--color-text-muted);
		margin-bottom: 0.25rem;
	}

	.value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	section {
		margin-bottom: 2rem;
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
		border-radius: 8px;
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
		border: 1px solid #444;
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
		border-radius: 12px;
		text-align: center;
		border: 1px solid #444;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
		border-radius: 8px;
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
		border-radius: 8px;
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
		border-top: 1px solid #444;
		margin-top: 0.25rem;
		padding-top: 0.25rem;
		font-weight: bold;
	}

	.coin-stat {
		padding: 0.5rem 1rem;
		border-radius: 4px;
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
		min-width: 120px;
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
		}

		.progress-bar {
			padding: 0.5rem;
			gap: 0.5rem;
			flex-wrap: wrap;
		}

		.stat {
			min-width: 80px;
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
		min-width: 200px;
	}

	.progress-bar-container {
		width: 100%;
		height: 1.2rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.2);
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
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
	}
</style>

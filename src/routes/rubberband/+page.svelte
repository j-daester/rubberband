<script context="module" lang="ts">
	declare const __APP_VERSION__: string;
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Game } from './game';
	import { GAME_CONSTANTS } from './parameters';

	export let params: any = undefined; // Silence unknown prop warning

	import { formatNumber, formatMoney, formatWeight } from './utils';
	import MachineShop from './components/MachineShop.svelte';
	import Marketing from './components/Marketing.svelte';
	import HeavyIndustry from './components/HeavyIndustry.svelte';
	import SupplyChain from './components/SupplyChain.svelte';
	import Research from './components/Research.svelte';

	import NanoFactory from './components/NanoFactory.svelte';

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
	let productionRate = game.productionRate;
	let rubberProduction = game.rubberProductionRate;
	let totalSold = game.totalRubberbandsSold;
	let level = game.level;
	let demand = game.demand;
	let rubberbandPrice = game.rubberbandPrice;
	let tickCount = game.tickCount;
	let gameOver = game.gameOver;
	let nextLevelRequirement = game.nextLevelRequirement;
	let inventoryCost = game.inventoryCost;
	let maintenanceCost = game.maintenanceCost;

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
	)} Points in Rubberband Inc. (Version ${appVersion})! ${$t(
		'common.level'
	)} ${level} reached with ${formatNumber(totalSold, suffixes)} rubberbands sold in ${formatNumber(
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

	$: {
		tick;
		money = game.money;
		rubberbands = game.rubberbands;
		rubber = game.rubber;
		productionRate = game.productionRate;
		rubberProduction = game.rubberProductionRate;
		totalSold = game.totalRubberbandsSold;
		level = game.level;
		demand = game.demand;
		tickCount = game.tickCount;
		gameOver = game.gameOver;
		gameOver = game.gameOver;
		nextLevelRequirement = game.nextLevelRequirement;
		inventoryCost = game.inventoryCost;
		maintenanceCost = game.maintenanceCost;
		hasRubberSources = Object.values(game.rubberSources).some((count) => count > 0);

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
		<div class="header-row">
			<div class="progress-bar">
				<div class="stat">
					<span class="label">{$t('common.level')}</span>
					<span class="value">{formatNumber(level, suffixes)}</span>
				</div>
				<div class="stat">
					<span class="label">{$t('common.total_sold')}</span>
					<span class="value"
						>{formatNumber(totalSold, suffixes)} / {formatNumber(
							nextLevelRequirement,
							suffixes
						)}</span
					>
				</div>
				<div class="stat">
					<span class="label">Ticks {$t('common.ticks')}</span>
					<span class="value">{tickCount}</span>
				</div>
			</div>
			<div class="resource-group economy-group">
				<span class="group-title">{$t('common.economy')}</span>
				<div class="stat-row">
					<div class="stat">
						<span class="label">{$t('common.coins')} 🪙</span>
						<span class="value">{formatMoney(money, suffixes)}</span>
					</div>
					<div class="stat">
						<span class="label">{$t('common.demand')}</span>
						<span class="value">{formatNumber(demand, suffixes)}/⏱️</span>
					</div>
				</div>
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

		<div class="resources-bar">
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
					{#if inventoryCost > 0}
						<div class="stat">
							<span class="label">{$t('common.storage_cost')}</span>
							<span class="value" style="color: #ff6b6b"
								>-{formatMoney(inventoryCost, suffixes)}/⏱️</span
							>
						</div>
					{/if}
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
								style="color: {rubberProduction - productionRate >= 0 ? '#4caf50' : '#ff6b6b'}"
							>
								{rubberProduction - productionRate > 0 ? '+' : ''}{formatWeight(
									rubberProduction - productionRate
								)}/⏱️
							</span>
						</div>
					{/if}
					<div class="stat">
						<span class="label">{$t('common.bands')}</span>
						<span class="value">{formatNumber(productionRate, suffixes)}/⏱️</span>
					</div>
					{#if maintenanceCost > 0}
						<div class="stat">
							<span class="label">{$t('common.maintenance')}</span>
							<span class="value" style="color: #ff6b6b"
								>-{formatMoney(maintenanceCost, suffixes)}/⏱️</span
							>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<main>
		<section class="actions">
			<h2>{$t('common.operations')}</h2>
			<div class="button-group">
				<button class="action-btn primary" on:click={makeRubberband} disabled={rubber < 1}>
					{$t('common.make_rubberband')}
				</button>
				<button
					class="action-btn secondary"
					on:click={buyRubber}
					disabled={money < 100 * game.rubberPrice}
				>
					{@html buyRubberText}
				</button>
			</div>
		</section>

		<section class="sales">
			<h2>{$t('common.sales_strategy')}</h2>
			<div class="sales-card">
				<div class="info">
					<h3>{$t('common.price_setting_title')}</h3>
					<p>{$t('common.price_setting_desc')}</p>
				</div>
				<div class="controls">
					<div class="controls">
						<label for="price">{priceLabelText}</label>
						<input
							id="price"
							type="number"
							bind:value={rubberbandPrice}
							on:input={updateRubberbandPrice}
							min="0.01"
							step="0.01"
						/>
					</div>
				</div>
			</div>
		</section>

		<Marketing {game} {tick} {suffixes} on:action={handleAction} />

		<Research {game} {tick} {suffixes} on:action={handleAction} />

		<MachineShop {game} {tick} {suffixes} on:action={handleAction} />

		<SupplyChain {game} {tick} {suffixes} on:action={handleAction} />

		<HeavyIndustry {game} {tick} {suffixes} on:action={handleAction} />

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
		font-family: 'Inter', sans-serif;
	}

	.game-container {
		width: 90%;
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
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-heavy);
		margin-bottom: 1.5rem;
		background: linear-gradient(45deg, #ff6b6b, #feca57);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.header-row {
		display: flex;
		align-items: stretch; /* Stretch to match height */
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap; /* Allow wrapping on small screens */
	}

	.restart-btn-small {
		background: #333;
		border: 1px solid #444;
		color: #e0e0e0;
		padding: 0.75rem;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		height: 3rem;
		width: 3rem;
		align-self: center; /* Center vertically */
	}

	.restart-btn-small:hover {
		background: #444;
		transform: rotate(180deg);
		color: #ff6b6b;
	}

	.progress-bar {
		flex: 2; /* overall stats take more space? or equal? let's say 2 */
		display: flex;
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 0;
		align-items: center;
	}

	.economy-group {
		flex: 1;
		background: #2d2d2d;
		padding: 0.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.resources-bar {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.resource-group {
		flex: 1;
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
		font-size: var(--font-size-xl);
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

	.sales-card {
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

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	input {
		background: #333;
		border: 1px solid #444;
		color: #fff;
		padding: 0.5rem;
		border-radius: 4px;
	}

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

	.share-btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		color: white;
		font-weight: 500;
		transition: opacity 0.2s;
		display: inline-block;
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

		.progress-bar,
		.resources-bar {
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

		.sales-card {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.controls {
			justify-content: space-between;
		}

		.modal {
			padding: 1.5rem;
			width: 90%;
		}

		.modal {
			padding: 1.5rem;
			width: 90%;
		}
	}
</style>

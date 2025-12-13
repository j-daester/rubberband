<script context="module" lang="ts">
	declare const __APP_VERSION__: string;
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Game } from './game';
	import { GAME_CONSTANTS } from './parameters';
	import { formatNumber } from './utils';
	import MachineShop from './components/MachineShop.svelte';
	import Marketing from './components/Marketing.svelte';
	import HeavyIndustry from './components/HeavyIndustry.svelte';
	import SupplyChain from './components/SupplyChain.svelte';

	const appVersion = __APP_VERSION__;

	let game = new Game();
	let interval: ReturnType<typeof setInterval>;

	// Reactivity trigger
	let tick = 0;

	// Reactive variables for header stats
	let money = game.money;
	let rubberbands = game.rubberbands;
	let rubber = game.rubber;
	let productionRate = game.productionRate;
	let rubberProduction = game.plantationProductionRate;
	let totalSold = game.totalRubberbandsSold;
	let level = game.level;
	let demand = game.demand;
	let rubberbandPrice = game.rubberbandPrice;
	let tickCount = game.tickCount;
	let gameOver = game.gameOver;
	let nextLevelRequirement = game.nextLevelRequirement;

	$: score = 100000 / tickCount;
	$: shareText = `I just scored ${formatNumber(
		score
	)} Points in Rubberband Inc.! Level ${level} reached with ${formatNumber(
		totalSold
	)} rubberbands sold in ${formatNumber(
		tickCount
	)} ticks! Try to beat my score! https://rubberband.realnet.ch`;

	onMount(() => {
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
		if (!gameOver && !confirm('Are you sure you want to restart? All progress will be lost.')) {
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
	$: {
		tick;
		money = game.money;
		rubberbands = game.rubberbands;
		rubber = game.rubber;
		productionRate = game.productionRate;
		rubberProduction = game.plantationProductionRate;
		totalSold = game.totalRubberbandsSold;
		level = game.level;
		demand = game.demand;
		tickCount = game.tickCount;
		gameOver = game.gameOver;
		nextLevelRequirement = game.nextLevelRequirement;

		// Ensure price is synced if game updates it (unlikely but good practice)
		// if (rubberbandPrice !== game.rubberbandPrice) {
		// 	rubberbandPrice = game.rubberbandPrice;
		// }
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
					<span class="label">Level</span>
					<span class="value">{formatNumber(level)}</span>
				</div>
				<div class="stat">
					<span class="label">Total Sold</span>
					<span class="value">{formatNumber(totalSold)} / {formatNumber(nextLevelRequirement)}</span
					>
				</div>
				<div class="stat">
					<span class="label">Ticks</span>
					<span class="value">{formatNumber(tickCount)}</span>
				</div>
			</div>
			<button class="restart-btn-small" on:click={restartGame} title="Restart Game">
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
				<div class="stat">
					<span class="label">Money</span>
					<span class="value">${formatNumber(money)}</span>
				</div>
			</div>

			<div class="resource-group">
				<div class="stat">
					<span class="label">Rubber</span>
					<span class="value">{formatNumber(Math.floor(rubber))}</span>
				</div>
				<div class="stat">
					<span class="label">Prod</span>
					<span class="value">{formatNumber(rubberProduction)} / tick</span>
				</div>
			</div>

			<div class="resource-group">
				<div class="stat">
					<span class="label">Bands</span>
					<span class="value">{formatNumber(Math.floor(rubberbands))}</span>
				</div>
				<div class="stat">
					<span class="label">Prod</span>
					<span class="value">{formatNumber(productionRate)} / tick</span>
				</div>
				<div class="stat">
					<span class="label">Demand</span>
					<span class="value">{formatNumber(demand)} / tick</span>
				</div>
			</div>
		</div>
	</header>

	<main>
		<section class="actions">
			<h2>Operations</h2>
			<div class="button-group">
				<button class="action-btn primary" on:click={makeRubberband} disabled={rubber < 1}>
					Make Rubberband
				</button>
				<button
					class="action-btn secondary"
					on:click={buyRubber}
					disabled={money < 100 * game.rubberPrice}
				>
					Buy Rubber (100 for ${formatNumber(100 * game.rubberPrice)})
				</button>
			</div>
		</section>

		<section class="sales">
			<h2>Sales Strategy</h2>
			<div class="sales-card">
				<div class="info">
					<h3>Price Setting</h3>
					<p>Lower price increases demand.</p>
				</div>
				<div class="controls">
					<label for="price">Price per Rubberband ($):</label>
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
		</section>

		<Marketing {game} {tick} on:action={handleAction} />

		<MachineShop {game} {tick} on:action={handleAction} />

		<SupplyChain {game} {tick} on:action={handleAction} />

		<HeavyIndustry {game} {tick} on:action={handleAction} />
	</main>

	{#if gameOver}
		<div class="modal-overlay">
			<div class="modal">
				<h2>Game Over</h2>
				<p>Congratulations! You have reached level 100 and beaten the game.</p>
				<div class="stats-grid">
					<p>SCORE: {formatNumber(score)}</p>
					<p>Total Rubberbands Sold: {formatNumber(totalSold)}</p>
					<p>Money: ${formatNumber(money)}</p>
					<p>Ticks: {formatNumber(tickCount)}</p>
				</div>

				<div class="share-section">
					<h3>Share your success</h3>
					<div class="share-buttons">
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
					</div>
				</div>

				<button class="restart-btn" on:click={restartGame}>Restart Game</button>
			</div>
		</div>
	{/if}

	<footer>
		v{appVersion}
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
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
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
	}

	.restart-btn-small:hover {
		background: #444;
		transform: rotate(180deg);
		color: #ff6b6b;
	}

	.progress-bar {
		flex: 1;
		display: flex;
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 0;
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
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.2s;
		display: inline-block;
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

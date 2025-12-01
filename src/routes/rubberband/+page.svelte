<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Game } from './game';
	import { machine_types, production_lines, GAME_CONSTANTS } from './parameters';
	import { formatNumber } from './utils';

	let game = new Game();
	let interval: ReturnType<typeof setInterval>;

	// Reactivity trigger
	let tick = 0;
	let buyAmount = 1;

	let money = game.money;
	let rubberbands = game.rubberbands;
	let rubber = game.rubber;
	let productionRate = game.productionRate;
	let machines = game.machines;
	let totalSold = game.totalRubberbandsSold;
	let level = game.level;
	let buyerHired = game.buyerHired;
	let buyerThreshold = game.buyerThreshold;
	let rubberPrice = game.rubberPrice;
	let marketingLevel = game.marketingLevel;
	let demand = game.demand;
	let marketingCost = game.marketingCost;
	let rubberbandPrice = game.rubberbandPrice;
	let tickCount = game.tickCount;
	let machineProductionLines = game.machineProductionLines;
	let gameOver = game.gameOver;

	onMount(() => {
		// Load game state if available
		const saved = localStorage.getItem('rubberband_save');
		if (saved) {
			game = new Game(saved);
			// Sync bound variables
			rubberbandPrice = game.rubberbandPrice;
			buyerThreshold = game.buyerThreshold;
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

	function sellRubberbands() {
		// Sell all for now, or chunks
		const amount = game.rubberbands;
		if (amount > 0) {
			game.sellRubberbands(amount);
			tick++;
		}
	}

	function buyMachine(machineName: string) {
		if (game.buyMachine(machineName)) {
			tick++;
		}
	}

	function buyRubber() {
		if (game.buyRubber(100)) {
			tick++;
		}
	}

	function hireBuyer() {
		if (game.hireBuyer()) {
			tick++;
		}
	}

	function updateBuyerThreshold() {
		game.setBuyerThreshold(buyerThreshold);
		tick++;
	}

	function buyMarketing() {
		if (game.buyMarketing()) {
			tick++;
		}
	}

	function updateRubberbandPrice() {
		game.setRubberbandPrice(rubberbandPrice);
		tick++;
	}

	function buyMachineProductionLine(machineName: string) {
		if (game.buyMachineProductionLine(machineName)) {
			tick++;
		}
	}

	function getCost(machine: (typeof machine_types)[0]) {
		const count = game.machines[machine.name] || 0;
		return Math.floor(machine.initial_cost * Math.pow(machine.cost_factor, count));
	}

	function restartGame() {
		localStorage.removeItem('rubberband_save');
		location.reload();
	}

	// Reactive declarations for UI updates
	$: {
		tick;
		money = game.money;
		rubberbands = game.rubberbands;
		rubber = game.rubber;
		productionRate = game.productionRate;
		machines = { ...game.machines }; // Clone to trigger reactivity
		totalSold = game.totalRubberbandsSold;
		level = game.level;
		buyerHired = game.buyerHired;
		rubberPrice = game.rubberPrice;
		marketingLevel = game.marketingLevel;
		demand = game.demand;
		demand = game.demand;
		marketingCost = game.marketingCost;
		tickCount = game.tickCount;
		machineProductionLines = { ...game.machineProductionLines };
		gameOver = game.gameOver;
		// Only update price from game if we are not currently editing (handled by bind)
		// But we need to sync on load.
		// For now, let's just sync it. If it causes issues with typing we can check.
		// Actually, since game doesn't change it automatically, it's safe.
		// if (rubberbandPrice !== game.rubberbandPrice) {
		// 	rubberbandPrice = game.rubberbandPrice;
		// }
		// buyerThreshold is bound to input, so we don't overwrite it from game unless we want to sync back on load
		// But for now let's just sync it one way or ensure it's consistent
		if (buyerThreshold !== game.buyerThreshold) {
			// If game updated it (e.g. load), sync UI. But if UI updated it, we don't want to overwrite?
			// Actually, game logic doesn't change it on its own except load.
			// So we can sync it.
			// However, if we bind:value, we need to be careful.
			// Let's just update it if it's different and we are not editing?
			// Simplest is to just let the bind handle it and update game on change.
			// But for display purposes:
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
				<span class="label">Level</span>
				<span class="value">{formatNumber(level)}</span>
			</div>
			<div class="stat">
				<span class="label">Total Sold</span>
				<span class="value">{formatNumber(totalSold)}</span>
			</div>
			<div class="stat">
				<span class="label">Ticks</span>
				<span class="value">{formatNumber(tickCount)}</span>
			</div>
		</div>

		<div class="resources-bar">
			<div class="stat">
				<span class="label">Money</span>
				<span class="value">${formatNumber(money)}</span>
			</div>
			<div class="stat">
				<span class="label">Rubber</span>
				<span class="value">{formatNumber(Math.floor(rubber))}</span>
			</div>
			<div class="stat">
				<span class="label">Rubberbands</span>
				<span class="value">{formatNumber(Math.floor(rubberbands))}</span>
			</div>
			<div class="stat">
				<span class="label">Production</span>
				<span class="value">{formatNumber(productionRate)} / tick</span>
			</div>
			<div class="stat">
				<span class="label">Demand</span>
				<span class="value">{formatNumber(demand)} / tick</span>
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
					disabled={money < 100 * rubberPrice}
				>
					Buy Rubber (100 for ${formatNumber(100 * rubberPrice)})
				</button>
				<!--button class="action-btn secondary" on:click={sellRubberbands} disabled={rubberbands < 1}>
					Sell All Rubberbands
				</button>-->
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

		{#if level >= GAME_CONSTANTS.MARKETING_UNLOCK_LEVEL}
			<section class="marketing">
				<h2>Marketing</h2>
				<div class="marketing-card">
					<div class="info">
						<h3>Marketing Campaign (Lvl {marketingLevel})</h3>
						<p>Increases demand for rubberbands.</p>
						<p class="price">Cost: ${formatNumber(marketingCost)}</p>
					</div>
					<button class="buy-btn" disabled={money < marketingCost} on:click={buyMarketing}>
						Buy Campaign
					</button>
				</div>
			</section>
		{/if}

		{#if level >= GAME_CONSTANTS.BUYER_UNLOCK_LEVEL}
			<section class="management">
				<h2>Management</h2>
				{#if !buyerHired}
					<div class="hire-card">
						<div class="info">
							<h3>Auto-Buyer</h3>
							<p>Automatically buys rubber when low.</p>
							<p class="price">Cost: ${formatNumber(1000)}</p>
						</div>
						<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}>
							Hire Buyer
						</button>
					</div>
				{:else}
					<div class="worker-card">
						<div class="info">
							<h3>Auto-Buyer (Active)</h3>
							<p>Buys {formatNumber(buyerThreshold)} rubber when rubber drops below threshold.</p>
						</div>
						<div class="controls">
							<label for="threshold">Threshold:</label>
							<input
								id="threshold"
								type="number"
								bind:value={buyerThreshold}
								on:input={updateBuyerThreshold}
								min="0"
							/>
						</div>
					</div>
				{/if}
			</section>
		{/if}

		{#if level >= GAME_CONSTANTS.MACHINES_UNLOCK_LEVEL}
			<section class="shop">
				<h2>Machine Shop</h2>
				<div class="machine-list">
					{#each machine_types as machine}
						{#if level >= machine.unlock_level}
							{@const owned = machines[machine.name] || 0}
							{@const max = game.getMaxAffordable(machine.name, money, owned)}
							{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
							{@const cost = game.getMachineCost(machine.name, amount, owned)}
							{@const canAfford = money >= cost}

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
									on:click={() => buyMachine(machine.name)}
								>
									Buy {amount}
								</button>
							</div>
						{/if}
					{/each}
				</div>
			</section>
		{/if}

		{#if level >= 20}
			<section class="heavy-industry">
				<h2>Heavy Industry</h2>
				<div class="machine-list">
					{#each production_lines as line}
						{#if level >= line.unlock_level}
							{@const count = machineProductionLines[line.name] || 0}
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
									disabled={money < cost}
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
	</main>

	{#if gameOver}
		<div class="modal-overlay">
			<div class="modal">
				<h2>Game Over</h2>
				<p>Congratulations! You have reached level 100 and beaten the game.</p>
				<div class="stats-grid">
					<p>Total Rubberbands Sold: {formatNumber(totalSold)}</p>
					<p>Money: ${formatNumber(money)}</p>
					<p>Ticks: {formatNumber(tickCount)}</p>
				</div>
				<button class="restart-btn" on:click={restartGame}>Restart Game</button>
			</div>
		</div>
	{/if}
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
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		background: linear-gradient(45deg, #ff6b6b, #feca57);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.progress-bar,
	.resources-bar {
		display: flex;
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #888;
		margin-bottom: 0.25rem;
	}

	.value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #fff;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: #ccc;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.button-group {
		display: flex;
		gap: 1rem;
	}

	.action-btn {
		flex: 1;
		padding: 1.5rem;
		font-size: 1.2rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: transform 0.1s, filter 0.2s;
		font-weight: 600;
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.primary {
		background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
		color: #000;
	}

	.secondary {
		background: #333;
		color: #fff;
		border: 1px solid #444;
	}

	.secondary:hover:not(:disabled) {
		background: #444;
	}

	.secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		font-size: 1.1rem;
	}

	.details {
		color: #888;
		font-size: 0.9rem;
		margin: 0;
	}

	.owned {
		color: #4facfe;
		font-weight: bold;
		margin: 0.5rem 0 0.5rem 0;
	}

	.price {
		color: #e0e0e0;
		font-size: 0.9rem;
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

	.management {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
	}

	.hire-card,
	.worker-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.industry-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
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
		font-size: 2rem;
		color: #fff;
		margin-bottom: 1rem;
	}

	.modal p {
		color: #ccc;
		margin-bottom: 1.5rem;
		font-size: 1.1rem;
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
		font-size: 1rem;
		color: #e0e0e0;
		display: flex;
		justify-content: space-between;
	}

	.restart-btn {
		background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
		border: none;
		padding: 1rem 2rem;
		font-size: 1.2rem;
		font-weight: bold;
		color: #000;
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
</style>

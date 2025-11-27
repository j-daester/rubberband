<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Game } from './game';
	import { machine_types } from './parameters';

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

	onMount(() => {
		// Load game state if available (mock for now, would use cookies/localStorage)
		// const saved = localStorage.getItem('rubberband_save');
		// if (saved) game = new Game(saved);

		interval = setInterval(() => {
			game.tick();
			tick++; // Trigger Svelte reactivity
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

	function getCost(machine: (typeof machine_types)[0]) {
		const count = game.machines[machine.name] || 0;
		return Math.floor(machine.initial_cost * Math.pow(machine.cost_factor, count));
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
		marketingCost = game.marketingCost;
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
		<div class="stats-bar">
			<div class="stat">
				<span class="label">Level</span>
				<span class="value">{level}</span>
			</div>
			<div class="stat">
				<span class="label">Total Sold</span>
				<span class="value">{totalSold.toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="label">Money</span>
				<span class="value">${money.toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="label">Rubber</span>
				<span class="value">{Math.floor(rubber).toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="label">Rubberbands</span>
				<span class="value">{Math.floor(rubberbands).toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="label">Production</span>
				<span class="value">{productionRate.toLocaleString()} / sec</span>
			</div>
			<div class="stat">
				<span class="label">Demand</span>
				<span class="value">{demand.toLocaleString()} / tick</span>
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
					Buy Rubber (100 for ${(100 * rubberPrice).toFixed(2)})
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

		<section class="marketing">
			<h2>Marketing</h2>
			<div class="marketing-card">
				<div class="info">
					<h3>Marketing Campaign (Lvl {marketingLevel})</h3>
					<p>Increases demand for rubberbands.</p>
					<p class="price">Cost: ${marketingCost.toLocaleString()}</p>
				</div>
				<button class="buy-btn" disabled={money < marketingCost} on:click={buyMarketing}>
					Buy Campaign
				</button>
			</div>
		</section>

		{#if level >= 10}
			<section class="management">
				<h2>Management</h2>
				{#if !buyerHired}
					<div class="hire-card">
						<div class="info">
							<h3>Auto-Buyer</h3>
							<p>Automatically buys rubber when low.</p>
							<p class="price">Cost: $1,000</p>
						</div>
						<button class="buy-btn" disabled={money < 1000} on:click={hireBuyer}>
							Hire Buyer
						</button>
					</div>
				{:else}
					<div class="worker-card">
						<div class="info">
							<h3>Auto-Buyer (Active)</h3>
							<p>Buys 100 rubber for $10 when rubber drops below threshold.</p>
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

		<section class="shop">
			<h2>Machine Shop</h2>
			<div class="machine-list">
				{#each machine_types as machine}
					{@const owned = machines[machine.name] || 0}
					{@const max = game.getMaxAffordable(machine.name, money, owned)}
					{@const amount = buyAmount === -1 ? Math.max(1, max) : buyAmount}
					{@const cost = game.getMachineCost(machine.name, amount, owned)}
					{@const canAfford = money >= cost}

					<div class="machine-card">
						<div class="machine-info">
							<h3>{machine.name}</h3>
							<p class="details">Output: {machine.output}/s</p>
							<p class="owned">Owned: {owned}</p>
							<p class="price">Price: ${cost.toLocaleString()}</p>
						</div>
						<button
							class="buy-btn"
							disabled={(!canAfford && buyAmount !== -1) || (buyAmount === -1 && max === 0)}
							on:click={() => buyMachine(machine.name)}
						>
							Buy {amount}
						</button>
					</div>
				{/each}
			</div>
		</section>
	</main>
</div>

<style>
	:global(body) {
		background-color: #1a1a1a;
		color: #e0e0e0;
		font-family: 'Inter', sans-serif;
	}

	.game-container {
		max-width: 800px;
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

	.stats-bar {
		display: flex;
		justify-content: space-around;
		background: #2d2d2d;
		padding: 1rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

	.sales-card {
		background: #252525;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>

<script lang="ts">
	import { Game } from '../game';
	import { formatMoney, formatNumber } from '../utils';
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';

	export let game: Game;
	export let tick: number; // to trigger updates
	export let suffixes: string[] = [];

	const dispatch = createEventDispatcher();

	// ... (rest of script unchanged until template)
	let points: { x: number; y: number }[] = [];
	let currentPoint: { x: number; y: number } = { x: 0, y: 0 };
	let maxDemand = 100;
	let isDragging = false;
	let svgElement: SVGSVGElement;
	let hoverPoint: { x: number; y: number; price: number; demand: number } | null = null;

	// Chart dimensions
	const width = 300;
	const height = 150;
	const padding = 20;

	$: {
		tick;
		// Only regenerate curve from game state if NOT dragging to prevent jitter/conflict?
		// Actually we want the curve to reflect reality.
		// If we drag, we emit price change, parent updates game, game updates price, we re-render.
		// So it should be fine to always regenerate.
		generateCurve();
	}

	function generateCurve() {
		const currentPrice = game.rubberbandPrice;

		// Determine range for X axis (Price)
		const maxX = Math.max(2, currentPrice * 2.5);
		const steps = 50;

		const newPoints = [];
		let maxY = 0;

		for (let i = 0; i <= steps; i++) {
			const x = (i / steps) * maxX; // Price
			const y = game.calculateDemand(x); // Demand
			newPoints.push({ x, y });
			if (y > maxY) maxY = y;
		}

		points = newPoints;
		maxDemand = maxY > 0 ? maxY : 100;
		currentPoint = { x: currentPrice, y: game.calculateDemand(currentPrice) };
	}

	// Scales
	$: xScale = (x: number) =>
		(x / Math.max(2, game.rubberbandPrice * 2.5)) * (width - 2 * padding) + padding;

	$: inverseXScale = (pixelX: number) => {
		const maxX = Math.max(2, game.rubberbandPrice * 2.5);
		const relativeX = (pixelX - padding) / (width - 2 * padding);
		// relativeX = price / maxX
		return relativeX * maxX;
	};

	// Y scale inverted (0 at bottom)
	$: yScale = (y: number) => height - padding - (y / maxDemand) * (height - 2 * padding);

	// SVG path
	$: pathD =
		points.length > 0
			? `M ${xScale(points[0].x)} ${yScale(points[0].y)} ` +
			  points
					.slice(1)
					.map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`)
					.join(' ')
			: '';

	function getInteractionData(event: MouseEvent | TouchEvent) {
		if (!svgElement) return null;

		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const rect = svgElement.getBoundingClientRect();
		const scaleX = width / rect.width;
		const localX = (clientX - rect.left) * scaleX;

		const price = Math.max(0.01, inverseXScale(localX));
		const demand = game.calculateDemand(price);

		return {
			x: xScale(price),
			y: yScale(demand),
			price,
			demand
		};
	}

	function handleStart(event: MouseEvent | TouchEvent) {
		isDragging = true;
		handleDrag(event); // Update immediately on click
	}

	function handleDrag(event: MouseEvent | TouchEvent) {
		if (!isDragging) return;
		const data = getInteractionData(event);
		if (data) {
			dispatch('priceChange', { price: data.price });
		}
	}

	function handleHover(event: MouseEvent) {
		if (isDragging) {
			hoverPoint = null;
			return;
		}
		hoverPoint = getInteractionData(event);
	}

	function handleLeave() {
		hoverPoint = null;
	}

	function handleEnd() {
		isDragging = false;
	}
</script>

<svelte:window
	on:mouseup={handleEnd}
	on:touchend={handleEnd}
	on:mousemove={handleDrag}
	on:touchmove={handleDrag}
/>

<div class="demand-curve-container">
	<svg
		bind:this={svgElement}
		{width}
		{height}
		viewBox="0 0 {width} {height}"
		on:mousedown={handleStart}
		on:touchstart|preventDefault={handleStart}
		on:mousemove={handleHover}
		on:mouseleave={handleLeave}
		role="slider"
		aria-valuenow={currentPoint.x}
		aria-label={$t('common.price_setting_title')}
		tabindex="0"
		style="cursor: {isDragging ? 'grabbing' : 'pointer'}"
	>
		<!-- Axes -->
		<line
			x1={padding}
			y1={height - padding}
			x2={width - padding}
			y2={height - padding}
			stroke="#666"
		/>
		<line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" />

		<!-- Curve -->
		<path d={pathD} fill="none" stroke="#4facfe" stroke-width="2" pointer-events="none" />

		<!-- Fill under curve (optional) -->
		{#if points.length > 0}
			<path
				d={`${pathD} L ${xScale(points[points.length - 1].x)} ${height - padding} L ${xScale(
					points[0].x
				)} ${height - padding} Z`}
				fill="url(#gradient)"
				opacity="0.3"
				pointer-events="none"
			/>
		{/if}

		<defs>
			<linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#4facfe;stop-opacity:0" />
			</linearGradient>
		</defs>

		<!-- Ghost Dot (Hover) -->

		<!-- Current Status Text (Always Visible) -->
		<text
			x={width - padding}
			y={padding + 10}
			font-size="12"
			fill="#eee"
			text-anchor="end"
			pointer-events="none"
			font-weight="bold"
		>
			{$t('common.current')}: {formatMoney(currentPoint.x, suffixes)} -> {formatNumber(
				game.calculateDemand(currentPoint.x),
				suffixes
			)}/⏱️
		</text>

		<!-- Ghost Dot and Tooltip (Hover only) -->
		{#if hoverPoint}
			<circle
				cx={hoverPoint.x}
				cy={hoverPoint.y}
				r="4"
				fill="none"
				stroke="#fff"
				stroke-width="1"
				stroke-dasharray="2,2"
				opacity="0.7"
				pointer-events="none"
			/>
			<!-- Hover Tooltip Text near the ghost dot -->
			<!-- Clamping x to avoid going off screen -->
			<text
				x={Math.min(width - padding, Math.max(padding, hoverPoint.x))}
				y={Math.max(padding + 25, hoverPoint.y - 10)}
				font-size="10"
				fill="#ccc"
				text-anchor="middle"
				pointer-events="none"
			>
				{formatMoney(hoverPoint.price, suffixes)} -> {formatNumber(hoverPoint.demand, suffixes)}
			</text>
		{/if}

		<!-- Current Point -->
		<circle
			cx={xScale(currentPoint.x)}
			cy={yScale(currentPoint.y)}
			r={isDragging ? 6 : 4}
			fill="#ff6b6b"
			stroke="#fff"
			stroke-width="2"
			pointer-events="none"
		/>

		<!-- Interactive Hit Area Overlay (transparent) to catch clicks anywhere on chart -->
		<!-- Actually keying on svg mousedown works, but maybe we want a rect to be explicit? 
             SVG event listener on root is fine. -->

		<!-- Axis Labels -->
		<text
			x={width / 2}
			y={height - 2}
			font-size="10"
			fill="#888"
			text-anchor="middle"
			pointer-events="none">{$t('common.price')}</text
		>
		<text
			x={2}
			y={height / 2}
			font-size="10"
			fill="#888"
			transform="rotate(-90, 8, {height / 2})"
			text-anchor="middle"
			pointer-events="none">{$t('common.demand')}</text
		>

		<!-- Zero Tick -->
		<text
			x={padding - 2}
			y={height - padding}
			font-size="9"
			fill="#888"
			text-anchor="end"
			pointer-events="none">0</text
		>
	</svg>
</div>

<style>
	.demand-curve-container {
		width: 100%;
		flex-grow: 1;
		min-width: 150px; /* Reduced min width to fit better */
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		background: transparent; /* Transparent background */
		border-radius: 4px;
		/* max-height removed to allow full width scaling */
	}

	svg:focus {
		outline: none;
	}
</style>

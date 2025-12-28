<script>
	import Header from './Header.svelte';
	import './styles.css';
	import '$lib/i18n';
	import { isLoading, locale } from 'svelte-i18n';

	function switchLocale(/** @type {string} */ newLocale) {
		$locale = newLocale;
	}

	export let params = undefined; // Silence unknown prop warning
</script>

{#if $isLoading}
	<div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
		Loading...
	</div>
{:else}
	<div class="app">
		<Header />

		<main>
			<slot />
		</main>

		<footer>
			<div class="locale-switcher">
				<button on:click={() => switchLocale('en')} class:active={$locale?.startsWith('en')}
					>EN</button
				>
				<button on:click={() => switchLocale('de')} class:active={$locale?.startsWith('de')}
					>DE</button
				>
				<button on:click={() => switchLocale('fr')} class:active={$locale?.startsWith('fr')}
					>FR</button
				>
			</div>
			<p>&copy; 2025 Jonas Däster</p>
		</footer>
	</div>
{/if}

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 100rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		main {
			padding: 0.5rem;
		}
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}

	.locale-switcher {
		margin-bottom: 0.5rem;
	}

	.locale-switcher button {
		background: transparent;
		border: 1px solid #444;
		color: #888;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		margin: 0 0.25rem;
		border-radius: 4px;
	}

	.locale-switcher button:hover {
		background: #333;
	}

	.locale-switcher button.active {
		color: #e0e0e0;
		border-color: #888;
		font-weight: bold;
		background: #444;
	}
</style>
